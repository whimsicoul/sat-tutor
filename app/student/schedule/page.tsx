import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import StudentScheduleClient from './client';

export interface SessionProblemSet {
  id: string;
  title: string;
  problem_pdf_url: string;
}

export interface SessionRow {
  id: string;
  proposed_time: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  tutor_name: string;
  problem_sets: SessionProblemSet[];
}

export default async function StudentSchedulePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [sessions, allAttachments] = await Promise.all([
    sql`
      SELECT s.id, s.proposed_time, s.status, s.created_at,
             u.name AS tutor_name
      FROM sessions s
      JOIN users u ON u.id = s.tutor_id
      WHERE s.student_id = ${userId}
      ORDER BY s.proposed_time DESC
    `,
    sql`
      SELECT sps.session_id,
             ps.id, ps.title, ps.problem_pdf_url
      FROM session_problem_sets sps
      JOIN problem_sets ps ON ps.id = sps.problem_set_id
      JOIN sessions s ON s.id = sps.session_id
      WHERE s.student_id = ${userId}
      ORDER BY ps.created_at DESC
    `,
  ]);

  const psMap: Record<string, SessionProblemSet[]> = {};
  for (const row of allAttachments) {
    const sid = row.session_id as string;
    if (!psMap[sid]) psMap[sid] = [];
    psMap[sid].push({
      id: row.id as string,
      title: row.title as string,
      problem_pdf_url: row.problem_pdf_url as string,
    });
  }

  const sessionsWithPs: SessionRow[] = (sessions as Omit<SessionRow, 'problem_sets'>[]).map((s) => ({
    ...s,
    problem_sets: psMap[s.id] ?? [],
  }));

  return <StudentScheduleClient sessions={sessionsWithPs} />;
}
