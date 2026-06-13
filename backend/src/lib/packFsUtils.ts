import fs from 'node:fs/promises';
import path from 'node:path';

export interface PackFileEntry {
  absolutePath: string;
  relativePath: string;
}

async function walkDir(
  rootDir: string,
  currentDir: string,
  matcher: (relativePath: string) => boolean,
  results: PackFileEntry[],
): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, absolutePath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      await walkDir(rootDir, absolutePath, matcher, results);
      continue;
    }
    if (entry.isFile() && matcher(relativePath)) {
      results.push({ absolutePath, relativePath });
    }
  }
}

export async function listPackMarkdownFiles(packPath: string): Promise<PackFileEntry[]> {
  const pagesDir = path.join(packPath, 'pages');
  try {
    const stat = await fs.stat(pagesDir);
    if (!stat.isDirectory()) return [];
  } catch {
    return [];
  }
  const results: PackFileEntry[] = [];
  await walkDir(pagesDir, pagesDir, (rel) => rel.toLowerCase().endsWith('.md'), results);
  return results;
}

export async function listPackAssetFiles(packPath: string): Promise<PackFileEntry[]> {
  const assetsDir = path.join(packPath, 'assets');
  try {
    const stat = await fs.stat(assetsDir);
    if (!stat.isDirectory()) return [];
  } catch {
    return [];
  }
  const results: PackFileEntry[] = [];
  await walkDir(assetsDir, assetsDir, () => true, results);
  return results;
}

export async function packFileExists(packPath: string, filename: string): Promise<boolean> {
  try {
    await fs.access(path.join(packPath, filename));
    return true;
  } catch {
    return false;
  }
}

export async function readPackJsonFile(packPath: string, filename: string): Promise<unknown | null> {
  const filePath = path.join(packPath, filename);
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
