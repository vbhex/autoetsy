import * as crypto from 'crypto';

/** URL-safe base64 without padding (RFC 7636). */
function base64Url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const codeChallenge = base64Url(crypto.createHash('sha256').update(codeVerifier, 'utf8').digest());
  return { codeVerifier, codeChallenge };
}

export function randomState(): string {
  return base64Url(crypto.randomBytes(16));
}
