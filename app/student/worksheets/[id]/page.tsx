import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import {
  getWorksheetById,
  getWorksheetSteps,
  getWorksheetStepPages,
  getWorksheetStepPositions,
  getWorksheetStepAnswerKey,
  getWorksheetStepResponses,
} from '@/lib/db';
import WorksheetFlowClient from './client';

export interface FlowStep {
  id: string;
  step_order: number;
  title: string;
  type: 'instruction' | 'problems';
  stage_label: string | null;
  locked_nav: boolean;
  pdf_url: string | null;
  pages: FlowPage[];
  positions: FlowPosition[];
  answerKey: FlowAnswerKey[];
  initialResponses: FlowResponse[];
}

export interface FlowPage {
  id: string;
  page_number: number;
  image_url: string;
}

export interface FlowPosition {
  id: string;
  question_number: number;
  page_number: number;
  x_percent: number;
  y_percent: number;
}

export interface FlowAnswerKey {
  question_number: number;
  correct_answer: string;
}

export interface FlowResponse {
  question_number: number;
  selected_answer: string | null;
  eliminated_choices: string[];
}

export default async function StudentWorksheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) redirect('/login');

  const { id } = await params;
  const worksheet = await getWorksheetById(id);
  if (!worksheet) notFound();

  const rawSteps = await getWorksheetSteps(id);
  const steps = await Promise.all(
    (rawSteps as {
      id: string; step_order: number; title: string; type: string;
      stage_label: string | null; locked_nav: boolean; pdf_url: string | null;
    }[]).map(async (step) => {
      const [pages, positions, answerKey, responses] = await Promise.all([
        getWorksheetStepPages(step.id),
        getWorksheetStepPositions(step.id),
        getWorksheetStepAnswerKey(step.id),
        getWorksheetStepResponses(step.id, user.id!),
      ]);
      return {
        ...step,
        type: step.type as 'instruction' | 'problems',
        pages: pages as unknown as FlowPage[],
        positions: positions as unknown as FlowPosition[],
        answerKey: answerKey as unknown as FlowAnswerKey[],
        initialResponses: (responses as unknown as FlowResponse[]),
      } as FlowStep;
    }),
  );

  return (
    <WorksheetFlowClient
      worksheet={{ id: worksheet.id as string, title: worksheet.title as string }}
      steps={steps}
    />
  );
}
