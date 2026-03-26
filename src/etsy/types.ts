/**
 * Etsy Open API v3 — shared types.
 */

export interface EtsyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface EtsyTokensFile {
  access_token: string;
  refresh_token: string;
  /** epoch ms when access_token is expected to expire */
  expires_at_ms: number;
  user_id: string;
  shop_id: string;
  shop_name?: string;
  updated_at: string;
}

export interface OAuthPending {
  state: string;
  code_verifier: string;
  redirect_uri: string;
  created_at: string;
}
