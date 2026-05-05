import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllWorksheets, getUsersByRole } from '@/lib/db';
import WorksheetsClient from './client';

export interface AdminWorksheet {
  id: string;
  title: string;
  student_name: string;
  created_by_name: string;
  step_count: number;
  created_at: string;
}

export interface UserOption {
  id: string;
  name: string;
}

export default async function AdminWorksheetsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const [worksheets, students] = await Promise.all([
    getAllWorksheets(),
    getUsersByRole('student'),
  ]);

  return (
    <WorksheetsClient
      worksheets={worksheets as unknown as AdminWorksheet[]}
      students={students as unknown as UserOption[]}
    />
  );
}
