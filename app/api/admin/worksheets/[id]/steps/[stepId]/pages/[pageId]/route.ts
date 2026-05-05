import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteWorksheetStepPage } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string; pageId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { pageId } = await params;
  await deleteWorksheetStepPage(pageId);
  return NextResponse.json({ ok: true });
}
