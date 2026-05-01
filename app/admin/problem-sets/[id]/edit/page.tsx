import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import {
  getProblemSetById,
  getProblemSetQuestionsAdmin,
  getProblemSetPages,
  getProblemSetQuestionPositions,
  getProblemSetAnswerKey,
} from '@/lib/db';
import ProblemSetEditorClient from './client';

export default async function AdminProblemSetEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'admin') notFound();

  const { id } = await params;
  const ps = await getProblemSetById(id);
  if (!ps) notFound();

  const [questions, pages, positions, answerKey] = await Promise.all([
    getProblemSetQuestionsAdmin(id),
    getProblemSetPages(id),
    getProblemSetQuestionPositions(id),
    getProblemSetAnswerKey(id),
  ]);

  return (
    <ProblemSetEditorClient
      problemSet={{
        id: ps.id as string,
        title: ps.title as string,
        questionCount: (ps.question_count as number | null) ?? questions.length,
        extractionStatus: ps.extraction_status as string,
        answerKeyStatus: ps.answer_key_status as string,
      }}
      initialQuestions={questions as unknown as PsQuestion[]}
      initialPages={pages as unknown as PsPage[]}
      initialPositions={positions as unknown as PsPosition[]}
      initialAnswerKey={answerKey as unknown as PsAnswerKeyEntry[]}
    />
  );
}

export interface PsQuestion {
  id: string;
  question_number: number;
  stem: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  passage: string | null;
  question_image_url: string | null;
  crop_top_px: number | null;
  crop_bottom_px: number | null;
  image_width_px: number | null;
  image_height_px: number | null;
}

export interface PsPage {
  id: string;
  page_number: number;
  image_url: string;
}

export interface PsPosition {
  id: string;
  question_number: number;
  page_number: number;
  x_percent: number;
  y_percent: number;
}

export interface PsAnswerKeyEntry {
  question_number: number;
  correct_answer: string;
}
