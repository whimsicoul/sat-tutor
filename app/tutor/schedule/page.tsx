import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { getSatDatesForTutorStudents, getHomeworkForTutorStudents } from '@/lib/db';
import TutorScheduleClient from './client';

export interface TutorProblemSet {
  id: string;
  title: string;
  problem_pdf_url: string;
  answer_pdf_url?: string;
}

export interface TutorAllProblemSet {
  id: string;
  title: string;
  problem_pdf_url: string;
  answer_pdf_url?: string;
  student_id: string;
}

export interface TutorSessionRow {
  id: string;
  proposed_time: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  student_name: string;
  student_id: string;
  problem_sets: TutorProblemSet[];
  series_id?: string | null;
  series_end_date?: string | null;
  recurrence_rule?: string | null;
}

export interface StudentOption {
  id: string;
  name: string;
}

export interface HomeworkItem {
  id: string;
  title: string;
  scheduled_date: string;
  student_id: string;
  student_name: string;
}

export default async function TutorSchedulePage() {
  const session = await auth();
  const tutorId = session!.user.id;

  const [sessions, students, allAttachments, tutorProblemSets, satDatesRaw, homeworkRaw] = await Promise.all([
    sql`
      SELECT s.id, s.proposed_time, s.status, s.created_at,
             u.name AS student_name, u.id AS student_id,
             s.series_id, ss.end_date AS series_end_date, ss.recurrence_rule
      FROM sessions s
      JOIN users u ON u.id = s.student_id
      LEFT JOIN session_series ss ON ss.id = s.series_id
      WHERE s.tutor_id = ${tutorId}
      ORDER BY s.proposed_time DESC
    `,
    // Only students assigned to this tutor
    sql`
      SELECT u.id, u.name
      FROM users u
      JOIN tutor_student_assignments tsa ON tsa.student_id = u.id
      WHERE tsa.tutor_id = ${tutorId}
      ORDER BY u.name
    `,
    sql`
      SELECT sps.session_id,
             ps.id, ps.title, ps.problem_pdf_url, ps.answer_pdf_url
      FROM session_problem_sets sps
      JOIN problem_sets ps ON ps.id = sps.problem_set_id
      JOIN sessions s ON s.id = sps.session_id
      WHERE s.tutor_id = ${tutorId}
      ORDER BY ps.created_at DESC
    `,
    // All problem sets this tutor created, with student_id for filtering in UI
    sql`
      SELECT id, title, problem_pdf_url, answer_pdf_url, student_id
      FROM problem_sets
      WHERE tutor_id = ${tutorId}
      ORDER BY created_at DESC
    `,
    getSatDatesForTutorStudents(tutorId),
    getHomeworkForTutorStudents(tutorId),
  ]);

  const psMap: Record<string, TutorProblemSet[]> = {};
  for (const row of allAttachments) {
    const sid = row.session_id as string;
    if (!psMap[sid]) psMap[sid] = [];
    psMap[sid].push({
      id: row.id as string,
      title: row.title as string,
      problem_pdf_url: row.problem_pdf_url as string,
      answer_pdf_url: (row.answer_pdf_url as string | null) ?? undefined,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionsWithPs: TutorSessionRow[] = (sessions as any[]).map((s) => ({
    ...s,
    proposed_time: s.proposed_time instanceof Date ? s.proposed_time.toISOString() : s.proposed_time,
    created_at: s.created_at instanceof Date ? s.created_at.toISOString() : s.created_at,
    series_end_date: s.series_end_date instanceof Date ? s.series_end_date.toISOString() : s.series_end_date,
    problem_sets: psMap[s.id] ?? [],
  }));

  const allProblemSets: TutorAllProblemSet[] = (tutorProblemSets as unknown as TutorAllProblemSet[]).map((p) => ({
    id: p.id,
    title: p.title,
    problem_pdf_url: p.problem_pdf_url,
    answer_pdf_url: p.answer_pdf_url ?? undefined,
    student_id: p.student_id,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const satDates = (satDatesRaw as any[]).map((d) => ({
    id: d.id as string,
    test_date: d.test_date instanceof Date ? d.test_date.toISOString().split('T')[0] : String(d.test_date),
    student_id: d.student_id as string,
    student_name: d.student_name as string,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const homework: HomeworkItem[] = (homeworkRaw as any[]).map((h) => ({
    id: h.id as string,
    title: h.title as string,
    scheduled_date: h.scheduled_date instanceof Date ? h.scheduled_date.toISOString().split('T')[0] : String(h.scheduled_date),
    student_id: h.student_id as string,
    student_name: h.student_name as string,
  }));

  return (
    <TutorScheduleClient
      sessions={sessionsWithPs}
      students={students as unknown as StudentOption[]}
      allProblemSets={allProblemSets}
      satDates={satDates}
      homework={homework}
    />
  );
}
