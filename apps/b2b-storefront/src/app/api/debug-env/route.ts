import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({
    url: process.env.TYPESENSE_URL || 'missing',
    public_url: process.env.TYPESENSE_PUBLIC_URL || 'missing',
    env_keys: Object.keys(process.env).filter(k => k.includes('TYPE'))
  });
}
