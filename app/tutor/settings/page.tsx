import { auth } from '@/lib/auth';
import SettingsClient from '@/components/shared/SettingsClient';

export default async function TutorSettingsPage() {
  const session = await auth();
  return (
    <SettingsClient
      initialName={session!.user.name ?? ''}
      initialEmail={session!.user.email ?? ''}
      role="tutor"
    />
  );
}
