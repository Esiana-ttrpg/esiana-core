import type { IRouter } from 'express';

export type PublicPluginRouteRegistrar = {
  pluginId: string;
  register: (router: IRouter) => void;
};

const registrars: PublicPluginRouteRegistrar[] = [];

export function clearPublicPluginRouteRegistrars(): void {
  registrars.length = 0;
}

export function registerPublicPluginRoutes(
  pluginId: string,
  register: (router: IRouter) => void,
): void {
  registrars.push({ pluginId, register });
}

export function listPublicPluginRouteRegistrars(): PublicPluginRouteRegistrar[] {
  return [...registrars];
}
