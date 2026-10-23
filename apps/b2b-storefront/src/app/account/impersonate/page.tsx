import { redirect } from 'next/navigation';

export default function ImpersonatePage() {
  redirect('/account/clients');
}
