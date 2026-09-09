'use server';

import { prisma } from '@archelia/b2b-database';
import { createSession, deleteSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

export async function login(formData: FormData) {
  const identifier = formData.get('identifier') as string;
  const password = formData.get('password') as string;

  if (!identifier || !password) {
    redirect('/login?error=missing');
  }

  // Find user by email or username
  const user = await prisma.b2BUser.findFirst({
    where: { 
      OR: [
        { email: identifier },
        { username: identifier }
      ]
    },
  });

  if (!user || !user.isActive) {
    redirect('/login?error=invalid');
  }

  let isValidPassword = false;

  // 1. Check Se la password provvisoria coincide
  if (user.tempPassword && user.tempPassword === password) {
    isValidPassword = true;
  } else {
    // 2. Controllo normale su password cryptata
    isValidPassword = await bcrypt.compare(password, user.passwordHash);
  }

  if (!isValidPassword) {
    redirect('/login?error=invalid');
  }

  // Creazione sessione
  await createSession(user.id);
  
  // Se ha usato la password provvisoria o mustChangePassword è true, forziamo il reset
  if (user.mustChangePassword || user.tempPassword === password) {
    redirect('/setup-password');
  }

  redirect('/catalog');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}

export async function setupPassword(formData: FormData) {
  const session = await import('@/lib/session').then(m => m.verifySession());
  if (!session?.userId) {
    redirect('/login');
  }

  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || password !== confirmPassword || password.length < 8) {
    redirect('/setup-password?error=invalid');
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.b2BUser.update({
    where: { id: session.userId },
    data: {
      passwordHash: hash,
      tempPassword: null,
      mustChangePassword: false,
    }
  });

  redirect('/catalog');
}
