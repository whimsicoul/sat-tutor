import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWorksheetStepPages, insertWorksheetStepPage } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const pages = await getWorksheetStepPages(stepId);
  return NextResponse.json({ pages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const { pageNumber, imageUrl } = await req.json() as { pageNumber: number; imageUrl: string };
  const page = await insertWorksheetStepPage(stepId, pageNumber, imageUrl);
  return NextResponse.json({ page }, { status: 201 });
}
