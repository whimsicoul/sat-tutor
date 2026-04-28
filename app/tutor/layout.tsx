import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TutorSidebar from '@/components/tutor/TutorSidebar';

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'tutor') {
    redirect('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>
      <TutorSidebar />
      <main style={{ flex: 1, overflowX: 'hidden', padding: '40px 20px' }}>
        {children}
      </main>
    </div>
  );
}
