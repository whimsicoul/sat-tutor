import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import StudentScheduleClient from './client';

export default async function StudentSchedulePage() {
  const session = await auth();
  const userId = session!.user.id;

  const sessions = await sql`
    SELECT s.id, s.proposed_time, s.status, s.created_at,
           u.name AS tutor_name
    FROM sessions s
    JOIN users u ON u.id = s.tutor_id
    WHERE s.student_id = ${userId}
    ORDER BY s.proposed_time DESC
  `;

  return <StudentScheduleClient sessions={sessions as SessionRow[]} />;
}

export interface SessionRow {
  id: string;
  proposed_time: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  tutor_name: string;
}
