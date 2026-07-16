// Better Auth CLI entrypoint. Keep this file free of Next.js-only imports so
// `npx auth generate` can inspect the exact production schema.
import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { DB_PATH } from '../src/lib/db/path';

export const auth = betterAuth({
  appName: 'WAI Design',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3100',
  secret: process.env.BETTER_AUTH_SECRET,
  database: new Database(DB_PATH),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 15,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  plugins: [magicLink({ sendMagicLink: async () => {} })],
});

