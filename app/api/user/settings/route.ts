import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserByEmail, updateUser } from '@/lib/db';

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, email } = await req.json();

  if (email) {
    const existing = await getUserByEmail(email);
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });
    }
  }

  const updated = await updateUser(userId, { name, email });
  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(updated);
}
