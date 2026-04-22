'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, X, BarChart2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/lib/uploadthing';
import type { TestResultRow, StudentOption } from './page';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  outline: 'none',
  background: 'var(--white)',
  border: '1px solid var(--fog)',
  color: 'var(--charcoal)',
  fontFamily: "'Syne', sans-serif",
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

function roseFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'var(--rose)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(224,166,175,0.15)';
}
function roseBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'var(--fog)';
  e.currentTarget.style.boxShadow = 'none';
}

export default function AdminTestResultsClient({
  results: initial,
  students,
}: {
  results: TestResultRow[];
  students: StudentOption[];
}) {
  const [results, setResults] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState('');
  const [totalScore, setTotalScore] = useState('');
  const [mathScore, setMathScore] = useState('');
  const [rwScore, setRwScore] = useState('');
  const [notes, setNotes] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);

  function resetForm() {
    setStudentId(''); setTestName(''); setTestDate('');
    setTotalScore(''); setMathScore(''); setRwScore(''); setNotes('');
    setPdfUrl(null); setPdfName(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !testName || !testDate) { toast.error('Student, test name, and date are required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/test-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          testName,
          testDate,
          totalScore: totalScore ? parseInt(totalScore) : null,
          mathScore: mathScore ? parseInt(mathScore) : null,
          readingWritingScore: rwScore ? parseInt(rwScore) : null,
          notes: notes || null,
          pdfUrl: pdfUrl || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const newResult: TestResultRow = await res.json();
      setResults((prev) => [newResult, ...prev]);
      resetForm();
      setShowAdd(false);
      toast.success('Test result added.');
    } catch {
      toast.error('Failed to add test result.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/test-results/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setResults((prev) => prev.filter((r) => r.id !== id));
      toast.success('Result deleted.');
    } catch {
      toast.error('Failed to delete result.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div
            style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: 'var(--rose-deeper)', marginBottom: 8,
            }}
          >
            Admin Portal
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 28, fontWeight: 700, color: 'var(--charcoal)', lineHeight: 1.2,
            }}
          >
            Test Results
          </h1>
          <p style={{ fontSize: 14, color: 'var(--slate)', marginTop: 6 }}>
            Upload and manage practice test scores for students.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--rose)', color: 'var(--charcoal)', border: 'none', cursor: 'pointer' }}
        >
          <Plus className="h-4 w-4" />
          Add Result
        </button>
      </div>

      {/* Results table / list */}
      {results.length === 0 ? (
        <div
          className="portal-card flex flex-col items-center justify-center py-20 text-center"
          style={{ maxWidth: 960 }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--rose-ultra)', border: '1px solid rgba(224,166,175,0.25)' }}
          >
            <BarChart2 className="h-6 w-6" style={{ color: 'var(--rose-deeper)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>No test results yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>Click "Add Result" to upload the first one.</p>
        </div>
      ) : (
        <div
          className="portal-card p-0 overflow-hidden"
          style={{ maxWidth: 960 }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--fog)' }}>
                {['Student', 'Test', 'Date', 'Total', 'Math', 'R&W', 'Notes', 'PDF', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.07em', color: 'var(--mist)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: '1px solid var(--fog)' }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--charcoal)', whiteSpace: 'nowrap' }}>
                    {r.student_name}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--charcoal)' }}>{r.test_name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)', whiteSpace: 'nowrap' }}>
                    {format(new Date(r.test_date), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--rose-deeper)' }}>
                    {r.total_score ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--sky-deeper)' }}>
                    {r.math_score ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--sky-deeper)' }}>
                    {r.reading_writing_score ?? '—'}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px', color: 'var(--slate)',
                      maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={r.notes ?? undefined}
                  >
                    {r.notes ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {r.pdf_url ? (
                      <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--rose-deeper)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <FileText size={14} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--fog)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      style={{
                        background: 'none', border: 'none', cursor: deletingId === r.id ? 'not-allowed' : 'pointer',
                        color: 'var(--mist)', padding: 4, borderRadius: 6,
                        opacity: deletingId === r.id ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--rose-deeper)'; e.currentTarget.style.background = 'var(--rose-ultra)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mist)'; e.currentTarget.style.background = 'none'; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); resetForm(); } }}
        >
          <div
            className="portal-card"
            style={{ width: '100%', maxWidth: 520, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(224,166,175,0.2)', border: '1px solid rgba(224,166,175,0.3)' }}
                >
                  <BarChart2 className="h-3.5 w-3.5" style={{ color: 'var(--rose-deeper)' }} />
                </div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                  Add Test Result
                </h2>
              </div>
              <button
                onClick={() => { setShowAdd(false); resetForm(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mist)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              {/* Student */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>
                  Student
                </label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  style={{ ...inputStyle, appearance: 'none' }}
                  onFocus={roseFocus}
                  onBlur={roseBlur}
                >
                  <option value="">Select a student</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Test name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>
                  Test Name
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g. SAT Practice Test 1"
                  required
                  style={inputStyle}
                  onFocus={roseFocus}
                  onBlur={roseBlur}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>
                  Test Date
                </label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={roseFocus}
                  onBlur={roseBlur}
                />
              </div>

              {/* Scores */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>
                    Total
                  </label>
                  <input
                    type="number"
                    value={totalScore}
                    onChange={(e) => setTotalScore(e.target.value)}
                    placeholder="1600"
                    min={0} max={1600}
                    style={inputStyle}
                    onFocus={roseFocus}
                    onBlur={roseBlur}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>
                    Math
                  </label>
                  <input
                    type="number"
                    value={mathScore}
                    onChange={(e) => setMathScore(e.target.value)}
                    placeholder="800"
                    min={0} max={800}
                    style={inputStyle}
                    onFocus={roseFocus}
                    onBlur={roseBlur}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>
                    R&amp;W
                  </label>
                  <input
                    type="number"
                    value={rwScore}
                    onChange={(e) => setRwScore(e.target.value)}
                    placeholder="800"
                    min={0} max={800}
                    style={inputStyle}
                    onFocus={roseFocus}
                    onBlur={roseBlur}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>
                  Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any observations or feedback…"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={roseFocus}
                  onBlur={roseBlur}
                />
              </div>

              {/* PDF Upload */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--mist)' }}>
                  Score Report PDF <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                </label>
                {pdfUrl ? (
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: 'var(--frost)', border: '1px solid var(--fog)' }}
                  >
                    <FileText size={14} style={{ color: 'var(--rose-deeper)', flexShrink: 0 }} />
                    <span className="text-xs flex-1 truncate" style={{ color: 'var(--charcoal)' }}>{pdfName}</span>
                    <button
                      type="button"
                      onClick={() => { setPdfUrl(null); setPdfName(null); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mist)', padding: 0 }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <UploadButton<OurFileRouter, 'pdfUploader'>
                    endpoint="pdfUploader"
                    onClientUploadComplete={(files) => {
                      if (files[0]) {
                        setPdfUrl(files[0].ufsUrl ?? files[0].url);
                        setPdfName(files[0].name);
                      }
                    }}
                    onUploadError={(err) => toast.error(err.message)}
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: saving ? 'var(--fog)' : 'var(--rose)',
                  color: saving ? 'var(--mist)' : 'var(--charcoal)',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save Result'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
