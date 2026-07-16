import 'server-only';
import { NextResponse } from 'next/server';
import { AuthenticationRequiredError, requireWorkspace } from '@/lib/session';

export async function getApiWorkspace() {
  try {
    return await requireWorkspace();
  } catch (cause) {
    if (cause instanceof AuthenticationRequiredError) {
      return { response: NextResponse.json({ error: 'authentication required' }, { status: 401 }) };
    }
    throw cause;
  }
}

