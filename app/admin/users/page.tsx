import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllUsersWithTutors, getUsersByRole } from '@/lib/db';
import UsersClient from './client';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
  tutor_id?: string | null;
  tutor_name?: string | null;
}

export interface TutorOption {
  id: string;
  name: string;
}

export default async function AdminUsersPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const [rawUsers, rawTutors] = await Promise.all([
    getAllUsersWithTutors(),
    getUsersByRole('tutor'),
  ]);

  const users = (rawUsers as unknown) as AdminUser[];
  const tutors = (rawTutors as Array<{ id: string; name: string }>).map(
    (t) => ({ id: t.id, name: t.name }),
  );

  return <UsersClient users={users} tutors={tutors} />;
}
