import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllProblemSets, getUsersByRole } from '@/lib/db';
import ProblemSetsClient from './client';

export interface AdminProblemSet {
  id: string;
  title: string;
  problem_pdf_url: string;
  answer_pdf_url?: string;
  tutor_name: string;
  student_name: string;
  created_at: string;
}

export interface UserOption {
  id: string;
  name: string;
}

export default async function AdminProblemSetsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const [problemSets, tutors, students] = await Promise.all([
    getAllProblemSets(),
    getUsersByRole('tutor'),
    getUsersByRole('student'),
  ]);

  return (
    <ProblemSetsClient
      problemSets={problemSets as AdminProblemSet[]}
      tutors={tutors as UserOption[]}
      students={students as UserOption[]}
    />
  );
}
