import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllSessions, getUsersByRole, getAllSatDates, getAllHomework } from '@/lib/db';
import ScheduleClient from './client';

export interface AdminSession {
  id: string;
  proposed_time: string;
  status: 'pending' | 'approved' | 'denied';
  tutor_id: string;
  tutor_name: string;
  student_id: string;
  student_name: string;
  series_id?: string;
}

export interface UserOption {
  id: string;
  name: string;
}

export interface AttachedProblemSet {
  id: string;
  title: string;
  problem_pdf_url: string;
  answer_pdf_url?: string;
}

export interface AdminSatDate {
  id: string;
  test_date: string;
  student_id: string;
  student_name: string;
}

export interface AdminHomeworkItem {
  id: string;
  title: string;
  scheduled_date: string;
  student_id: string;
  student_name: string;
}

export default async function AdminSchedulePage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const [sessions, rawTutors, rawStudents, satDatesRaw, homeworkRaw] = await Promise.all([
    getAllSessions(),
    getUsersByRole('tutor'),
    getUsersByRole('student'),
    getAllSatDates(),
    getAllHomework(),
  ]);

  const tutors = (rawTutors as Array<{ id: string; name: string }>).map(
    (user) => ({ id: user.id, name: user.name }),
  );

  const students = (rawStudents as Array<{ id: string; name: string }>).map(
    (user) => ({ id: user.id, name: user.name }),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const satDates: AdminSatDate[] = (satDatesRaw as any[]).map((d) => ({
    id: d.id as string,
    test_date: d.test_date instanceof Date ? d.test_date.toISOString().split('T')[0] : String(d.test_date),
    student_id: d.student_id as string,
    student_name: d.student_name as string,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const homework: AdminHomeworkItem[] = (homeworkRaw as any[]).map((h) => ({
    id: h.id as string,
    title: h.title as string,
    scheduled_date: h.scheduled_date instanceof Date ? h.scheduled_date.toISOString().split('T')[0] : String(h.scheduled_date),
    student_id: h.student_id as string,
    student_name: h.student_name as string,
  }));

  return (
    <ScheduleClient
      sessions={(sessions as unknown) as AdminSession[]}
      tutors={tutors}
      students={students}
      satDates={satDates}
      homework={homework}
    />
  );
}
