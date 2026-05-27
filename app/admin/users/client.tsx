'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, UserX, UserCheck, Eye, EyeOff } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminUser, TutorOption } from './page';

const roleBadge = (role: string, active: boolean) => {
  const isRose = role === 'student';
  const isSky = role === 'tutor';
  const color = isSky ? 'var(--sky-deeper)' : isRose ? 'var(--rose-deeper)' : 'var(--slate)';
  const bg = isSky ? 'rgba(168,203,222,0.18)' : isRose ? 'rgba(224,166,175,0.18)' : 'var(--frost)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
          color, background: bg, padding: '3px 10px', borderRadius: 20,
          fontFamily: "'Syne', sans-serif",
        }}
      >
        {role}
      </span>
      {!active && (
        <span
          style={{
            fontSize: 11, color: 'var(--mist)', background: 'var(--frost)',
            padding: '3px 8px', borderRadius: 20, fontFamily: "'Syne', sans-serif",
          }}
        >
          inactive
        </span>
      )}
    </span>
  );
};

const TutorSelect = ({
  value,
  onChange,
  tutors,
  placeholder = 'No tutor assigned',
}: {
  value: string;
  onChange: (v: string) => void;
  tutors: TutorOption[];
  placeholder?: string;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      display: 'block', width: '100%', marginTop: 4,
      height: 32, padding: '0 8px', borderRadius: 8,
      border: '1px solid var(--fog)', background: 'transparent',
      fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer',
      fontFamily: "'Syne', sans-serif",
    }}
  >
    <option value="">{placeholder}</option>
    {tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
  </select>
);

export default function UsersClient({
  users: initial,
  tutors,
}: {
  users: AdminUser[];
  tutors: TutorOption[];
}) {
  const [users, setUsers] = useState<AdminUser[]>(initial);
  const [filter, setFilter] = useState<'all' | 'tutor' | 'student'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'student', tutorId: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', newPassword: '', tutorId: '' });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const filtered = users.filter((u) => filter === 'all' || u.role === filter);

  /** Set the tutor assignment for a student. Removes any existing then creates new. */
  async function applyTutorAssignment(studentId: string, oldTutorId: string | null | undefined, newTutorId: string) {
    // If tutor hasn't changed, skip
    if ((oldTutorId ?? '') === newTutorId) return;

    // Remove old assignment first (we need the assignment id — re-fetch from the assignments list)
    if (oldTutorId) {
      // Fetch to find the assignment id
      const listRes = await fetch('/api/admin/assignments');
      if (listRes.ok) {
        const all = await listRes.json() as Array<{ id: string; tutor_id: string; student_id: string }>;
        const existing = all.find((a) => a.student_id === studentId && a.tutor_id === oldTutorId);
        if (existing) {
          await fetch(`/api/admin/assignments/${existing.id}`, { method: 'DELETE' });
        }
      }
    }

    // Create new assignment
    if (newTutorId) {
      await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId: newTutorId, studentId }),
      });
    }
  }

  async function handleAdd() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addForm.name, email: addForm.email, password: addForm.password, role: addForm.role }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const user = await res.json() as AdminUser;

      // If student with a tutor selected, create the assignment
      if (addForm.role === 'student' && addForm.tutorId) {
        await fetch('/api/admin/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tutorId: addForm.tutorId, studentId: user.id }),
        });
        const tutor = tutors.find((t) => t.id === addForm.tutorId);
        user.tutor_id = addForm.tutorId;
        user.tutor_name = tutor?.name ?? null;
      }

      setUsers((prev) => [user, ...prev]);
      setAddOpen(false);
      setAddForm({ name: '', email: '', password: '', role: 'student', tutorId: '' });
      toast.success('User created');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error creating user');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editUser) return;
    setSaving(true);
    try {
      const { newPassword, tutorId, ...rest } = editForm;
      const body = { ...rest, ...(newPassword ? { password: newPassword } : {}) };
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const updated = await res.json() as AdminUser;

      // Handle tutor assignment change for students
      const isStudent = editForm.role === 'student' || editUser.role === 'student';
      if (isStudent) {
        await applyTutorAssignment(editUser.id, editUser.tutor_id, tutorId);
        const tutor = tutors.find((t) => t.id === tutorId);
        updated.tutor_id = tutorId || null;
        updated.tutor_name = tutor?.name ?? null;
      }

      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditUser(null);
      setShowEditPassword(false);
      toast.success('User updated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error updating user');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user: AdminUser) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json() as AdminUser;
      // Preserve tutor info (not returned by basic PATCH)
      updated.tutor_id = user.tutor_id;
      updated.tutor_name = user.tutor_name;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(updated.active ? 'User reactivated' : 'User deactivated');
    } catch {
      toast.error('Failed to update user');
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      setDeleteUser(null);
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setSaving(false);
    }
  }

  const filterTabs: Array<'all' | 'tutor' | 'student'> = ['all', 'tutor', 'student'];

  // Table headers — show Tutor column only for student filter or all
  const showTutorCol = filter === 'all' || filter === 'student';
  const headers = ['Name', 'Email', 'Role', ...(showTutorCol ? ['Tutor'] : []), 'Created', 'Actions'];

  return (
    <div style={{ padding: '40px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 34,
              fontWeight: 700,
              color: 'var(--charcoal)',
              margin: 0,
              letterSpacing: '-0.025em',
            }}
          >
            Users
          </h1>
          <p style={{ color: 'var(--slate)', marginTop: 6, fontSize: 15 }}>
            Manage tutor and student accounts
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="btn-rose"
          style={{ gap: 8 }}
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {filterTabs.map((tab) => {
          const active = filter === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                border: active ? '1px solid rgba(224,166,175,0.4)' : '1px solid var(--fog)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                background: active ? 'rgba(224,166,175,0.14)' : 'var(--white)',
                color: active ? 'var(--rose-deeper)' : 'var(--slate)',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {tab}{' '}
              <span style={{ opacity: 0.65 }}>
                ({tab === 'all' ? users.length : users.filter((u) => u.role === tab).length})
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 14,
          border: '1px solid var(--fog)',
          boxShadow: '0 2px 8px rgba(26,29,35,0.04)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--fog)', background: 'var(--frost)' }}>
              {headers.map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '12px 20px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--mist)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    color: 'var(--mist)',
                    fontSize: 14,
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((user, i) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--fog)' : 'none',
                    opacity: user.active ? 1 : 0.5,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--frost)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                >
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif" }}>
                    {user.name}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '14px 20px' }}>{roleBadge(user.role, user.active)}</td>
                  {showTutorCol && (
                    <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
                      {user.role === 'student' ? (
                        user.tutor_name ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: 'rgba(168,203,222,0.15)', color: 'var(--sky-deeper)',
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                            fontFamily: "'Syne', sans-serif",
                          }}>
                            {user.tutor_name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--cloud)', fontSize: 12, fontStyle: 'italic' }}>unassigned</span>
                        )
                      ) : (
                        <span style={{ color: 'var(--cloud)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  )}
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--mist)', fontFamily: "'Syne', sans-serif" }}>
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => {
                          setEditUser(user);
                          setEditForm({ name: user.name, email: user.email, role: user.role, newPassword: '', tutorId: user.tutor_id ?? '' });
                          setShowEditPassword(false);
                        }}
                        title="Edit"
                        style={{
                          background: 'var(--frost)',
                          border: '1px solid var(--fog)',
                          borderRadius: 8,
                          padding: '6px 8px',
                          cursor: 'pointer',
                          color: 'var(--slate)',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sky-pale)'; e.currentTarget.style.color = 'var(--sky-deeper)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--frost)'; e.currentTarget.style.color = 'var(--slate)'; }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        title={user.active ? 'Deactivate' : 'Reactivate'}
                        style={{
                          background: 'var(--frost)',
                          border: '1px solid var(--fog)',
                          borderRadius: 8,
                          padding: '6px 8px',
                          cursor: 'pointer',
                          color: user.active ? 'var(--rose-deeper)' : 'var(--sky-deeper)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button
                        onClick={() => setDeleteUser(user)}
                        title="Delete"
                        style={{
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: 8,
                          padding: '6px 8px',
                          cursor: 'pointer',
                          color: '#EF4444',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen} modal={false}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>
              Add User
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <Label htmlFor="add-name" style={{ color: 'var(--slate)' }}>Full Name</Label>
              <Input id="add-name" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="add-email" style={{ color: 'var(--slate)' }}>Email</Label>
              <Input id="add-email" type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="add-password" style={{ color: 'var(--slate)' }}>Password</Label>
              <div style={{ position: 'relative' }} className="mt-1">
                <Input
                  id="add-password"
                  type={showAddPassword ? 'text' : 'password'}
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAddPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showAddPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', inset: '0 0 0 auto',
                    display: 'flex', alignItems: 'center', paddingRight: 12,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--mist)',
                  }}
                >
                  {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <Label style={{ color: 'var(--slate)' }}>Role</Label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value, tutorId: '' }))}
                style={{
                  display: 'block', width: '100%', marginTop: 4,
                  height: 32, padding: '0 8px', borderRadius: 8,
                  border: '1px solid var(--fog)', background: 'transparent',
                  fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer',
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
              </select>
            </div>
            {addForm.role === 'student' && (
              <div>
                <Label style={{ color: 'var(--slate)' }}>
                  Assign Tutor{' '}
                  <span style={{ color: 'var(--mist)', fontWeight: 400 }}>(optional)</span>
                </Label>
                <TutorSelect
                  value={addForm.tutorId}
                  onChange={(v) => setAddForm((f) => ({ ...f, tutorId: v }))}
                  tutors={tutors}
                />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAdd}
              disabled={saving}
              style={{ background: 'var(--rose)', color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", border: 'none' }}
            >
              {saving ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)} modal={false}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>
              Edit User
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <Label htmlFor="edit-name" style={{ color: 'var(--slate)' }}>Full Name</Label>
              <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="edit-email" style={{ color: 'var(--slate)' }}>Email</Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label style={{ color: 'var(--slate)' }}>Role</Label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                style={{
                  display: 'block', width: '100%', marginTop: 4,
                  height: 32, padding: '0 8px', borderRadius: 8,
                  border: '1px solid var(--fog)', background: 'transparent',
                  fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer',
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
              </select>
            </div>
            {(editForm.role === 'student' || editUser?.role === 'student') && (
              <div>
                <Label style={{ color: 'var(--slate)' }}>Assigned Tutor</Label>
                <TutorSelect
                  value={editForm.tutorId}
                  onChange={(v) => setEditForm((f) => ({ ...f, tutorId: v }))}
                  tutors={tutors}
                  placeholder="Remove tutor assignment"
                />
              </div>
            )}
            <div>
              <Label htmlFor="edit-password" style={{ color: 'var(--slate)' }}>New Password <span style={{ color: 'var(--mist)', fontWeight: 400 }}>(optional)</span></Label>
              <div style={{ position: 'relative' }} className="mt-1">
                <Input
                  id="edit-password"
                  type={showEditPassword ? 'text' : 'password'}
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', inset: '0 0 0 auto',
                    display: 'flex', alignItems: 'center', paddingRight: 12,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--mist)',
                  }}
                >
                  {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button
              onClick={handleEdit}
              disabled={saving}
              style={{ background: 'var(--sky)', color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", border: 'none' }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>
              Delete User?
            </DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: 14, color: 'var(--slate)', marginTop: 8, fontFamily: "'Syne', sans-serif" }}>
            This will permanently delete <strong style={{ color: 'var(--charcoal)' }}>{deleteUser?.name}</strong> and all their associated data. This cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button onClick={handleDelete} disabled={saving} variant="destructive">
              {saving ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
