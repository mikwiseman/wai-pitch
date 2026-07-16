import { ResetPasswordScreen } from '@/components/auth/ResetPasswordScreen';

export const dynamic = 'force-dynamic';

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return <ResetPasswordScreen token={token} invalid={Boolean(error)} />;
}

