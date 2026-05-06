import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllWorksheets } from '@/lib/db';
import WorksheetsClient from './client';

export interface AdminWorksheet {
  id: string;
  title: string;
  created_by_name: string;
  step_count: number;
  created_at: string;
}

export default async function AdminWorksheetsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const worksheets = await getAllWorksheets();

  return (
    <WorksheetsClient
      worksheets={worksheets as unknown as AdminWorksheet[]}
    />
  );
}
