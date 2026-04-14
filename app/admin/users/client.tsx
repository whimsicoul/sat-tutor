'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, UserX, UserCheck } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdminUser } from './page';

const roleBadge = (role: string, active: boolean) => {
  const color = role === 'tutor' ? '#8BB5AE' : role === 'student' ? '#E0A6AF' : '#6A7280';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
          color, background: color + '22', padding: '3px 8px', borderRadius: 20,
        }}
      >
        {role}
      </span>
      {!active && (
        <span style={{ fontSize: 11, color: '#8A9099', background: '#F0F2F5', padding: '3px 7px', borderRadius: 20 }}>
          inactive
        </span>
      )}
    </span>
  );
};

export default function UsersClient({ users: initial }: { users: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initial);
  const [filter, setFilter] = useState<'all' | 'tutor' | 'student'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'student' });

  // Edit form state
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });

  const filtered = users.filter((u) => filter === 'all' || u.role === filter);

  async function handleAdd() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const user = await res.json();
      setUsers((prev) => [user, ...prev]);
      setAddOpen(false);
      setAddForm({ name: '', email: '', password: '', role: 'student' });
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
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditUser(null);
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
      const updated = await res.json();
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

  return (
    <div style={{ padding: '40px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: '#1F1F1F', margin: 0 }}>
            Users
          </h1>
          <p style={{ color: '#4A4F5A', marginTop: 6, fontSize: 15, fontFamily: "'Syne', sans-serif" }}>
            Manage tutor and student accounts
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} style={{ background: '#1F1F1F', color: '#F0F2F5', gap: 6, fontFamily: "'Syne', sans-serif" }}>
          <Plus size={16} /> Add User
        </Button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['all', 'tutor', 'student'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: filter === tab ? 600 : 400,
              background: filter === tab ? '#1F1F1F' : '#E4E7EC',
              color: filter === tab ? '#F0F2F5' : '#4A4F5A',
              transition: 'all 0.15s',
              textTransform: 'capitalize',
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {tab} {tab === 'all' ? `(${users.length})` : `(${users.filter((u) => u.role === tab).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #D5D9E1', boxShadow: '0 1px 4px rgba(31,31,31,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #D5D9E1', background: '#F0F2F5' }}>
              {['Name', 'Email', 'Role', 'Created', 'Actions'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#4A4F5A', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Syne', sans-serif" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#8A9099', fontSize: 14, fontFamily: "'Syne', sans-serif" }}>
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((user, i) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #E4E7EC' : 'none',
                    opacity: user.active ? 1 : 0.55,
                  }}
                >
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}>{user.name}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: '#4A4F5A', fontFamily: "'Syne', sans-serif" }}>{user.email}</td>
                  <td style={{ padding: '14px 20px' }}>{roleBadge(user.role, user.active)}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => { setEditUser(user); setEditForm({ name: user.name, email: user.email, role: user.role }); }}
                        title="Edit"
                        style={{ background: '#E4E7EC', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#1F1F1F' }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        title={user.active ? 'Deactivate' : 'Reactivate'}
                        style={{ background: '#E4E7EC', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: user.active ? '#E0A6AF' : '#8BB5AE' }}
                      >
                        {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button
                        onClick={() => setDeleteUser(user)}
                        title="Delete"
                        style={{ background: '#FEF2F2', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#EF4444' }}
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
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif" }}>Add User</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <Label htmlFor="add-name">Full Name</Label>
              <Input id="add-name" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="add-email">Email</Label>
              <Input id="add-email" type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="add-password">Password</Label>
              <Input id="add-password" type="password" value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="mt-1" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={addForm.role} onValueChange={(v) => setAddForm((f) => ({ ...f, role: v ?? 'student' }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving} style={{ background: '#1F1F1F', color: '#F0F2F5', fontFamily: "'Syne', sans-serif" }}>
              {saving ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif" }}>Edit User</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <Label htmlFor="edit-name">Full Name</Label>
              <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v ?? f.role }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving} style={{ background: '#1F1F1F', color: '#F0F2F5', fontFamily: "'Syne', sans-serif" }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif" }}>Delete User?</DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: 14, color: '#4A4F5A', marginTop: 8, fontFamily: "'Syne', sans-serif" }}>
            This will permanently delete <strong>{deleteUser?.name}</strong> and all their associated data. This cannot be undone.
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
