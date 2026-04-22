import { auth } from '@/lib/auth';
import HomePage from '@/components/home/HomePage';
import sql from '@/lib/db';

export default async function RootPage() {
  const [session, tutors] = await Promise.all([
    auth(),
    sql`SELECT id, name, email FROM users WHERE role = 'tutor' ORDER BY name`.catch(() => []),
  ]);

  const userRole = (session?.user as { role?: string } | undefined)?.role ?? null;

  return (
    <HomePage
      tutors={tutors as { id: string; name: string; email: string }[]}
      userRole={userRole}
    />
  );
}
