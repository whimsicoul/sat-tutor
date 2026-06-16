import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { getSatDatesByStudent, getDailyPracticeCompletionByStudent, getWorksheetCompletionStatusesForStudent } from '@/lib/db';
import StudentScheduleClient from './client';

export interface SessionRow {
  id: string;
  proposed_time: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  tutor_name: string;
  worksheet?: { id: string; title: string } | null;
  worksheetStatus?: 'completed' | 'started' | 'not_started';
  series_id?: string | null;
  series_end_date?: string | null;
  recurrence_rule?: string | null;
}

export interface DailyPracticeDay {
  date: string;
  completed: boolean;
}

export interface NextSession {
  id: string;
  proposed_time: string;
  status: string;
  tutor_name: string;
}

export default async function StudentSchedulePage() {
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date().toISOString();

  const [sessions, satDatesRaw, dailyPracticeRaw, nextSessionRaw] = await Promise.all([
    sql`
      SELECT s.id, s.proposed_time, s.status, s.created_at,
             u.name AS tutor_name,
             s.series_id, ss.end_date AS series_end_date, ss.recurrence_rule,
             w.id AS worksheet_id, w.title AS worksheet_title
      FROM sessions s
      JOIN users u ON u.id = s.tutor_id
      LEFT JOIN session_series ss ON ss.id = s.series_id
      LEFT JOIN worksheets w ON w.id = s.worksheet_id
      WHERE s.student_id = ${userId}
      ORDER BY s.proposed_time DESC
    `,
    getSatDatesByStudent(userId),
    getDailyPracticeCompletionByStudent(userId),
    sql`
      SELECT s.id, s.proposed_time, s.status, u.name AS tutor_name
      FROM sessions s
      JOIN users u ON u.id = s.tutor_id
      WHERE s.student_id = ${userId} AND s.proposed_time >= ${now}
      ORDER BY s.proposed_time ASC
      LIMIT 1
    `,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionsBase: SessionRow[] = (sessions as any[]).map((s) => ({
    ...s,
    proposed_time: s.proposed_time instanceof Date ? s.proposed_time.toISOString() : s.proposed_time,
    created_at: s.created_at instanceof Date ? s.created_at.toISOString() : s.created_at,
    series_end_date: s.series_end_date instanceof Date ? s.series_end_date.toISOString() : s.series_end_date,
    worksheet: s.worksheet_id ? { id: s.worksheet_id as string, title: s.worksheet_title as string } : null,
  }));

  const worksheetIds = sessionsBase.flatMap((s) => (s.worksheet ? [s.worksheet.id] : []));
  const completionStatuses = await getWorksheetCompletionStatusesForStudent(worksheetIds, userId);

  const sessionsWithPs: SessionRow[] = sessionsBase.map((s) => ({
    ...s,
    worksheetStatus: s.worksheet ? (completionStatuses[s.worksheet.id] ?? 'not_started') : undefined,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const satDates = (satDatesRaw as any[]).map((d) => ({
    id: d.id as string,
    test_date: d.test_date instanceof Date ? d.test_date.toISOString().split('T')[0] : String(d.test_date),
    created_at: d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dailyPracticeDays: DailyPracticeDay[] = (dailyPracticeRaw as any[]).map((b) => ({
    date: String(b.assigned_date).split('T')[0],
    completed: Number(b.submitted) >= Number(b.total) && Number(b.total) > 0,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextSessionRow = (nextSessionRaw as any[])[0] ?? null;
  const nextSession: NextSession | null = nextSessionRow
    ? {
        id: String(nextSessionRow.id),
        proposed_time: nextSessionRow.proposed_time instanceof Date
          ? nextSessionRow.proposed_time.toISOString()
          : String(nextSessionRow.proposed_time),
        status: String(nextSessionRow.status),
        tutor_name: String(nextSessionRow.tutor_name),
      }
    : null;

  return (
    <StudentScheduleClient
      sessions={sessionsWithPs}
      satDates={satDates}
      dailyPracticeDays={dailyPracticeDays}
      nextSession={nextSession}
    />
  );
}
