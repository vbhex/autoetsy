import axios from 'axios';
import type { EtsyTokenResponse } from './types';

const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const API_BASE = 'https://api.etsy.com/v3/application';

export function apiKeyHeader(apiKey: string, sharedSecret: string): string {
  return `${apiKey}:${sharedSecret}`;
}

export async function openapiPing(
  apiKey: string,
  sharedSecret: string
): Promise<{ application_id?: number; [k: string]: unknown }> {
  const { data, status } = await axios.get(`${API_BASE}/openapi-ping`, {
    headers: { 'x-api-key': apiKeyHeader(apiKey, sharedSecret) },
    validateStatus: () => true,
  });
  if (status >= 400) {
    throw new Error(`openapi-ping failed: ${status} ${JSON.stringify(data)}`);
  }
  return data as { application_id?: number };
}

/** POST authorization_code grant (form body per Etsy docs). */
export async function exchangeAuthorizationCode(
  clientId: string,
  redirectUri: string,
  code: string,
  codeVerifier: string
): Promise<EtsyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
  });
  const { data, status } = await axios.post<EtsyTokenResponse>(TOKEN_URL, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    validateStatus: () => true,
  });
  const errBody = data as unknown as { error?: string; error_description?: string };
  if (status >= 400 || errBody.error) {
    throw new Error(`token exchange: ${errBody.error || status} — ${errBody.error_description || JSON.stringify(data)}`);
  }
  return data;
}

export async function refreshAccessToken(clientId: string, refreshToken: string): Promise<EtsyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
  });
  const { data, status } = await axios.post<EtsyTokenResponse>(TOKEN_URL, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    validateStatus: () => true,
  });
  const errBody = data as unknown as { error?: string; error_description?: string };
  if (status >= 400 || errBody.error) {
    throw new Error(`refresh: ${errBody.error || status} — ${errBody.error_description || JSON.stringify(data)}`);
  }
  return data;
}

export interface ShopSummary {
  shop_id: number;
  shop_name?: string;
  title?: string;
  url?: string;
}

export async function getShopsForUser(
  userId: string,
  accessToken: string,
  apiKey: string,
  sharedSecret: string
): Promise<ShopSummary[]> {
  const { data, status } = await axios.get<{ results?: ShopSummary[]; count?: number }>(
    `${API_BASE}/users/${userId}/shops`,
    {
      headers: {
        'x-api-key': apiKeyHeader(apiKey, sharedSecret),
        Authorization: `Bearer ${accessToken}`,
      },
      validateStatus: () => true,
    }
  );
  if (status >= 400) {
    throw new Error(`get shops: ${status} ${JSON.stringify(data)}`);
  }
  return (data as { results?: ShopSummary[] }).results || [];
}

/** Pick shop matching slug in shop URL or name, else first shop. */
export function pickShop(shops: ShopSummary[], shopSlug: string): ShopSummary | undefined {
  if (!shops.length) return undefined;
  const slug = (shopSlug || '').toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!slug) return shops[0];
  for (const s of shops) {
    const url = (s.url || '').toLowerCase();
    const name = (s.shop_name || s.title || '').toLowerCase();
    if (url.includes(slug) || name.includes(slug)) return s;
  }
  return shops[0];
}

export function userIdFromAccessToken(accessToken: string): string {
  const i = accessToken.indexOf('.');
  if (i <= 0) throw new Error('Invalid access_token format (expected user_id.token)');
  return accessToken.slice(0, i);
}
