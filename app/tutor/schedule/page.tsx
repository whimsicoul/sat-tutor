import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { getSatDatesForTutorStudents, getWorksheetsByTutor } from '@/lib/db';
import TutorScheduleClient from './client';

export interface TutorWorksheet {
  id: string;
  title: string;
  student_id: string;
}

export interface TutorSessionRow {
  id: string;
  proposed_time: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  student_name: string;
  student_id: string;
  worksheet?: { id: string; title: string } | null;
  series_id?: string | null;
  series_end_date?: string | null;
  recurrence_rule?: string | null;
}

export interface StudentOption {
  id: string;
  name: string;
}

export default async function TutorSchedulePage() {
  const session = await auth();
  const tutorId = session!.user.id;

  const [sessions, students, satDatesRaw, tutorWorksheets] = await Promise.all([
    sql`
      SELECT s.id, s.proposed_time, s.status, s.created_at,
             u.name AS student_name, u.id AS student_id,
             s.series_id, ss.end_date AS series_end_date, ss.recurrence_rule,
             w.id AS worksheet_id, w.title AS worksheet_title
      FROM sessions s
      JOIN users u ON u.id = s.student_id
      LEFT JOIN session_series ss ON ss.id = s.series_id
      LEFT JOIN worksheets w ON w.id = s.worksheet_id
      WHERE s.tutor_id = ${tutorId}
      ORDER BY s.proposed_time DESC
    `,
    sql`
      SELECT u.id, u.name
      FROM users u
      JOIN tutor_student_assignments tsa ON tsa.student_id = u.id
      WHERE tsa.tutor_id = ${tutorId}
      ORDER BY u.name
    `,
    getSatDatesForTutorStudents(tutorId),
    getWorksheetsByTutor(tutorId),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionsWithPs: TutorSessionRow[] = (sessions as any[]).map((s) => ({
    ...s,
    proposed_time: s.proposed_time instanceof Date ? s.proposed_time.toISOString() : s.proposed_time,
    created_at: s.created_at instanceof Date ? s.created_at.toISOString() : s.created_at,
    series_end_date: s.series_end_date instanceof Date ? s.series_end_date.toISOString() : s.series_end_date,
    worksheet: s.worksheet_id ? { id: s.worksheet_id as string, title: s.worksheet_title as string } : null,
  }));

  const allWorksheets: TutorWorksheet[] = (tutorWorksheets as unknown as TutorWorksheet[]).map((w) => ({
    id: w.id,
    title: w.title,
    student_id: w.student_id,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const satDates = (satDatesRaw as any[]).map((d) => ({
    id: d.id as string,
    test_date: d.test_date instanceof Date ? d.test_date.toISOString().split('T')[0] : String(d.test_date),
    student_id: d.student_id as string,
    student_name: d.student_name as string,
  }));

  return (
    <TutorScheduleClient
      sessions={sessionsWithPs}
      students={students as unknown as StudentOption[]}
      allWorksheets={allWorksheets}
      satDates={satDates}
    />
  );
}
