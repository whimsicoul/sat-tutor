import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTutorStudentAssignments, getUsersByRole } from '@/lib/db';
import AssignmentsClient from './client';

export interface Assignment {
  id: string;
  tutor_id: string;
  tutor_name: string;
  student_id: string;
  student_name: string;
  created_at: string;
}

export interface UserOption {
  id: string;
  name: string;
}

export default async function AdminAssignmentsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const [assignments, tutors, students] = await Promise.all([
    getTutorStudentAssignments(),
    getUsersByRole('tutor'),
    getUsersByRole('student'),
  ]);

  return (
    <AssignmentsClient
      assignments={(assignments as unknown) as Assignment[]}
      tutors={(tutors as unknown) as UserOption[]}
      students={(students as unknown) as UserOption[]}
    />
  );
}
