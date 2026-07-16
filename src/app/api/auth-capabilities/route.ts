import { NextResponse } from 'next/server';
import { emailDeliveryConfigured } from '@/lib/auth-email';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    magicLink: emailDeliveryConfigured(),
    passwordReset: emailDeliveryConfigured(),
    password: true,
    passwordMinLength: 15,
  });
}

