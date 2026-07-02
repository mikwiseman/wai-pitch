import { notFound } from 'next/navigation';
import { getPresentation, deckOf } from '@/lib/repo';
import { Player } from '@/components/player/Player';

export const dynamic = 'force-dynamic';

export default async function PresentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = getPresentation(id);
  if (!row || row.deletedAt) notFound();
  return <Player deck={deckOf(row)} title={row.title} />;
}
