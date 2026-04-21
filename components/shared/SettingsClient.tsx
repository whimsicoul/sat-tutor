'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface SettingsClientProps {
  initialName: string;
  initialEmail: string;
  role: 'student' | 'tutor' | 'admin';
}

export default function SettingsClient({ initialName, initialEmail, role }: SettingsClientProps) {
  const isRose = role === 'student';
  const accentColor = isRose ? 'var(--rose-deeper)' : role === 'tutor' ? 'var(--sky-deeper)' : 'var(--rose-deeper)';
  const eyebrowClass = isRose ? 'eyebrow-rose' : role === 'tutor' ? 'eyebrow-sky' : 'eyebrow-rose';

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      toast.success('Profile updated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error saving profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update password');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error updating password');
    } finally {
      setPasswordSaving(false);
    }
  }

  const cardStyle = {
    background: 'var(--white)',
    borderRadius: 14,
    border: '1px solid var(--fog)',
    boxShadow: '0 2px 8px rgba(26,29,35,0.04)',
    padding: '28px 32px',
  };

  return (
    <div className="space-y-8">
      <div>
        <div className={eyebrowClass} style={{ marginBottom: 12 }}>
          {role.charAt(0).toUpperCase() + role.slice(1)} Portal
        </div>
        <h1 className="portal-section-title">Settings</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>
          Manage your profile and account security.
        </p>
      </div>

      {/* Profile section */}
      <div style={cardStyle}>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--charcoal)',
            marginBottom: 20,
            letterSpacing: '-0.02em',
          }}
        >
          Profile
        </h2>
        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Label htmlFor="settings-name" style={{ color: 'var(--slate)' }}>Full Name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="settings-email" style={{ color: 'var(--slate)' }}>Email</Label>
            <Input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <Button
              type="submit"
              disabled={profileSaving}
              style={{ background: accentColor, color: 'var(--white)', border: 'none', fontFamily: "'Syne', sans-serif" }}
            >
              {profileSaving ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </div>

      {/* Password section */}
      <div style={cardStyle}>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--charcoal)',
            marginBottom: 20,
            letterSpacing: '-0.02em',
          }}
        >
          Change Password
        </h2>
        <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Label htmlFor="current-password" style={{ color: 'var(--slate)' }}>Current Password</Label>
            <div style={{ position: 'relative' }} className="mt-1">
              <Input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: '2.75rem' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                tabIndex={-1}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', inset: '0 0 0 auto',
                  display: 'flex', alignItems: 'center', paddingRight: 12,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--mist)',
                }}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="new-password" style={{ color: 'var(--slate)' }}>New Password</Label>
            <div style={{ position: 'relative' }} className="mt-1">
              <Input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: '2.75rem' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                tabIndex={-1}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', inset: '0 0 0 auto',
                  display: 'flex', alignItems: 'center', paddingRight: 12,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--mist)',
                }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirm-password" style={{ color: 'var(--slate)' }}>Confirm New Password</Label>
            <div style={{ position: 'relative' }} className="mt-1">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: '2.75rem' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', inset: '0 0 0 auto',
                  display: 'flex', alignItems: 'center', paddingRight: 12,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--mist)',
                }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <Button
              type="submit"
              disabled={passwordSaving}
              style={{ background: accentColor, color: 'var(--white)', border: 'none', fontFamily: "'Syne', sans-serif" }}
            >
              {passwordSaving ? 'Updating…' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
