import sql from '@/lib/db';
import AdminTestResultsClient from './client';

export interface TestResultRow {
  id: string;
  student_id: string;
  student_name: string;
  test_name: string;
  test_date: string;
  total_score: number | null;
  math_score: number | null;
  reading_writing_score: number | null;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
}

export interface StudentOption {
  id: string;
  name: string;
}

export default async function AdminTestResultsPage() {
  const [results, students] = await Promise.all([
    sql`
      SELECT tr.id, tr.student_id, u.name AS student_name,
             tr.test_name, tr.test_date, tr.total_score,
             tr.math_score, tr.reading_writing_score, tr.notes, tr.pdf_url, tr.created_at
      FROM test_results tr
      JOIN users u ON u.id = tr.student_id
      ORDER BY tr.test_date DESC, tr.created_at DESC
    `,
    sql`
      SELECT id, name FROM users
      WHERE role = 'student' AND active = true
      ORDER BY name
    `,
  ]);

  return (
    <AdminTestResultsClient
      results={results as unknown as TestResultRow[]}
      students={students as unknown as StudentOption[]}
    />
  );
}
