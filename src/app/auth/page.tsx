import { redirect } from 'next/navigation';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { getCurrentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AuthPage() {
  const session = await getCurrentSession();
  if (session) redirect('/');
  return <AuthScreen />;
}

