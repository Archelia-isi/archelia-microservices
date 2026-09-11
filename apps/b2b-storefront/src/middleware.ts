import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  if (pathname.startsWith('/product/')) {
    const isElmarkProduct = pathname.startsWith('/product/elmark_');
    const currentMode = request.cookies.get('b2b_store_mode')?.value;
    const expectedMode = isElmarkProduct ? 'ELMARK' : 'ZUCCHETTI';

    if (currentMode !== expectedMode) {
      // The store mode cookie doesn't match the product we are trying to view.
      // This happens when the user uses the browser BACK button after switching store modes.
      // We set the correct cookie and redirect to the same URL to force a clean server render.
      const response = NextResponse.redirect(request.url);
      response.cookies.set('b2b_store_mode', expectedMode, { path: '/' });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/product/:path*'],
};
