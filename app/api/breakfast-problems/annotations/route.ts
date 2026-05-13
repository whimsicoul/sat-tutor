import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getBreakfastAnnotations, saveBreakfastAnnotations } from '@/lib/db';
import type { Annotations } from '@/types/annotations';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const assignmentId = new URL(req.url).searchParams.get('assignmentId');
  if (!assignmentId) return NextResponse.json({ error: 'assignmentId required' }, { status: 400 });
  const annotations = await getBreakfastAnnotations(assignmentId);
  return NextResponse.json({ annotations });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { assignmentId, annotations } = await req.json() as {
    assignmentId: string;
    annotations: Annotations;
  };
  await saveBreakfastAnnotations(assignmentId, annotations);
  return NextResponse.json({ ok: true });
}
