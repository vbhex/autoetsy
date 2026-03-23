import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface Config {
  etsy: {
    username: string;
    password: string;
    apiKey: string;
    sharedSecret: string;
    shopId: string;
    sellerLoginUrl: string;
  };
  pricing: {
    markup: number;
    minPriceUsd: number;
    maxPriceUsd: number;
  };
  mysql: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  paths: {
    logs: string;
    data: string;
  };
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || defaultValue || '';
}

function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable: ${name}`);
  }
  return parsed;
}

export function loadConfig(): Config {
  const projectRoot = path.resolve(__dirname, '..');

  return {
    etsy: {
      username: getEnvVar('ETSY_USERNAME', ''),
      password: getEnvVar('ETSY_PASSWORD', ''),
      apiKey: getEnvVar('ETSY_API_KEY', ''),
      sharedSecret: getEnvVar('ETSY_SHARED_SECRET', ''),
      shopId: getEnvVar('ETSY_SHOP_ID', ''),
      sellerLoginUrl: getEnvVar('ETSY_SELLER_LOGIN_URL', 'https://www.etsy.com/signin'),
    },
    pricing: {
      markup: getEnvNumber('PRICE_MARKUP', 2.5),
      minPriceUsd: getEnvNumber('MIN_PRICE_USD', 8),
      maxPriceUsd: getEnvNumber('MAX_PRICE_USD', 200),
    },
    mysql: {
      host: getEnvVar('MYSQL_HOST', 'localhost'),
      port: getEnvNumber('MYSQL_PORT', 3306),
      user: getEnvVar('MYSQL_USER', 'root'),
      password: getEnvVar('MYSQL_PASSWORD', ''),
      database: getEnvVar('MYSQL_DATABASE', 'etsy_autostore'),
    },
    paths: {
      logs: path.join(projectRoot, 'logs'),
      data: path.join(projectRoot, 'data'),
    },
  };
}

export const config = loadConfig();
