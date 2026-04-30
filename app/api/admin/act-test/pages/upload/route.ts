import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';
import { upsertActPage } from '@/lib/db';

const utapi = new UTApi();

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== 'admin') return null;
  return session;
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const section = formData.get('section') as string | null;
  const pageNumber = parseInt(formData.get('pageNumber') as string, 10);

  if (!file || !section || isNaN(pageNumber)) {
    return NextResponse.json({ error: 'file, section, and pageNumber are required' }, { status: 400 });
  }

  const response = await utapi.uploadFiles(file);
  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 500 });
  }

  const imageUrl = response.data.ufsUrl;
  const page = await upsertActPage(section, pageNumber, imageUrl);
  return NextResponse.json({ ok: true, page });
}
