import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import {
  getWorksheetById,
  getWorksheetSteps,
  getWorksheetStepPages,
  getWorksheetStepPositions,
  getWorksheetStepAnswerKey,
} from '@/lib/db';
import WorksheetBuilderClient from './client';

export interface WsStep {
  id: string;
  worksheet_id: string;
  step_order: number;
  title: string;
  type: 'instruction' | 'problems';
  stage_label: string | null;
  locked_nav: boolean;
  pdf_url: string | null;
  pages: WsPage[];
  positions: WsPosition[];
  answerKey: WsAnswerKeyEntry[];
}

export interface WsPage {
  id: string;
  step_id: string;
  page_number: number;
  image_url: string;
}

export interface WsPosition {
  id: string;
  step_id: string;
  question_number: number;
  page_number: number;
  x_percent: number;
  y_percent: number;
}

export interface WsAnswerKeyEntry {
  id: string;
  step_id: string;
  question_number: number;
  correct_answer: string;
}

export default async function AdminWorksheetEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'admin') notFound();

  const { id } = await params;
  const worksheet = await getWorksheetById(id);
  if (!worksheet) notFound();

  const steps = await getWorksheetSteps(id);
  const stepsWithData = await Promise.all(
    (steps as { id: string; worksheet_id: string; step_order: number; title: string; type: string; stage_label: string | null; locked_nav: boolean; pdf_url: string | null }[]).map(async (step) => {
      const [pages, positions, answerKey] = await Promise.all([
        getWorksheetStepPages(step.id),
        getWorksheetStepPositions(step.id),
        getWorksheetStepAnswerKey(step.id),
      ]);
      return {
        ...step,
        type: step.type as 'instruction' | 'problems',
        pages: pages as unknown as WsPage[],
        positions: positions as unknown as WsPosition[],
        answerKey: answerKey as unknown as WsAnswerKeyEntry[],
      } as WsStep;
    }),
  );

  return (
    <WorksheetBuilderClient
      worksheet={{ id: worksheet.id as string, title: worksheet.title as string }}
      initialSteps={stepsWithData}
    />
  );
}
