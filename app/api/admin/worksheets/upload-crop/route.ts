import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UTApi } from 'uploadthing/server';

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
}

const utapi = new UTApi();

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const response = await utapi.uploadFiles(file);
  if (response.error) return NextResponse.json({ error: response.error.message }, { status: 500 });

  return NextResponse.json({ url: response.data.ufsUrl });
}
