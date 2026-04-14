'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, FileText, Key, ExternalLink } from 'lucide-react';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/lib/uploadthing';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: '#1F1F1F', margin: 0 }}>
            Problem Sets
          </h1>
          <p style={{ color: '#4A4F5A', marginTop: 6, fontSize: 15, fontFamily: "'Syne', sans-serif" }}>
            Upload and assign PDF work to students
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} style={{ background: '#1F1F1F', color: '#F0F2F5', gap: 6, fontFamily: "'Syne', sans-serif" }}>
          <Plus size={16} /> Create Problem Set
        </Button>
      </div>

      {/* Table */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #D5D9E1',
          boxShadow: '0 1px 4px rgba(31,31,31,0.06)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #D5D9E1', background: '#F0F2F5' }}>
              {['Title', 'Student', 'Tutor', 'Files', 'Created'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#4A4F5A', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Syne', sans-serif" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {problemSets.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 48, color: '#8A9099', fontSize: 14, fontFamily: "'Syne', sans-serif" }}>
                  No problem sets yet
                </td>
              </tr>
            ) : (
              problemSets.map((ps, i) => (
                <tr
                  key={ps.id}
                  style={{ borderBottom: i < problemSets.length - 1 ? '1px solid #E4E7EC' : 'none' }}
                >
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}>{ps.title}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: '#4A4F5A', fontFamily: "'Syne', sans-serif" }}>{ps.student_name}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: '#4A4F5A', fontFamily: "'Syne', sans-serif" }}>{ps.tutor_name}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a
                        href={ps.problem_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Problem PDF"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#1F1F1F', textDecoration: 'none', background: '#F0F2F5', padding: '4px 8px', borderRadius: 6, fontFamily: "'Syne', sans-serif" }}
                      >
                        <FileText size={13} /> Problems <ExternalLink size={11} />
                      </a>
                      {ps.answer_pdf_url && (
                        <a
                          href={ps.answer_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Answer Key PDF"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9B4C5A', textDecoration: 'none', background: 'rgba(224,166,175,0.15)', padding: '4px 8px', borderRadius: 6, fontFamily: "'Syne', sans-serif" }}
                        >
                          <Key size={13} /> Answers <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#8A9099', fontFamily: "'Syne', sans-serif" }}>
                    {format(new Date(ps.created_at), 'MMM d, yyyy')}
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
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif" }}>Create Problem Set</DialogTitle>
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
              <Select value={form.tutorId} onValueChange={(v) => setForm((f) => ({ ...f, tutorId: v ?? '' }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select tutor…" /></SelectTrigger>
                <SelectContent>
                  {tutors.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student</Label>
              <Select value={form.studentId} onValueChange={(v) => setForm((f) => ({ ...f, studentId: v ?? '' }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select student…" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
            <Button onClick={handleCreate} disabled={saving} style={{ background: '#1F1F1F', color: '#F0F2F5', fontFamily: "'Syne', sans-serif" }}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
