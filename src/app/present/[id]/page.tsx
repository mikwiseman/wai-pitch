import { notFound } from 'next/navigation';
import { getPresentation, deckOf } from '@/lib/repo';
import { Player } from '@/components/player/Player';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/session';
import { ensureWorkspaceForUser } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export default async function PresentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  if (!session) redirect('/auth');
  const workspace = ensureWorkspaceForUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const row = getPresentation(id, workspace.id);
  if (!row || row.deletedAt) notFound();
  return <Player deck={deckOf(row)} title={row.title} />;
}
