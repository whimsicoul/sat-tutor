import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getActResultsForTutorStudents } from '@/lib/db';
import TutorActTestClient from './client';

export interface ActResult {
  attempt_id: string;
  section: string;
  started_at: string;
  completed_at: string | null;
  total_questions: number;
  correct_count: number;
  student_id: string;
  student_name: string;
}

export default async function TutorActTestPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'tutor') redirect('/login');

  const tutorId = session!.user.id;
  const results = await getActResultsForTutorStudents(tutorId);

  return <TutorActTestClient results={results as unknown as ActResult[]} />;
}
