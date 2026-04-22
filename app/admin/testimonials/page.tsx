import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import AdminTestimonialsClient from './client';

export interface TestimonialRow {
  id: string;
  author_name: string;
  content: string;
  rating: number;
  created_at: string;
}

export default async function AdminTestimonialsPage() {
  await auth();
  const testimonials = await sql`SELECT * FROM testimonials ORDER BY created_at DESC`;
  return <AdminTestimonialsClient testimonials={(testimonials as unknown) as TestimonialRow[]} />;
}
