/**
 * Environment configuration.
 * Never commit real secrets. Use .env.local / Netlify environment variables.
 */

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? 'vello_session',
  NEXUSPAG_API_KEY: process.env.NEXUSPAG_API_KEY ?? '',
  NEXUSPAG_WEBHOOK_SECRET: process.env.NEXUSPAG_WEBHOOK_SECRET ?? '',
  NEXUSPAG_BASE_URL: process.env.NEXUSPAG_BASE_URL ?? 'https://nexuspag.com',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
} as const;

export function assertServerEnv() {
  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!env.JWT_SECRET) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
