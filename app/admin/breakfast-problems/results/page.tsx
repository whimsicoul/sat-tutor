import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllBreakfastResults } from '@/lib/db';
import AdminBreakfastResultsClient from './client';

export interface BreakfastResult {
  id: string;
  student_answer: string;
  is_correct: boolean;
  submitted_at: string;
  assigned_date: string;
  question: string;
  correct_answer: string;
  category: string | null;
  student_id: string;
  student_name: string;
}

export default async function AdminBreakfastResultsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const results = await getAllBreakfastResults();

  return (
    <AdminBreakfastResultsClient
      results={results as unknown as BreakfastResult[]}
    />
  );
}
