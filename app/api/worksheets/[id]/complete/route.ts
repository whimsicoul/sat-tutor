import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { markWorksheetCompleted } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: worksheetId } = await params;

  // Mark complete only if every problem in every 'problems' step has a response
  const rows = await sql`
    SELECT
      COUNT(wsp.id)::int AS total,
      COUNT(wsr.id)::int AS answered
    FROM worksheet_steps ws
    JOIN worksheet_step_problems wsp ON wsp.step_id = ws.id
    LEFT JOIN worksheet_step_responses wsr
      ON wsr.step_id = ws.id
      AND wsr.question_number = wsp.question_number
      AND wsr.student_id = ${userId}
      AND wsr.selected_answer IS NOT NULL
    WHERE ws.worksheet_id = ${worksheetId} AND ws.type = 'problems'
  `;

  const { total, answered } = rows[0] as { total: number; answered: number };
  if (total > 0 && answered >= total) {
    await markWorksheetCompleted(worksheetId, userId);
  }

  return NextResponse.json({ ok: true });
}
