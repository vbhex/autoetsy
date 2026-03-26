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

/** https://developers.etsy.com/documentation/reference#operation/getMe */
export interface MeResponse {
  user_id?: number;
  shop_id?: number;
  shop_name?: string;
}

function pickNumericId(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10);
  }
  return undefined;
}

export async function getMe(
  accessToken: string,
  apiKey: string,
  sharedSecret: string
): Promise<MeResponse> {
  const { data, status } = await axios.get<Record<string, unknown>>(`${API_BASE}/users/me`, {
    headers: {
      'x-api-key': apiKeyHeader(apiKey, sharedSecret),
      Authorization: `Bearer ${accessToken}`,
    },
    validateStatus: () => true,
  });
  if (status >= 400) {
    throw new Error(`getMe failed: ${status} ${JSON.stringify(data)}`);
  }
  const user_id = pickNumericId(data, 'user_id', 'userId');
  const shop_id = pickNumericId(data, 'shop_id', 'shopId');
  const shop_name = (data.shop_name || data.shopName) as string | undefined;
  return { user_id, shop_id, shop_name };
}

/** https://developers.etsy.com/documentation/reference#operation/getShop */
export async function getShop(
  shopId: string | number,
  accessToken: string,
  apiKey: string,
  sharedSecret: string
): Promise<{ shop_id?: number; shop_name?: string; title?: string }> {
  const { data, status } = await axios.get<Record<string, unknown>>(`${API_BASE}/shops/${shopId}`, {
    headers: {
      'x-api-key': apiKeyHeader(apiKey, sharedSecret),
      Authorization: `Bearer ${accessToken}`,
    },
    validateStatus: () => true,
  });
  if (status >= 400) {
    throw new Error(`getShop failed: ${status} ${JSON.stringify(data)}`);
  }
  const shop_id = pickNumericId(data, 'shop_id', 'shopId');
  const shop_name = [data.shop_name, data.shopName, data.title, data.name]
    .find((v) => typeof v === 'string' && v.length > 0) as string | undefined;
  const title = (data.title as string | undefined) || undefined;
  return { shop_id, shop_name, title };
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

// ── Listing APIs (Open API v3) ───────────────────────────────────────────

export function v3AuthHeaders(accessToken: string, apiKey: string, sharedSecret: string): Record<string, string> {
  return {
    'x-api-key': apiKeyHeader(apiKey, sharedSecret),
    Authorization: `Bearer ${accessToken}`,
  };
}

function firstNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10);
  }
  return undefined;
}

/** https://developers.etsy.com/documentation/reference — list shop shipping profiles */
export async function getShopShippingProfiles(
  shopId: string | number,
  accessToken: string,
  apiKey: string,
  sharedSecret: string
): Promise<Array<Record<string, unknown>>> {
  const { data, status } = await axios.get<Record<string, unknown>>(`${API_BASE}/shops/${shopId}/shipping-profiles`, {
    headers: v3AuthHeaders(accessToken, apiKey, sharedSecret),
    validateStatus: () => true,
  });
  if (status >= 400) {
    throw new Error(`getShopShippingProfiles failed: ${status} ${JSON.stringify(data)}`);
  }
  const results = (data as { results?: unknown[] }).results;
  return Array.isArray(results) ? (results as Array<Record<string, unknown>>) : [];
}

/** https://developers.etsy.com/documentation/reference — shop processing profiles */
export async function getShopReadinessStateDefinitions(
  shopId: string | number,
  accessToken: string,
  apiKey: string,
  sharedSecret: string
): Promise<Array<Record<string, unknown>>> {
  const { data, status } = await axios.get<Record<string, unknown>>(
    `${API_BASE}/shops/${shopId}/readiness-state-definitions`,
    {
      headers: v3AuthHeaders(accessToken, apiKey, sharedSecret),
      validateStatus: () => true,
    }
  );
  if (status >= 400) {
    throw new Error(`getShopReadinessStateDefinitions failed: ${status} ${JSON.stringify(data)}`);
  }
  const results = (data as { results?: unknown[] }).results;
  return Array.isArray(results) ? (results as Array<Record<string, unknown>>) : [];
}

export interface CreateDraftListingResult {
  listing_id: number;
  raw: Record<string, unknown>;
}

/** POST createDraftListing — price in smallest currency unit (e.g. USD cents). Pass URLSearchParams to repeat keys (e.g. tags). */
export async function createDraftListing(
  shopId: string | number,
  formFields: URLSearchParams | Record<string, string | number | boolean | undefined>,
  accessToken: string,
  apiKey: string,
  sharedSecret: string
): Promise<CreateDraftListingResult> {
  const body =
    formFields instanceof URLSearchParams
      ? formFields
      : (() => {
          const p = new URLSearchParams();
          for (const [k, v] of Object.entries(formFields)) {
            if (v === undefined || v === null) continue;
            p.append(k, String(v));
          }
          return p;
        })();
  const { data, status } = await axios.post<Record<string, unknown>>(`${API_BASE}/shops/${shopId}/listings`, body.toString(), {
    headers: {
      ...v3AuthHeaders(accessToken, apiKey, sharedSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    validateStatus: () => true,
  });
  if (status >= 400) {
    throw new Error(`createDraftListing failed: ${status} ${JSON.stringify(data)}`);
  }
  const listingObj = (data as { listing?: Record<string, unknown> }).listing;
  const listing_id =
    firstNumber(data, ['listing_id', 'listingId']) ??
    (listingObj ? firstNumber(listingObj, ['listing_id', 'listingId']) : undefined) ??
    (data.listing_id !== undefined ? Number(data.listing_id) : undefined);
  if (listing_id == null || Number.isNaN(listing_id)) {
    throw new Error(`createDraftListing: no listing_id in response ${JSON.stringify(data)}`);
  }
  return { listing_id, raw: data };
}

/**
 * Upload a listing image (multipart). Uses fetch so Node can set multipart boundary.
 * https://developers.etsy.com/documentation/reference#operation/uploadListingImage
 */
export async function uploadListingImage(
  shopId: string | number,
  listingId: string | number,
  imageBytes: Buffer,
  filename: string,
  accessToken: string,
  apiKey: string,
  sharedSecret: string
): Promise<void> {
  const blob = new Blob([new Uint8Array(imageBytes)]);
  const fd = new FormData();
  fd.append('image', blob, filename || 'image.jpg');
  const res = await fetch(`${API_BASE}/shops/${shopId}/listings/${listingId}/images`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKeyHeader(apiKey, sharedSecret),
      Authorization: `Bearer ${accessToken}`,
    },
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`uploadListingImage failed: ${res.status} ${text}`);
  }
}
