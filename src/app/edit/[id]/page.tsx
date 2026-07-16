import { notFound } from 'next/navigation';
import { getPresentation, deckOf } from '@/lib/repo';
import { Editor } from '@/components/editor/Editor';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/session';
import { ensureWorkspaceForUser } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  if (!session) redirect('/auth');
  const workspace = ensureWorkspaceForUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const row = getPresentation(id, workspace.id);
  if (!row || row.deletedAt) notFound();
  return <Editor id={row.id} initialTitle={row.title} initialDeck={deckOf(row)} />;
}
