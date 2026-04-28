import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import StudentSidebar from '@/components/student/StudentSidebar';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'student') {
    redirect('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>
      <StudentSidebar />
      <main style={{ flex: 1, overflowX: 'hidden', padding: '40px 20px' }}>
        {children}
      </main>
    </div>
  );
}
