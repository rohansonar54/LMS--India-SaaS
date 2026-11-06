import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('lms_session');

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
