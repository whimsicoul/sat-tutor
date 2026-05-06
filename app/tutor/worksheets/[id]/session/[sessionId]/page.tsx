import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import sql from '@/lib/db';
import {
  getWorksheetById,
  getWorksheetSteps,
  getWorksheetStepPages,
  getWorksheetStepPositions,
  getWorksheetStepAnswerKey,
  getWorksheetStepProblems,
} from '@/lib/db';
import TutorWorksheetViewClient from './client';
import type { FlowStep, FlowPage, FlowPosition, FlowAnswerKey, FlowProblem } from '@/app/student/worksheets/[id]/page';

export default async function TutorWorksheetSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== 'tutor') redirect('/login');

  const { id, sessionId } = await params;

  // Verify this session belongs to the tutor and has this worksheet assigned
  const [sessionRow] = await sql`
    SELECT id FROM sessions WHERE id = ${sessionId} AND tutor_id = ${user.id} AND worksheet_id = ${id}
  `;
  if (!sessionRow) notFound();

  const worksheet = await getWorksheetById(id);
  if (!worksheet) notFound();

  const rawSteps = await getWorksheetSteps(id);
  const steps = await Promise.all(
    (rawSteps as {
      id: string; step_order: number; title: string; type: string;
      stage_label: string | null; locked_nav: boolean; pdf_url: string | null;
    }[]).map(async (step) => {
      const [pages, positions, answerKey, problems] = await Promise.all([
        getWorksheetStepPages(step.id),
        getWorksheetStepPositions(step.id),
        getWorksheetStepAnswerKey(step.id),
        getWorksheetStepProblems(step.id),
      ]);
      return {
        ...step,
        type: step.type as 'instruction' | 'problems',
        pages: pages as unknown as FlowPage[],
        positions: positions as unknown as FlowPosition[],
        answerKey: answerKey as unknown as FlowAnswerKey[],
        initialResponses: [],
        problems: problems as unknown as FlowProblem[],
      } as FlowStep;
    }),
  );

  return (
    <TutorWorksheetViewClient
      worksheet={{ id: worksheet.id as string, title: worksheet.title as string }}
      steps={steps}
    />
  );
}
