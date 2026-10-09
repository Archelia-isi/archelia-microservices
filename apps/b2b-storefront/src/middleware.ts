import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Determine store mode from hostname
  const isElmark = hostname.includes('elmark.izzodistribuzione.it');
  const storeMode = isElmark ? 'ELMARK' : 'ZUCCHETTI';
  
  // Overwrite the request cookie so all Server Components and Actions see the correct mode
  request.cookies.set('b2b_store_mode', storeMode);
  request.headers.set('cookie', request.cookies.toString());

  // Forward the modified request
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    }
  });

  const cookieOpts: any = { 
    path: '/', 
    sameSite: 'lax', 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365 
  };
  if (process.env.NODE_ENV === 'production') cookieOpts.domain = '.izzodistribuzione.it';

  // Also set the cookie on the browser for client components
  response.cookies.set('b2b_store_mode', storeMode, cookieOpts);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
