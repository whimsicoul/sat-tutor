import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import TestimonialsClient from './client';

export default async function TutorTestimonialsPage() {
  await auth(); // layout already guards
  const testimonials = await sql`SELECT * FROM testimonials ORDER BY created_at DESC`;
  return <TestimonialsClient testimonials={testimonials as TestimonialRow[]} />;
}

export interface TestimonialRow {
  id: string;
  author_name: string;
  content: string;
  rating: number;
  created_at: string;
}
