import { randomUUID } from 'node:crypto';
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import { env } from '../config/env.js';
import { normalizeCampaignMemberRole } from './acl.js';
import { canReceiveCampaignEvent, type CampaignEventSubscriber } from './campaignEventVisibility.js';
import { campaignEventEnvelope } from './campaignEventEnvelope.js';
import { registerCampaignRealtimeConnection } from './campaignEventStreams.js';
import { subscribeToDomainEvent, type DomainEvent } from './domainEvents/index.js';
import { prisma } from './prisma.js';

const PATH_PATTERN = /^\/api\/campaigns\/([^/]+)\/ws\/?$/;
const HEARTBEAT_INTERVAL_MS = 25_000;
const SESSION_TYPES = new Set(['presence.join', 'presence.update', 'cursor.move', 'editing.typing']);

type Actor = { id: string; displayName: string | null };
type Connection = {
  socket: WebSocket;
  sessionId: string;
  subscriber: CampaignEventSubscriber;
  actor: Actor;
};

type SessionMessage = {
  version: 1;
  type: string;
  resource?: { type: 'wiki_page'; id: string };
  data: Record<string, unknown>;
};

const connections = new Map<string, Set<Connection>>();

/** Attach the campaign WebSocket transport to the same server as Express. */
export function attachCampaignWebSocketServer(server: HttpServer): () => void {
  const webSockets = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  const onUpgrade = (request: IncomingMessage, socket: import('node:stream').Duplex, head: Buffer) => {
    void acceptUpgrade(webSockets, request, socket, head);
  };
  server.on('upgrade', onUpgrade);
  return () => {
    server.off('upgrade', onUpgrade);
    webSockets.close();
  };
}

async function acceptUpgrade(
  server: WebSocketServer,
  request: IncomingMessage,
  socket: import('node:stream').Duplex,
  head: Buffer,
): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const match = PATH_PATTERN.exec(url.pathname);
  if (!match) return;

  try {
    if (!originAllowed(request.headers.origin)) {
      rejectUpgrade(socket, 403, 'Forbidden');
      return;
    }
    const authenticated = await authenticate(request, decodeURIComponent(match[1]!));
    if (!authenticated) {
      rejectUpgrade(socket, 401, 'Unauthorized');
      return;
    }
    server.handleUpgrade(request, socket, head, (webSocket) => {
      startConnection(webSocket, authenticated.subscriber, authenticated.actor);
    });
  } catch {
    rejectUpgrade(socket, 500, 'Internal Server Error');
  }
}

async function authenticate(request: IncomingMessage, campaignHandle: string): Promise<{
  subscriber: CampaignEventSubscriber;
  actor: Actor;
} | null> {
  const token = readCookie(request.headers.cookie, env.cookieName);
  if (!token) return null;
  let decoded: { userId?: string; sv?: number };
  try {
    decoded = jwt.verify(token, env.jwtSecret) as typeof decoded;
  } catch {
    return null;
  }
  if (!decoded.userId) return null;

  const [user, campaign] = await Promise.all([
    prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, displayName: true, sessionVersion: true },
    }),
    prisma.campaign.findUnique({
      where: { handle: campaignHandle },
      select: { id: true, allowPlayerChronologyManagement: true },
    }),
  ]);
  if (!user || !campaign || (decoded.sv ?? 0) !== user.sessionVersion) return null;
  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId: user.id, campaignId: campaign.id } },
    select: { role: true, chronologyContributor: true },
  });
  const role = normalizeCampaignMemberRole(membership?.role);
  if (!membership || !role) return null;
  return {
    actor: { id: user.id, displayName: user.displayName },
    subscriber: {
      campaignId: campaign.id,
      userId: user.id,
      role,
      allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement,
      chronologyContributor: membership.chronologyContributor,
    },
  };
}

function startConnection(socket: WebSocket, subscriber: CampaignEventSubscriber, actor: Actor): void {
  const connection: Connection = { socket, subscriber, actor, sessionId: `ses_${randomUUID()}` };
  const bucket = connections.get(subscriber.campaignId) ?? new Set<Connection>();
  bucket.add(connection);
  connections.set(subscriber.campaignId, bucket);

  socket.send(JSON.stringify({ version: 1, type: 'session.ready', campaignId: subscriber.campaignId, sessionId: connection.sessionId }));
  const unsubscribe = subscribeToDomainEvent('*', async (event) => {
    if (socket.readyState !== WebSocket.OPEN || event.campaignId !== subscriber.campaignId) return;
    if (await canReceiveCampaignEvent(subscriber, event)) send(socket, campaignEventEnvelope(event));
  });
  const unregisterRevocation = registerCampaignRealtimeConnection(
    subscriber.campaignId,
    subscriber.userId,
    () => socket.close(4001, 'Campaign authorization changed'),
  );

  let alive = true;
  socket.on('pong', () => { alive = true; });
  socket.on('message', (raw, isBinary) => {
    if (isBinary) return closeProtocol(socket, 'Binary messages are not supported');
    void handleSessionMessage(connection, raw.toString());
  });
  const heartbeat = setInterval(async () => {
    if (!alive) return socket.terminate();
    alive = false;
    try {
      const membership = await prisma.campaignMember.findUnique({
        where: { userId_campaignId: { userId: subscriber.userId, campaignId: subscriber.campaignId } },
        select: { userId: true },
      });
      if (!membership) return socket.close(4001, 'Campaign membership revoked');
      socket.ping();
    } catch {
      socket.close(1011, 'Authorization could not be revalidated');
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  socket.once('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    unregisterRevocation();
    bucket.delete(connection);
    if (bucket.size === 0) connections.delete(subscriber.campaignId);
    void broadcastSession(connection, { version: 1, type: 'presence.leave', data: {} });
  });
}

async function handleSessionMessage(sender: Connection, raw: string): Promise<void> {
  let message: SessionMessage;
  try {
    message = JSON.parse(raw) as SessionMessage;
  } catch {
    return closeProtocol(sender.socket, 'Messages must be valid JSON');
  }
  if (!validSessionMessage(message)) return closeProtocol(sender.socket, 'Invalid session message');
  await broadcastSession(sender, message);
}

async function broadcastSession(sender: Connection, message: SessionMessage): Promise<void> {
  const recipients = connections.get(sender.subscriber.campaignId) ?? [];
  const envelope = {
    version: 1,
    type: message.type,
    campaignId: sender.subscriber.campaignId,
    sessionId: sender.sessionId,
    occurredAt: new Date().toISOString(),
    actor: sender.actor,
    ...(message.resource ? { resource: message.resource } : {}),
    data: message.data,
  };
  await Promise.all([...recipients].map(async (recipient) => {
    if (recipient.socket.readyState !== WebSocket.OPEN) return;
    if (message.resource && !(await canReceiveSessionResource(recipient.subscriber, message.resource))) return;
    send(recipient.socket, envelope);
  }));
}

function canReceiveSessionResource(subscriber: CampaignEventSubscriber, resource: SessionMessage['resource']): Promise<boolean> {
  const event: DomainEvent = {
    id: 'session_visibility_check', version: 1, type: 'session.resource',
    campaignId: subscriber.campaignId, resourceType: resource!.type, resourceId: resource!.id,
    occurredAt: new Date().toISOString(), payload: {}, source: 'core',
  };
  return canReceiveCampaignEvent(subscriber, event);
}

export function validSessionMessage(value: unknown): value is SessionMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<SessionMessage>;
  if (message.version !== 1 || typeof message.type !== 'string' || !SESSION_TYPES.has(message.type)) return false;
  if (!message.data || typeof message.data !== 'object' || Array.isArray(message.data)) return false;
  const needsResource = message.type === 'cursor.move' || message.type === 'editing.typing';
  if (needsResource && (!message.resource || message.resource.type !== 'wiki_page' || typeof message.resource.id !== 'string' || !message.resource.id)) return false;
  if (!needsResource && message.resource) return false;
  if (message.type === 'editing.typing' && typeof message.data.active !== 'boolean') return false;
  if (message.type === 'cursor.move' && (!Number.isFinite(message.data.x) || !Number.isFinite(message.data.y))) return false;
  if (message.type.startsWith('presence.') && message.data.status != null && (typeof message.data.status !== 'string' || message.data.status.length > 80)) return false;
  return true;
}

function originAllowed(origin: string | undefined): boolean {
  return !!origin && origin === env.corsOrigin;
}

function readCookie(header: string | undefined, name: string): string | null {
  for (const part of header?.split(';') ?? []) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return null; }
  }
  return null;
}

function send(socket: WebSocket, value: unknown): void {
  socket.send(JSON.stringify(value));
}

function closeProtocol(socket: WebSocket, reason: string): void {
  socket.close(1008, reason);
}

function rejectUpgrade(socket: import('node:stream').Duplex, status: number, reason: string): void {
  if (socket.destroyed) return;
  socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
}
