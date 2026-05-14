import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllWorksheets, getStudentsForTutor } from '@/lib/db';
import TutorWorksheetsClient from './client';

export interface TutorWorksheetRow {
  id: string;
  title: string;
  created_by_name: string;
  step_count: number;
  created_at: string;
}

export interface TutorStudentRow {
  id: string;
  name: string;
}

export default async function TutorWorksheetsPage() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (user?.role !== 'tutor') redirect('/login');

  const [rawWorksheets, rawStudents] = await Promise.all([
    getAllWorksheets(),
    getStudentsForTutor(user.id!),
  ]);

  const worksheets = (rawWorksheets as unknown as TutorWorksheetRow[]).map((w) => ({
    id: w.id,
    title: w.title,
    created_by_name: w.created_by_name,
    step_count: Number(w.step_count),
    created_at: w.created_at,
  }));

  const students = (rawStudents as unknown as TutorStudentRow[]).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return <TutorWorksheetsClient worksheets={worksheets} students={students} />;
}
