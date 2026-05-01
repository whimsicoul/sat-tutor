'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, FileText, Key, ExternalLink, Pencil } from 'lucide-react';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/lib/uploadthing';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminProblemSet, UserOption } from './page';

interface UploadedFile { url: string; name: string; }

export default function ProblemSetsClient({
  problemSets: initial,
  tutors,
  students,
}: {
  problemSets: AdminProblemSet[];
  tutors: UserOption[];
  students: UserOption[];
}) {
  const [problemSets, setProblemSets] = useState<AdminProblemSet[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ title: '', tutorId: '', studentId: '' });
  const [problemFile, setProblemFile] = useState<UploadedFile | null>(null);
  const [answerFile, setAnswerFile] = useState<UploadedFile | null>(null);

  function resetForm() {
    setForm({ title: '', tutorId: '', studentId: '' });
    setProblemFile(null);
    setAnswerFile(null);
  }

  async function handleCreate() {
    if (!form.title || !form.tutorId || !form.studentId || !problemFile) {
      toast.error('Please fill in all required fields and upload the problem PDF');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/problem-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          tutorId: form.tutorId,
          studentId: form.studentId,
          problemPdfUrl: problemFile.url,
          answerPdfUrl: answerFile?.url,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      const tutor = tutors.find((t) => t.id === form.tutorId)!;
      const student = students.find((s) => s.id === form.studentId)!;
      const created: AdminProblemSet = {
        ...(await res.json()),
        tutor_name: tutor.name,
        student_name: student.name,
      };

      setProblemSets((prev) => [created, ...prev]);
      setDialogOpen(false);
      resetForm();
      toast.success('Problem set created');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error creating problem set');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: 'var(--charcoal)', margin: 0, letterSpacing: '-0.025em' }}>
            Problem Sets
          </h1>
          <p style={{ color: 'var(--slate)', marginTop: 6, fontSize: 15 }}>
            Upload and assign PDF work to students
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="btn-rose"
          style={{ gap: 8 }}
        >
          <Plus size={16} /> Create Problem Set
        </button>
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
              {['Title', 'Student', 'Tutor', 'Files', 'Created', ''].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {problemSets.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--mist)', fontSize: 14 }}>
                  No problem sets yet
                </td>
              </tr>
            ) : (
              problemSets.map((ps, i) => (
                <tr
                  key={ps.id}
                  style={{ borderBottom: i < problemSets.length - 1 ? '1px solid var(--fog)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--frost)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                >
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>{ps.title}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--slate)' }}>{ps.student_name}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--slate)' }}>{ps.tutor_name}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a
                        href={ps.problem_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Problem PDF"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--sky-deeper)', textDecoration: 'none', background: 'rgba(168,203,222,0.14)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(168,203,222,0.3)' }}
                      >
                        <FileText size={13} /> Problems <ExternalLink size={11} />
                      </a>
                      {ps.answer_pdf_url && (
                        <a
                          href={ps.answer_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Answer Key PDF"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--rose-deeper)', textDecoration: 'none', background: 'rgba(224,166,175,0.14)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(224,166,175,0.3)' }}
                        >
                          <Key size={13} /> Answers <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--mist)' }}>
                    {format(new Date(ps.created_at), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <Link
                      href={`/admin/problem-sets/${ps.id}/edit`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--rose-deeper)', textDecoration: 'none', background: 'rgba(224,166,175,0.14)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(224,166,175,0.3)' }}
                    >
                      <Pencil size={12} /> Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent style={{ maxWidth: 500 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>Create Problem Set</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <Label htmlFor="ps-title">Title</Label>
              <Input
                id="ps-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Week 3 — Algebra Practice"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tutor</Label>
              <select
                value={form.tutorId}
                onChange={(e) => setForm((f) => ({ ...f, tutorId: e.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 4, height: 32, padding: '0 8px', borderRadius: 8, border: '1px solid var(--fog)', background: 'transparent', fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
              >
                <option value="">Select tutor…</option>
                {tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Student</Label>
              <select
                value={form.studentId}
                onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: 4, height: 32, padding: '0 8px', borderRadius: 8, border: '1px solid var(--fog)', background: 'transparent', fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
              >
                <option value="">Select student…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Problem PDF upload */}
            <div>
              <Label>Problem PDF <span style={{ color: '#EF4444' }}>*</span></Label>
              {problemFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 12px', background: 'rgba(139,181,174,0.1)', border: '1px solid #8BB5AE', borderRadius: 6, fontSize: 13 }}>
                  <FileText size={14} style={{ color: '#8BB5AE' }} />
                  <span style={{ color: '#1F1F1F', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Syne', sans-serif" }}>{problemFile.name}</span>
                  <button onClick={() => setProblemFile(null)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <UploadButton<OurFileRouter, 'pdfUploader'>
                    endpoint="pdfUploader"
                    onClientUploadComplete={(files) => {
                      if (files[0]) setProblemFile({ url: files[0].ufsUrl ?? files[0].url, name: files[0].name });
                    }}
                    onUploadError={(err) => { toast.error(err.message); }}
                  />
                </div>
              )}
            </div>

            {/* Answer key upload (optional) */}
            <div>
              <Label>Answer Key PDF <span style={{ color: '#8A9099', fontWeight: 400 }}>(optional)</span></Label>
              {answerFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 12px', background: 'rgba(224,166,175,0.1)', border: '1px solid #E0A6AF', borderRadius: 6, fontSize: 13 }}>
                  <Key size={14} style={{ color: '#E0A6AF' }} />
                  <span style={{ color: '#1F1F1F', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Syne', sans-serif" }}>{answerFile.name}</span>
                  <button onClick={() => setAnswerFile(null)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <UploadButton<OurFileRouter, 'pdfUploader'>
                    endpoint="pdfUploader"
                    onClientUploadComplete={(files) => {
                      if (files[0]) setAnswerFile({ url: files[0].ufsUrl ?? files[0].url, name: files[0].name });
                    }}
                    onUploadError={(err) => { toast.error(err.message); }}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} style={{ background: 'var(--rose)', color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif", border: 'none' }}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
