import * as fs from 'fs';
import * as path from 'path';
import type { EtsyTokensFile, OAuthPending } from './types';

const DATA_DIR = 'data';

export function ensureDataDir(projectRoot: string): string {
  const dir = path.join(projectRoot, DATA_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function tokensPath(projectRoot: string): string {
  return path.join(ensureDataDir(projectRoot), 'etsy-tokens.json');
}

export function pendingPath(projectRoot: string): string {
  return path.join(ensureDataDir(projectRoot), 'oauth-pending.json');
}

export function readTokens(projectRoot: string): EtsyTokensFile | null {
  const p = tokensPath(projectRoot);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as EtsyTokensFile;
  } catch {
    return null;
  }
}

export function writeTokens(projectRoot: string, data: EtsyTokensFile): void {
  fs.writeFileSync(tokensPath(projectRoot), JSON.stringify(data, null, 2), 'utf8');
}

export function readPending(projectRoot: string): OAuthPending | null {
  const p = pendingPath(projectRoot);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as OAuthPending;
  } catch {
    return null;
  }
}

export function writePending(projectRoot: string, data: OAuthPending): void {
  fs.writeFileSync(pendingPath(projectRoot), JSON.stringify(data, null, 2), 'utf8');
}

export function clearPending(projectRoot: string): void {
  const p = pendingPath(projectRoot);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
