import 'server-only';
import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { mkdirSync } from 'node:fs';
import { DATA_DIR, DB_PATH } from '@/lib/db/path';
import { ensureSchema } from '@/lib/db/client';
import { sendAuthEmail } from '@/lib/auth-email';

mkdirSync(DATA_DIR, { recursive: true });
const authDatabase = new Database(DB_PATH);
ensureSchema(authDatabase);

export const auth = betterAuth({
  appName: 'WAI Design',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3100',
  secret: process.env.BETTER_AUTH_SECRET,
  database: authDatabase,
  trustedOrigins: [process.env.BETTER_AUTH_URL || 'http://localhost:3100'],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 15,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 900,
    sendResetPassword: async ({ user, url }) => {
      // Do not make account existence observable through response timing.
      void sendAuthEmail({ to: user.email, url, kind: 'password-reset' })
        .catch((cause) => console.error('[auth] password reset email failed:', cause));
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    cookiePrefix: 'wai_design',
  },
  plugins: [
    magicLink({
      expiresIn: 300,
      storeToken: 'hashed',
      sendMagicLink: async ({ email, url }) => {
        await sendAuthEmail({ to: email, url, kind: 'magic-link' });
      },
    }),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
