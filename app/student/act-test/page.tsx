import { auth } from '@/lib/auth';
import { getActResultsForStudent } from '@/lib/db';
import StudentActTestClient from './client';

export default async function StudentActTestPage() {
  const session = await auth();
  const userId = session!.user.id;

  const pastResults = await getActResultsForStudent(userId);

  return <StudentActTestClient pastResults={pastResults as unknown as PastResult[]} />;
}

export interface PastResult {
  attempt_id: string;
  section: string;
  started_at: string;
  completed_at: string;
  total_questions: number;
  correct_count: number;
}
