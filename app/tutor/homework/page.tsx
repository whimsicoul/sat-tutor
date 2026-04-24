import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { getHomeworkForTutorStudents } from '@/lib/db';
import TutorHomeworkClient from './client';

export interface HomeworkRow {
  id: string;
  title: string;
  scheduled_date: string;
  problem_pdf_url: string;
  answer_pdf_url: string | null;
  created_at: string;
  student_name: string;
  student_id: string;
}

export interface StudentOption {
  id: string;
  name: string;
}

export default async function TutorHomeworkPage() {
  const session = await auth();
  const tutorId = session!.user.id;

  const [homework, students] = await Promise.all([
    getHomeworkForTutorStudents(tutorId),
    sql`
      SELECT u.id, u.name
      FROM users u
      JOIN tutor_student_assignments tsa ON tsa.student_id = u.id
      WHERE tsa.tutor_id = ${tutorId}
      ORDER BY u.name
    `,
  ]);

  return (
    <TutorHomeworkClient
      homework={homework as unknown as HomeworkRow[]}
      students={students as unknown as StudentOption[]}
    />
  );
}
