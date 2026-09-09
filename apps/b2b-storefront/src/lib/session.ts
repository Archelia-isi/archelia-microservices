import { cookies } from 'next/headers';
import { prisma } from '@archelia/b2b-database';

const SESSION_COOKIE_NAME = 'archelia_b2b_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  // Create a session in the database
  const session = await prisma.b2BSession.create({
    data: {
      userId,
      token: crypto.randomUUID(),
      expiresAt,
    },
  });

  // Set the cookie
  cookies().set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.b2BSession.deleteMany({
      where: { token },
    });
  }
  cookies().delete(SESSION_COOKIE_NAME);
}

export async function verifySession() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.b2BSession.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  return session;
}

import { redirect } from 'next/navigation';

export async function requireAuth() {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }
  
  if (session.user.mustChangePassword) {
    redirect('/setup-password');
  }
  
  return session;
}
