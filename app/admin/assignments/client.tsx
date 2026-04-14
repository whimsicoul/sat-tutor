'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, User } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Assignment, UserOption } from './page';

export default function AssignmentsClient({
  assignments: initial,
  tutors,
  students,
}: {
  assignments: Assignment[];
  tutors: UserOption[];
  students: UserOption[];
}) {
  const [assignments, setAssignments] = useState<Assignment[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ tutorId: string; studentId: string }>({ tutorId: '', studentId: '' });
  const [saving, setSaving] = useState(false);

  // Group assignments by tutor
  const byTutor = tutors.reduce<Record<string, Assignment[]>>((acc, tutor) => {
    acc[tutor.id] = assignments.filter((a) => a.tutor_id === tutor.id);
    return acc;
  }, {});

  // Get students not yet assigned to a given tutor
  const getAvailableStudents = (tutorId: string) => {
    const assigned = assignments.filter((a) => a.tutor_id === tutorId).map((a) => a.student_id);
    return students.filter((s) => !assigned.includes(s.id));
  };

  async function handleAssign() {
    if (!form.tutorId || !form.studentId) {
      toast.error('Please select both a tutor and a student');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId: form.tutorId, studentId: form.studentId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      const tutor = tutors.find((t) => t.id === form.tutorId)!;
      const student = students.find((s) => s.id === form.studentId)!;

      const newAssignment: Assignment = {
        id: (await res.json())?.id || String(Date.now()),
        tutor_id: form.tutorId,
        tutor_name: tutor.name,
        student_id: form.studentId,
        student_name: student.name,
        created_at: new Date().toISOString(),
      };

      setAssignments((prev) => [...prev, newAssignment]);
      setDialogOpen(false);
      setForm({ tutorId: '', studentId: '' });
      toast.success(`${student.name} assigned to ${tutor.name}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error creating assignment');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string, tutorName: string, studentName: string) {
    try {
      const res = await fetch(`/api/admin/assignments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success(`Removed ${studentName} from ${tutorName}`);
    } catch {
      toast.error('Failed to remove assignment');
    }
  }

  return (
    <div style={{ padding: '40px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
            Assignments
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 15 }}>
            Pair tutors with their students
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} style={{ background: 'var(--navy)', color: '#fff', gap: 6 }}>
          <Plus size={16} /> Assign Tutor
        </Button>
      </div>

      {/* Tutor cards */}
      {tutors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)', fontSize: 15 }}>
          No tutors found. Add tutors in the Users section first.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {tutors.map((tutor) => {
            const tutorAssignments = byTutor[tutor.id] || [];
            return (
              <div
                key={tutor.id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid var(--cream-dark)',
                  boxShadow: '0 1px 4px rgba(18,25,44,0.06)',
                  overflow: 'hidden',
                }}
              >
                {/* Tutor header */}
                <div
                  style={{
                    padding: '18px 20px',
                    borderBottom: '1px solid var(--cream-dark)',
                    background: 'var(--cream)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: 'var(--navy)', color: 'var(--gold)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                    }}
                  >
                    {tutor.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--navy)' }}>{tutor.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {tutorAssignments.length} student{tutorAssignments.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Students */}
                <div style={{ padding: tutorAssignments.length === 0 ? '24px 20px' : '8px 0' }}>
                  {tutorAssignments.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No students assigned yet
                    </div>
                  ) : (
                    tutorAssignments.map((a, i) => (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 20px',
                          borderBottom: i < tutorAssignments.length - 1 ? '1px solid var(--cream-mid)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <User size={14} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: 14, color: 'var(--navy)' }}>{a.student_name}</span>
                        </div>
                        <button
                          onClick={() => handleRemove(a.id, tutor.name, a.student_name)}
                          title="Remove"
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: '#EF4444', padding: '4px 6px', borderRadius: 4,
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Assign Tutor to Student</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <Label>Tutor</Label>
              <Select value={form.tutorId} onValueChange={(v) => setForm({ tutorId: v ?? '', studentId: '' })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a tutor…" />
                </SelectTrigger>
                <SelectContent>
                  {tutors.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student</Label>
              <Select
                value={form.studentId}
                onValueChange={(v) => setForm((f) => ({ ...f, studentId: v ?? '' }))}
                disabled={!form.tutorId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={form.tutorId ? 'Select a student…' : 'Select a tutor first'} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableStudents(form.tutorId).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={saving} style={{ background: 'var(--navy)', color: '#fff' }}>
              {saving ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
