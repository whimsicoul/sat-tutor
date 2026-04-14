import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import TutorProblemSetsClient from './client';

export default async function TutorProblemSetsPage() {
  const session = await auth();
  const tutorId = session!.user.id;

  const [problemSets, students] = await Promise.all([
    sql`
      SELECT ps.id, ps.title, ps.problem_pdf_url, ps.answer_pdf_url, ps.created_at,
             u.name AS student_name
      FROM problem_sets ps
      JOIN users u ON u.id = ps.student_id
      WHERE ps.tutor_id = ${tutorId}
      ORDER BY ps.created_at DESC
    `,
    sql`SELECT id, name FROM users WHERE role = 'student' ORDER BY name`,
  ]);

  return (
    <TutorProblemSetsClient
      problemSets={problemSets as ProblemSetRow[]}
      students={students as StudentOption[]}
    />
  );
}

export interface ProblemSetRow {
  id: string;
  title: string;
  problem_pdf_url: string;
  answer_pdf_url: string | null;
  created_at: string;
  student_name: string;
}

export interface StudentOption {
  id: string;
  name: string;
}
