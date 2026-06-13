export class PluginApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'PluginApiError';
    this.status = status;
    this.code = code;
  }
}

export interface PluginApiClientOptions {
  pluginId: string;
  campaignHandle?: string;
}

export interface PluginApiRequestOptions {
  headers?: Record<string, string>;
}

function buildUrl(pluginId: string, path: string, campaignHandle?: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = `/api/plugin-runtime/${encodeURIComponent(pluginId)}${normalizedPath}`;
  if (!campaignHandle) return base;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}campaignHandle=${encodeURIComponent(campaignHandle)}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('json')
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'error' in body
        ? String((body as { error: unknown }).error)
        : typeof body === 'string'
          ? body
          : response.statusText;
    const code =
      typeof body === 'object' && body && 'code' in body
        ? String((body as { code: unknown }).code)
        : undefined;
    throw new PluginApiError(message || 'Plugin API request failed', response.status, code);
  }
  return body;
}

export function createPluginApiClient(options: PluginApiClientOptions) {
  const { pluginId, campaignHandle } = options;

  async function request(
    method: string,
    path: string,
    body?: unknown,
    requestOptions: PluginApiRequestOptions = {},
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      ...requestOptions.headers,
    };
    if (campaignHandle) {
      headers['X-Campaign-Handle'] = campaignHandle;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(buildUrl(pluginId, path, campaignHandle), {
      method,
      credentials: 'include',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return parseResponse(response);
  }

  return {
    get(path: string, requestOptions?: PluginApiRequestOptions) {
      return request('GET', path, undefined, requestOptions);
    },
    post(path: string, body?: unknown, requestOptions?: PluginApiRequestOptions) {
      return request('POST', path, body, requestOptions);
    },
    put(path: string, body?: unknown, requestOptions?: PluginApiRequestOptions) {
      return request('PUT', path, body, requestOptions);
    },
    delete(path: string, requestOptions?: PluginApiRequestOptions) {
      return request('DELETE', path, undefined, requestOptions);
    },
    async upload(path: string, formData: FormData, requestOptions?: PluginApiRequestOptions) {
      const headers: Record<string, string> = {
        ...requestOptions?.headers,
      };
      if (campaignHandle) {
        headers['X-Campaign-Handle'] = campaignHandle;
      }
      const response = await fetch(buildUrl(pluginId, path, campaignHandle), {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });
      return parseResponse(response);
    },
  };
}

export type PluginApiClient = ReturnType<typeof createPluginApiClient>;
