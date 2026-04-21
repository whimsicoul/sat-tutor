import { auth } from '@/lib/auth';
import sql from '@/lib/db';
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
}

export interface StudentOption {
  id: string;
  name: string;
}

export default async function TutorSchedulePage() {
  const session = await auth();
  const tutorId = session!.user.id;

  const [sessions, students, allAttachments, tutorProblemSets] = await Promise.all([
    sql`
      SELECT s.id, s.proposed_time, s.status, s.created_at,
             u.name AS student_name, u.id AS student_id
      FROM sessions s
      JOIN users u ON u.id = s.student_id
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

  const sessionsWithPs: TutorSessionRow[] = (sessions as Omit<TutorSessionRow, 'problem_sets'>[]).map((s) => ({
    ...s,
    problem_sets: psMap[s.id] ?? [],
  }));

  const allProblemSets: TutorAllProblemSet[] = (tutorProblemSets as TutorAllProblemSet[]).map((p) => ({
    id: p.id,
    title: p.title,
    problem_pdf_url: p.problem_pdf_url,
    answer_pdf_url: p.answer_pdf_url ?? undefined,
    student_id: p.student_id,
  }));

  return (
    <TutorScheduleClient
      sessions={sessionsWithPs}
      students={students as StudentOption[]}
      allProblemSets={allProblemSets}
    />
  );
}
