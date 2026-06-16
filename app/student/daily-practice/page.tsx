import { auth } from '@/lib/auth';
import { getTodayAssignmentsForStudent, assignDailyPracticeForToday } from '@/lib/db';
import StudentDailyPracticeClient from './client';

export interface TodayAssignment {
  assignment_id: string;
  assigned_date: string;
  problem_id: string;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  category: string | null;
  question_image_url: string | null;
  crop_top_px: number;
  crop_bottom_px: number;
  image_width_px: number;
  image_height_px: number;
  student_answer: string | null;
  is_correct: boolean | null;
  submitted_at: string | null;
  annotations: unknown[];
}

export default async function StudentDailyPracticePage() {
  const session = await auth();
  const userId = session!.user.id;

  let assignments = await getTodayAssignmentsForStudent(userId);
  if (assignments.length === 0) {
    await assignDailyPracticeForToday(userId, 5);
    assignments = await getTodayAssignmentsForStudent(userId);
  }

  return (
    <StudentDailyPracticeClient
      assignments={assignments as unknown as TodayAssignment[]}
    />
  );
}
