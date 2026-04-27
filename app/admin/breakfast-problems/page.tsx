import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllBreakfastProblemsWithFlagCounts } from '@/lib/db';
import AdminBreakfastProblemsClient from './client';

export interface BreakfastProblem {
  id: string;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  category: string | null;
  skill: string | null;
  difficulty: string | null;
  external_id: string | null;
  created_at: string;
  flag_count: number;
  latest_flag_reason: string | null;
}

export default async function AdminBreakfastProblemsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const problems = await getAllBreakfastProblemsWithFlagCounts();

  return (
    <AdminBreakfastProblemsClient
      problems={problems as unknown as BreakfastProblem[]}
    />
  );
}
