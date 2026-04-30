import sql from '@/lib/db';
import { getAllSatDates } from '@/lib/db';
import AdminTestResultsClient from './client';

export interface SatDateRow {
  id: string;
  student_id: string;
  student_name: string;
  test_date: string;
  created_at: string;
}

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
  score_type: string | null;
  act_english_score: number | null;
  act_reading_score: number | null;
  created_at: string;
}

export interface StudentOption {
  id: string;
  name: string;
}

export default async function AdminTestResultsPage() {
  const [results, students, satDatesRaw] = await Promise.all([
    sql`
      SELECT tr.id, tr.student_id, u.name AS student_name,
             tr.test_name, tr.test_date, tr.total_score,
             tr.math_score, tr.reading_writing_score, tr.notes, tr.pdf_url,
             tr.score_type, tr.act_english_score, tr.act_reading_score, tr.created_at
      FROM test_results tr
      JOIN users u ON u.id = tr.student_id
      ORDER BY tr.test_date DESC, tr.created_at DESC
    `,
    sql`
      SELECT id, name FROM users
      WHERE role = 'student' AND active = true
      ORDER BY name
    `,
    getAllSatDates(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const satDates = (satDatesRaw as any[]).map((d) => ({
    id: d.id as string,
    student_id: d.student_id as string,
    student_name: d.student_name as string,
    test_date: d.test_date instanceof Date ? d.test_date.toISOString().split('T')[0] : String(d.test_date),
    created_at: d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at),
  }));

  return (
    <AdminTestResultsClient
      results={results as unknown as TestResultRow[]}
      students={students as unknown as StudentOption[]}
      satDates={satDates}
    />
  );
}
