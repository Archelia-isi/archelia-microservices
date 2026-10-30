import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';

const SESSION_COOKIE_NAME = 'archelia_b2b_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function createSession(userId: string, isPromoProspect: boolean = false) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await prisma.b2BSession.create({
    data: {
      userId: isPromoProspect ? null : userId,
      promoProspectId: isPromoProspect ? userId : null,
      token: crypto.randomUUID(),
      expiresAt,
    },
  });

  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.domain = '.izzodistribuzione.it';
  }

  cookies().set(SESSION_COOKIE_NAME, session.token, cookieOptions);
}

export async function deleteSession() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.b2BSession.deleteMany({
      where: { token },
    });
  }
  const cookieOptions: any = { path: '/' };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.domain = '.izzodistribuzione.it';
  }
  cookies().delete({ name: SESSION_COOKIE_NAME, ...cookieOptions });
}

const findSessionByTokenCached = cache(async (token: string) => {
  const raw = await prisma.b2BSession.findUnique({
    where: { token },
    include: {
      user: true,
      promoProspect: true,
    },
  });

  if (!raw) return null;

  // Case 1: Standard active B2B user
  if (raw.user) {
    return {
      ...raw,
      userId: raw.user.id,
      isPromoProspect: false,
      user: {
        ...raw.user,
        isPromoProspect: false,
        promoProspectId: null as string | null,
      },
    };
  }

  // Case 2: Promo prospect session (or recently converted promo prospect)
  if (raw.promoProspect) {
    const pp = raw.promoProspect;
    if (pp.convertedToUserId) {
      const convertedUser = await prisma.b2BUser.findUnique({
        where: { id: pp.convertedToUserId },
      });
      if (convertedUser) {
        return {
          ...raw,
          userId: convertedUser.id,
          isPromoProspect: false,
          user: {
            ...convertedUser,
            isPromoProspect: false,
            promoProspectId: pp.id,
          },
        };
      }
    }

    return {
      ...raw,
      userId: pp.id,
      isPromoProspect: true,
      user: {
        id: pp.id,
        username: pp.username,
        email: pp.email,
        passwordHash: pp.passwordHash,
        tempPassword: pp.tempPassword,
        mustChangePassword: pp.mustChangePassword,
        firstName: pp.firstName,
        lastName: pp.lastName,
        companyName: pp.companyName,
        vatNumber: pp.vatNumber,
        fiscalCode: pp.fiscalCode,
        formaGiuridica: pp.formaGiuridica,
        pecEmail: pp.pecEmail,
        codiceDestinatario: pp.codiceDestinatario,
        zucchettiCode: pp.username.toUpperCase(),
        sdrProspectId: pp.sdrProspectId,
        role: 'USER' as const,
        agentId: pp.agentId,
        zucchettiPriceList: null,
        customerType: pp.commercialCategory, // 'IST' o 'RIV'
        fido: 0,
        discount: pp.discount,
        address: pp.address,
        streetNumber: pp.streetNumber,
        city: pp.city,
        zip: pp.zip,
        province: pp.province,
        phone: pp.phone || pp.whatsappPhone,
        isElmarkCustomer: false,
        elmarkDiscounts: {},
        isActive: pp.isActive,
        createdAt: pp.createdAt,
        updatedAt: pp.updatedAt,
        isPromoProspect: true,
        promoProspectId: pp.id,
        promoStatus: pp.status,
        sesso: pp.sesso,
        orderDetailsSnapshot: pp.orderDetailsSnapshot,
      },
    };
  }

  return null;
});

export async function verifySession() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await findSessionByTokenCached(token);

  if (!session || session.expiresAt < new Date() || !session.user || !session.user.isActive) {
    return null;
  }

  return session;
}

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
