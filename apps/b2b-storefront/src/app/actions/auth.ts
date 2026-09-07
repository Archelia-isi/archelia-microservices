'use server';

import { prisma } from '@archelia/b2b-database';
import { createSession, deleteSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    redirect('/login?error=missing');
  }

  // Find user
  const user = await prisma.b2BUser.findUnique({
    where: { email },
  });

  if (!user) {
    redirect('/login?error=invalid');
  }

  // Extremely simple password check (TODO: Replace with bcrypt)
  if (user.passwordHash !== password) {
    redirect('/login?error=invalid');
  }

  await createSession(user.id);
  redirect('/');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
