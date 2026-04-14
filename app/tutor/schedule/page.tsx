import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import TutorScheduleClient from './client';

export default async function TutorSchedulePage() {
  const session = await auth();
  const tutorId = session!.user.id;

  const [sessions, students] = await Promise.all([
    sql`
      SELECT s.id, s.proposed_time, s.status, s.created_at,
             u.name AS student_name
      FROM sessions s
      JOIN users u ON u.id = s.student_id
      WHERE s.tutor_id = ${tutorId}
      ORDER BY s.proposed_time DESC
    `,
    sql`SELECT id, name FROM users WHERE role = 'student' ORDER BY name`,
  ]);

  return (
    <TutorScheduleClient
      sessions={sessions as TutorSessionRow[]}
      students={students as StudentOption[]}
    />
  );
}

export interface TutorSessionRow {
  id: string;
  proposed_time: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  student_name: string;
}

export interface StudentOption {
  id: string;
  name: string;
}
