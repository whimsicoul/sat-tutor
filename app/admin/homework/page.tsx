import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllHomework, getUsersByRole } from '@/lib/db';
import AdminHomeworkClient from './client';

export interface AdminHomeworkRow {
  id: string;
  title: string;
  scheduled_date: string;
  problem_pdf_url: string;
  answer_pdf_url?: string;
  student_name: string;
  assigned_by_name: string;
  created_at: string;
}

export interface UserOption {
  id: string;
  name: string;
}

export default async function AdminHomeworkPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const [homework, students] = await Promise.all([
    getAllHomework(),
    getUsersByRole('student'),
  ]);

  return (
    <AdminHomeworkClient
      homework={homework as unknown as AdminHomeworkRow[]}
      students={students as unknown as UserOption[]}
    />
  );
}
