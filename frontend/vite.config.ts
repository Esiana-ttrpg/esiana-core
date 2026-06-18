import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readVersionFromPackageJson } from '../shared/productVersion';

const sharedRoot = path.resolve(__dirname, '../shared');

/** Relative `.js` imports under `shared/` resolve to `.ts` sources (skip stale CJS emit). */
function sharedTypescriptResolve(): Plugin {
  return {
    name: 'shared-typescript-resolve',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.') || !source.endsWith('.js')) {
        return null;
      }
      const normalizedImporter = path.normalize(importer);
      if (!normalizedImporter.includes(`${path.sep}shared${path.sep}`)) {
        return null;
      }
      const tsPath = path.resolve(
        path.dirname(normalizedImporter),
        source.replace(/\.js$/, '.ts'),
      );
      return existsSync(tsPath) ? tsPath : null;
    },
  };
}

function readRootPackageVersion(): string {
  const pkgPath = path.resolve(__dirname, '../package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    name?: string;
    version?: string;
  };
  return readVersionFromPackageJson(pkg);
}

const esianaVersion = readRootPackageVersion();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

  return {
    define: {
      __ESIANA_VERSION__: JSON.stringify(esianaVersion),
    },
    plugins: [sharedTypescriptResolve(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': sharedRoot,
      },
      // Prefer .ts sources under ../shared over stale CommonJS .js emit artifacts.
      extensions: ['.ts', '.tsx', '.mts', '.mjs', '.js', '.jsx', '.json'],
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
