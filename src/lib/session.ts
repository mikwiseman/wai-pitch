import 'server-only';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { ensureWorkspaceForUser } from '@/lib/repo';

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('authentication required');
    this.name = 'AuthenticationRequiredError';
  }
}

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new AuthenticationRequiredError();
  return session;
}

export async function requireWorkspace() {
  const session = await requireSession();
  const workspace = ensureWorkspaceForUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  return { session, workspace };
}

