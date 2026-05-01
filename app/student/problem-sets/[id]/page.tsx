import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import {
  getProblemSetById,
  getProblemSetQuestions,
  getProblemSetResponses,
} from '@/lib/db';
import ProblemSetClient from './client';

export default async function StudentProblemSetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  const ps = await getProblemSetById(id);

  if (!ps || ps.student_id !== session.user.id) notFound();
  if (ps.extraction_status !== 'done') redirect('/student/problem-sets');

  const [questions, responses] = await Promise.all([
    getProblemSetQuestions(id),
    getProblemSetResponses(id, session.user.id),
  ]);

  return (
    <ProblemSetClient
      problemSet={{
        id: ps.id as string,
        title: ps.title as string,
        problemPdfUrl: ps.problem_pdf_url as string,
        hasAnswerKey: ps.answer_key_status === 'done',
      }}
      questions={questions as {
        id: string;
        question_number: number;
        stem: string;
        choice_a: string;
        choice_b: string;
        choice_c: string;
        choice_d: string;
        passage: string | null;
      }[]}
      initialResponses={responses as {
        question_number: number;
        selected_answer: string | null;
        eliminated_choices: string[];
      }[]}
    />
  );
}
