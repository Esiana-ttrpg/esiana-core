import { json, type RequestHandler } from 'express';

const standardJson = json();

/** Large transcript bodies are parsed by their route after authentication and rate limits. */
export const defaultJsonBody: RequestHandler = (req, res, next) => {
  if (req.method === 'POST' && /^\/api\/campaigns\/[^/]+\/audio\/recordings\/[^/]+\/transcript\/revisions\/?$/i.test(req.path)) {
    next();
  } else standardJson(req, res, next);
};
