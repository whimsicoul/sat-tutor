import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getWorksheetsByTutor } from '@/lib/db';
import TutorWorksheetsClient from './client';

export interface TutorWorksheetRow {
  id: string;
  title: string;
}

export default async function TutorWorksheetsPage() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (user?.role !== 'tutor') redirect('/login');

  const raw = await getWorksheetsByTutor(user.id!);
  const worksheets = (raw as unknown as TutorWorksheetRow[]).map((w) => ({
    id: w.id,
    title: w.title,
  }));

  return <TutorWorksheetsClient worksheets={worksheets} />;
}
