'use server';

import { prisma } from '@archelia/b2b-database';
import { createSession, deleteSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { syncSavedOrdersStockForUser } from './savedOrderStock';

export async function login(formData: FormData) {
  const rawIdentifier = formData.get('identifier') as string;
  const password = formData.get('password') as string;

  const identifier = (rawIdentifier || '').trim();
  if (!identifier || !password) {
    redirect('/login?error=missing');
  }

  // 1. Cerca prima tra i Clienti Attivi (b2b_users)
  const user = await prisma.b2BUser.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: 'insensitive' } },
        { username: { equals: identifier, mode: 'insensitive' } },
      ],
    },
  });

  if (user) {
    if (!user.isActive) {
      redirect('/login?error=invalid');
    }

    let isValidPassword = false;
    if (user.tempPassword && user.tempPassword === password) {
      isValidPassword = true;
    } else {
      isValidPassword = await bcrypt.compare(password, user.passwordHash);
    }

    if (!isValidPassword) {
      redirect('/login?error=invalid');
    }

    await createSession(user.id, false);

    try {
      await syncSavedOrdersStockForUser(user.id);
    } catch (e) {
      console.error('Error syncing saved orders stock on login:', e);
    }

    const cookieOpts: any = {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    };
    if (process.env.NODE_ENV === 'production') cookieOpts.domain = '.izzodistribuzione.it';

    cookies().set('b2b_store_mode', 'ZUCCHETTI', cookieOpts);

    if (user.mustChangePassword || user.tempPassword === password) {
      redirect(
        process.env.NODE_ENV === 'production'
          ? 'https://www.izzodistribuzione.it/setup-password'
          : '/setup-password'
      );
    }

    redirect(
      process.env.NODE_ENV === 'production' ? 'https://www.izzodistribuzione.it' : '/'
    );
  }

  // 2. Se non è in b2b_users, cerca nella tabella dedicata dei Clienti in Attivazione (b2b_promo_prospects)
  const promoProspect = await prisma.b2BPromoProspect.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: 'insensitive' } },
        { username: { equals: identifier, mode: 'insensitive' } },
      ],
    },
  });

  if (!promoProspect || !promoProspect.isActive || promoProspect.status === 'EXPIRED') {
    redirect('/login?error=invalid');
  }

  let isValidPromoPassword = false;
  if (promoProspect.tempPassword && promoProspect.tempPassword === password) {
    isValidPromoPassword = true;
  } else {
    isValidPromoPassword = await bcrypt.compare(password, promoProspect.passwordHash);
  }

  if (!isValidPromoPassword) {
    redirect('/login?error=invalid');
  }

  // Se il prospect era già stato convertito in b2b_users, accedi direttamente con l'utente attivo
  if (promoProspect.convertedToUserId) {
    await createSession(promoProspect.convertedToUserId, false);
    redirect(
      process.env.NODE_ENV === 'production' ? 'https://www.izzodistribuzione.it' : '/'
    );
  }

  // PRIMA DEL REDIRECT: Registra subito il 1° accesso (così Daniele Savoia lo vede in "1° Accesso Effettuato")
  const now = new Date();
  await prisma.b2BPromoProspect.update({
    where: { id: promoProspect.id },
    data: {
      firstLoginAt: promoProspect.firstLoginAt ?? now,
      lastLoginAt: now,
      loginCount: { increment: 1 },
      status: promoProspect.status === 'CONTACTED' ? 'LOGGED_IN' : promoProspect.status,
    },
  });

  await createSession(promoProspect.id, true);

  const cookieOpts: any = {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };
  if (process.env.NODE_ENV === 'production') cookieOpts.domain = '.izzodistribuzione.it';
  cookies().set('b2b_store_mode', 'ZUCCHETTI', cookieOpts);

  // Obbligo normativo GDPR: l'utente imposta la sua password personale su /setup-password
  if (promoProspect.mustChangePassword || promoProspect.tempPassword === password) {
    redirect(
      process.env.NODE_ENV === 'production'
        ? 'https://www.izzodistribuzione.it/setup-password'
        : '/setup-password'
    );
  }

  redirect(
    process.env.NODE_ENV === 'production' ? 'https://www.izzodistribuzione.it' : '/'
  );
}

export async function logout() {
  await deleteSession();
  const cookieOpts: any = {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };
  if (process.env.NODE_ENV === 'production') cookieOpts.domain = '.izzodistribuzione.it';

  cookies().set('b2b_store_mode', 'ZUCCHETTI', cookieOpts);

  const deleteOpts: any = { path: '/', maxAge: 0 };
  if (process.env.NODE_ENV === 'production') deleteOpts.domain = '.izzodistribuzione.it';
  cookies().delete({ name: 'reviewingOrderId', ...deleteOpts });
  cookies().delete({ name: 'impersonatedClientCode', ...deleteOpts });
  cookies().delete({ name: 'impersonatedClientName', ...deleteOpts });
  cookies().delete({ name: 'impersonatedClientDiscount', ...deleteOpts });

  redirect(
    process.env.NODE_ENV === 'production'
      ? 'https://www.izzodistribuzione.it/login'
      : '/login'
  );
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

  if ((session as any).isPromoProspect || (session.user as any)?.isPromoProspect) {
    await prisma.b2BPromoProspect.update({
      where: { id: session.user.id },
      data: {
        passwordHash: hash,
        tempPassword: null,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });
  } else {
    await prisma.b2BUser.update({
      where: { id: session.userId },
      data: {
        passwordHash: hash,
        tempPassword: null,
        mustChangePassword: false,
      },
    });

    try {
      await syncSavedOrdersStockForUser(session.userId);
    } catch (e) {}
  }

  redirect(
    process.env.NODE_ENV === 'production' ? 'https://www.izzodistribuzione.it' : '/'
  );
}
