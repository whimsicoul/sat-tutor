import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    redirect('/login');
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'transparent', overflow: 'hidden' }}>
      <AdminSidebar />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
