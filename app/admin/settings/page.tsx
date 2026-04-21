import { auth } from '@/lib/auth';
import SettingsClient from '@/components/shared/SettingsClient';

export default async function AdminSettingsPage() {
  const session = await auth();
  return (
    <div style={{ padding: '40px 48px' }}>
      <SettingsClient
        initialName={session!.user.name ?? ''}
        initialEmail={session!.user.email ?? ''}
        role="admin"
      />
    </div>
  );
}
