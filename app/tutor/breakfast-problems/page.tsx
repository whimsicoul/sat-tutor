import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBreakfastResultsForTutorStudents, getLastSessionDatePerStudent } from '@/lib/db';
import TutorBreakfastClient from './client';

export interface BreakfastResult {
  id: string;
  problem_id: string;
  student_answer: string;
  is_correct: boolean;
  submitted_at: string;
  assigned_date: string;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  answer_explanation: string | null;
  category: string | null;
  question_image_url: string | null;
  crop_top_px: number | null;
  crop_bottom_px: number | null;
  image_width_px: number | null;
  image_height_px: number | null;
  student_id: string;
  student_name: string;
}

export interface LastSessionDate {
  student_id: string;
  last_session_date: string;
}

export default async function TutorBreakfastPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'tutor') redirect('/login');

  const tutorId = session!.user.id;

  const [results, lastSessionDates] = await Promise.all([
    getBreakfastResultsForTutorStudents(tutorId),
    getLastSessionDatePerStudent(tutorId),
  ]);

  return (
    <TutorBreakfastClient
      results={results as unknown as BreakfastResult[]}
      lastSessionDates={lastSessionDates as unknown as LastSessionDate[]}
    />
  );
}
