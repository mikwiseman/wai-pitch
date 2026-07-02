import { notFound } from 'next/navigation';
import { getPresentation, deckOf } from '@/lib/repo';
import { Editor } from '@/components/editor/Editor';

export const dynamic = 'force-dynamic';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = getPresentation(id);
  if (!row || row.deletedAt) notFound();
  return <Editor id={row.id} initialTitle={row.title} initialDeck={deckOf(row)} />;
}
