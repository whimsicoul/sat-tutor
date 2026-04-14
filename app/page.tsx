import HomePage from '@/components/home/HomePage';
import sql from '@/lib/db';

export default async function RootPage() {
  const testimonials = await sql`
    SELECT * FROM testimonials ORDER BY created_at DESC
  `.catch(() => []);

  return (
    <HomePage
      testimonials={testimonials as {
        id: string;
        author_name: string;
        content: string;
        rating: number;
      }[]}
    />
  );
}
