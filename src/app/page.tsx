import { Dashboard } from '@/components/dashboard/Dashboard';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/session';
import { ensureWorkspaceForUser } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getCurrentSession();
  if (!session) redirect('/auth');
  ensureWorkspaceForUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  return <Dashboard user={{ name: session.user.name, email: session.user.email, image: session.user.image }} />;
}
