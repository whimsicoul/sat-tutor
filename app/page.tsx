import HomePage from '@/components/home/HomePage';
import sql from '@/lib/db';

export default async function RootPage() {
  const tutors = await sql`
    SELECT id, name, email FROM users WHERE role = 'tutor' ORDER BY name
  `.catch(() => []);

  return (
    <HomePage
      tutors={tutors as { id: string; name: string; email: string }[]}
    />
  );
}
