import { notFound } from 'next/navigation';
import { getPresentationByShare, deckOf } from '@/lib/repo';
import { Player } from '@/components/player/Player';

export const dynamic = 'force-dynamic';

// Public read-only share view. The link IS the product.
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = getPresentationByShare(token);
  if (!row || !row.published || row.deletedAt) notFound();
  return <Player deck={deckOf(row)} title={row.title} />;
}
