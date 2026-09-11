'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function setStoreMode(mode: 'ZUCCHETTI' | 'ELMARK') {
  cookies().set('b2b_store_mode', mode, { path: '/', maxAge: 60 * 60 * 24 * 365 }); // 1 year
  revalidatePath('/', 'layout');
  redirect('/');
}
