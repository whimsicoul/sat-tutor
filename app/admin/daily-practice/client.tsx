'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Upload, Trash2, Coffee, BarChart2, FileText, CheckCircle2, X, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { DailyPractice } from './page';

// ── Crop sub-components (mirrors crop-review page) ────────────────────────────

function CroppedPreview({ imageUrl, imageWidthPx, imageHeightPx, cropTop, cropBottom }: {
  imageUrl: string;
  imageWidthPx: number;
  imageHeightPx: number;
  cropTop: number;
  cropBottom: number;
}) {
  const w = imageWidthPx || 1836;
  const h = imageHeightPx || 1134;
  const top = Math.max(0, cropTop);
  const bottom = Math.max(0, cropBottom);
  const visibleHeight = Math.max(1, h - top - bottom);
  return (
    <div
      className="w-full rounded border overflow-hidden relative"
      style={{ borderColor: 'var(--fog)', aspectRatio: `${w} / ${visibleHeight}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Cropped preview"
        className="absolute left-0 w-full"
        style={{ top: 0, transform: `translateY(-${(top / h * 100).toFixed(4)}%)` }}
      />
    </div>
  );
}

function FullImageWithLines({ imageUrl, imageHeightPx, cropTop, cropBottom }: {
  imageUrl: string;
  imageHeightPx: number;
  cropTop: number;
  cropBottom: number;
}) {
  const h = imageHeightPx || 1134;
  const topPct = (Math.max(0, cropTop) / h * 100).toFixed(2) + '%';
  const bottomPct = (Math.max(0, cropBottom) / h * 100).toFixed(2) + '%';
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Full image" style={{ width: '100%', display: 'block', borderRadius: 4 }} />
      <div style={{ position: 'absolute', top: topPct, left: 0, right: 0, height: 2, background: 'rgba(77,143,174,0.85)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: bottomPct, left: 0, right: 0, height: 2, background: 'rgba(224,166,175,0.85)', pointerEvents: 'none' }} />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedRow {
  external_id: string;
  category: string;
  skill: string;
  difficulty: string;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
}

interface CsvRow {
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  category?: string;
  skill?: string;
  difficulty?: string;
  external_id?: string;
}

interface EditDraft {
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  answer_explanation: string;
  category: string;
  skill: string;
  difficulty: string;
}

// ── CSV parser (robust quoted-field handling) ─────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      result.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/"/g, ''));
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])) as unknown as CsvRow;
  });
}

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminDailyPracticeClient({
  problems: initial,
}: {
  problems: DailyPractice[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<DailyPractice[]>(initial);

  // Upload / parse state
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [skipped, setSkipped] = useState<{ external_id: string; reason: string }[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Math' | 'Reading and Writing'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [detailProblem, setDetailProblem] = useState<DailyPractice | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);

  // Crop state (for math image problems in edit mode)
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [savingCrop, setSavingCrop] = useState(false);

  // ── File handler: routes PDF → parse-pdf API, CSV → local parse ───────────

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (file.name.toLowerCase().endsWith('.pdf')) {
      await handlePdf(file);
    } else if (file.name.toLowerCase().endsWith('.csv')) {
      handleCsv(file);
    } else {
      toast.error('Please upload a PDF or CSV file.');
    }
  }

  async function handlePdf(file: File) {
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/daily-practice/parse-pdf', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || 'Parse failed');
      const data = await res.json();
      setPreview(data.rows);
      setSkipped(data.skipped ?? []);
      toast.success(`Parsed ${data.rows.length} questions from PDF.${data.skipped?.length ? ` (${data.skipped.length} skipped)` : ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PDF parse failed');
    } finally {
      setParsing(false);
    }
  }

  async function handleCsv(file: File) {
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) { toast.error('No data rows found in CSV.'); return; }
    const invalid = rows.findIndex(
      (r) => !r.question || !r.choice_a || !r.choice_b || !r.choice_c || !r.choice_d ||
             !r.correct_answer || !VALID_ANSWERS.has(r.correct_answer.toUpperCase())
    );
    if (invalid !== -1) {
      toast.error(`Row ${invalid + 2} is invalid. Check all fields and that correct_answer is A–D.`);
      return;
    }
    setPreview(rows as unknown as ParsedRow[]);
    setSkipped([]);
    toast.success(`Loaded ${rows.length} questions from CSV — review and confirm below.`);
  }

  // ── Confirm: POST preview rows to the DB ──────────────────────────────────

  async function confirmUpload() {
    if (!preview) return;
    setUploading(true);
    try {
      const res = await fetch('/api/admin/daily-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      const { inserted, total } = await res.json();
      const dupes = total - inserted;
      let msg = `${inserted} question${inserted !== 1 ? 's' : ''} added to the pool.`;
      if (dupes > 0) msg += ` (${dupes} duplicate${dupes !== 1 ? 's' : ''} skipped)`;
      toast.success(msg);
      setPreview(null);
      setSkipped([]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // ── Filter helpers ────────────────────────────────────────────────────────

  const difficulties = preview
    ? [...new Set(preview.map((r) => r.difficulty).filter(Boolean))]
    : [...new Set(problems.map((p) => p.difficulty ?? undefined).filter(Boolean))];

  const filteredPreview = preview?.filter((r) => {
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (difficultyFilter !== 'all' && r.difficulty !== difficultyFilter) return false;
    return true;
  });

  const filteredProblems = problems.filter((p) => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (difficultyFilter !== 'all' && (p.difficulty ?? undefined) !== difficultyFilter) return false;
    return true;
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this problem? Students who have already been assigned it keep their records.')) return;
    const res = await fetch(`/api/admin/daily-practice/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed.'); return; }
    setProblems((prev) => prev.filter((p) => p.id !== id));
    toast.success('Problem deleted.');
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function enterEditMode() {
    if (!detailProblem) return;
    setDraft({
      question:           detailProblem.question,
      choice_a:           detailProblem.choice_a,
      choice_b:           detailProblem.choice_b,
      choice_c:           detailProblem.choice_c,
      choice_d:           detailProblem.choice_d,
      correct_answer:     detailProblem.correct_answer,
      answer_explanation: detailProblem.answer_explanation ?? '',
      category:           detailProblem.category ?? '',
      skill:              detailProblem.skill ?? '',
      difficulty:         detailProblem.difficulty ?? '',
    });
    setCropTop(detailProblem.crop_top_px ?? 0);
    setCropBottom(detailProblem.crop_bottom_px ?? 0);
    setIsEditing(true);
  }

  async function handleSaveCrop() {
    if (!detailProblem) return;
    setSavingCrop(true);
    try {
      const res = await fetch(`/api/admin/daily-practice/${detailProblem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop_top_px: cropTop, crop_bottom_px: cropBottom }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      const updated = await res.json();
      setProblems((prev) => prev.map((p) => p.id === detailProblem.id ? { ...p, ...updated } : p));
      setDetailProblem((prev) => prev ? { ...prev, ...updated } : prev);
      toast.success('Crop saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingCrop(false);
    }
  }

  async function handleSave() {
    if (!detailProblem || !draft) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        ...draft,
        answer_explanation: draft.answer_explanation || null,
        category:   draft.category   || null,
        skill:      draft.skill      || null,
        difficulty: draft.difficulty || null,
      };
      const res = await fetch(`/api/admin/daily-practice/${detailProblem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      const updated = await res.json();
      setProblems((prev) => prev.map((p) => p.id === detailProblem.id ? { ...p, ...updated } : p));
      setDetailProblem((prev) => prev ? { ...prev, ...updated } : prev);
      setIsEditing(false);
      setDraft(null);
      toast.success('Problem updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const mathCount = problems.filter((p) => p.category === 'Math').length;
  const rwCount = problems.filter((p) => p.category === 'Reading and Writing').length;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--charcoal)' }}
          >
            Question Bank
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--mist)' }}>
            {problems.length} problem{problems.length !== 1 ? 's' : ''} total
            {mathCount > 0 && ` · ${mathCount} Math`}
            {rwCount > 0 && ` · ${rwCount} R&W`}
            {' · 5 auto-assigned to students each day'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/daily-practice/results">
            <Button variant="outline" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              View Results
            </Button>
          </Link>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing || uploading}
            className="flex items-center gap-2"
            style={{ background: 'var(--sky-deeper)', color: 'white', border: 'none' }}
          >
            {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {parsing ? 'Parsing PDF…' : 'Upload PDF or CSV'}
          </Button>
        </div>
      </div>

      {/* ── Format hint ────────────────────────────────────────────────────── */}
      <div
        className="rounded-lg px-4 py-3 text-xs"
        style={{ background: 'var(--frost)', border: '1px solid var(--fog)', color: 'var(--slate)' }}
      >
        <strong>PDF:</strong> Upload a MyPractice Question Bank export — questions are auto-parsed.
        &nbsp;&nbsp;
        <strong>CSV columns:</strong> external_id, category, skill, difficulty, question, choice_a–d, correct_answer
      </div>

      {/* ── Preview panel ───────────────────────────────────────────────────── */}
      {preview && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '2px solid var(--sky-deeper)' }}
        >
          {/* Preview header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'rgba(77,143,174,0.08)', borderBottom: '1px solid rgba(77,143,174,0.2)' }}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: 'var(--sky-deeper)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>
                Preview — {preview.length} question{preview.length !== 1 ? 's' : ''} ready to import
              </span>
              {skipped.length > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ background: '#FEF3C7', color: '#92400E' }}
                >
                  {skipped.length} skipped
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setPreview(null); setSkipped([]); }}
                className="text-xs flex items-center gap-1"
                style={{ color: 'var(--mist)' }}
              >
                <X className="h-3.5 w-3.5" /> Discard
              </button>
              <Button
                onClick={confirmUpload}
                disabled={uploading}
                className="flex items-center gap-2 text-sm"
                style={{ background: 'var(--sky-deeper)', color: 'white', border: 'none' }}
              >
                {uploading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…</>
                  : <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm Import</>
                }
              </Button>
            </div>
          </div>

          {/* Category breakdown */}
          {(() => {
            const m = preview.filter((r) => r.category === 'Math').length;
            const rw = preview.filter((r) => r.category === 'Reading and Writing').length;
            return (
              <div
                className="flex gap-4 px-4 py-2 text-xs"
                style={{ background: 'var(--frost)', borderBottom: '1px solid var(--fog)', color: 'var(--slate)' }}
              >
                {m > 0 && <span><strong>{m}</strong> Math</span>}
                {rw > 0 && <span><strong>{rw}</strong> Reading &amp; Writing</span>}
                {['Easy', 'Medium', 'Hard'].map((d) => {
                  const n = preview.filter((r) => r.difficulty === d).length;
                  return n > 0 ? <span key={d}><strong>{n}</strong> {d}</span> : null;
                })}
              </div>
            );
          })()}

          {/* Preview table */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: 'var(--frost)', borderBottom: '1px solid var(--fog)' }}>
                  {['#', 'Question', 'Category', 'Skill', 'Difficulty', 'Answer'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--mist)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(filteredPreview ?? preview).map((r, i) => (
                  <tr key={r.external_id || i} style={{ borderBottom: '1px solid var(--fog)' }}>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--mist)' }}>{i + 1}</td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--charcoal)', maxWidth: 380 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                        {r.question}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--slate)', whiteSpace: 'nowrap' }}>{r.category}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--slate)' }}>{r.skill || '—'}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>
                      {r.difficulty && (
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            background: r.difficulty === 'Easy' ? '#D1FAE5' : r.difficulty === 'Hard' ? '#FEE2E2' : '#FEF3C7',
                            color: r.difficulty === 'Easy' ? '#065F46' : r.difficulty === 'Hard' ? '#991B1B' : '#92400E',
                          }}
                        >
                          {r.difficulty}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{ background: 'rgba(77,143,174,0.12)', color: 'var(--sky-deeper)', border: '1px solid rgba(77,143,174,0.22)' }}
                      >
                        {r.correct_answer}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      {!preview && problems.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--mist)' }}>Filter:</span>
          {(['all', 'Math', 'Reading and Writing'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="text-xs px-3 py-1 rounded-full transition-all"
              style={{
                background: categoryFilter === cat ? 'var(--sky-deeper)' : 'var(--frost)',
                color: categoryFilter === cat ? 'white' : 'var(--slate)',
                border: '1px solid ' + (categoryFilter === cat ? 'var(--sky-deeper)' : 'var(--fog)'),
              }}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
          {difficulties.length > 0 && (
            <>
              <span className="text-xs" style={{ color: 'var(--fog)' }}>|</span>
              {(['all', ...difficulties] as string[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficultyFilter(d)}
                  className="text-xs px-3 py-1 rounded-full transition-all"
                  style={{
                    background: difficultyFilter === d ? 'var(--charcoal)' : 'var(--frost)',
                    color: difficultyFilter === d ? 'white' : 'var(--slate)',
                    border: '1px solid ' + (difficultyFilter === d ? 'var(--charcoal)' : 'var(--fog)'),
                  }}
                >
                  {d === 'all' ? 'All Difficulties' : d}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Problem pool table ──────────────────────────────────────────────── */}
      {!preview && (
        <div className="portal-card overflow-hidden p-0">
          {problems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'var(--sky-ultra)', border: '1px solid rgba(168,203,222,0.25)' }}
              >
                <Coffee className="h-5 w-5" style={{ color: 'var(--sky-deeper)' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--charcoal)' }}>No problems yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--mist)' }}>
                Upload a MyPractice PDF or CSV to build the question bank.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--fog)' }}>
                  {['Question', 'Category', 'Skill', 'Difficulty', 'Answer', 'Added', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--mist)',
                        background: 'var(--frost)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProblems.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => setDetailProblem(p)}
                    style={{ borderBottom: i < filteredProblems.length - 1 ? '1px solid var(--fog)' : 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--frost)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--charcoal)', maxWidth: 380 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                        {p.question}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--slate)', whiteSpace: 'nowrap' }}>
                      {p.category ?? <span style={{ color: 'var(--cloud)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--slate)' }}>
                      {p.skill ?? <span style={{ color: 'var(--cloud)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12 }}>
                      {p.difficulty ? (
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            background: p.difficulty === 'Easy' ? '#D1FAE5' : p.difficulty === 'Hard' ? '#FEE2E2' : '#FEF3C7',
                            color: p.difficulty === 'Easy' ? '#065F46' : p.difficulty === 'Hard' ? '#991B1B' : '#92400E',
                          }}
                        >
                          {p.difficulty}
                        </span>
                      ) : <span style={{ color: 'var(--cloud)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ background: 'rgba(77,143,174,0.12)', color: 'var(--sky-deeper)', border: '1px solid rgba(77,143,174,0.22)' }}
                      >
                        {p.correct_answer}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--slate)' }}>
                      {format(new Date(p.created_at), 'MMM d, yyyy')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded transition-all"
                        style={{ background: 'transparent', border: 'none', color: 'var(--cloud)', cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#991B1B'; e.currentTarget.style.background = '#FEE2E2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cloud)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Dialog
        open={detailProblem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailProblem(null);
            setIsEditing(false);
            setDraft(null);
          }
        }}
      >
        <DialogContent style={{ maxWidth: detailProblem?.question_image_url && detailProblem?.category === 'Math' ? 960 : 560 }}>
          {detailProblem && (
            <>
              <DialogHeader>
                <DialogTitle>Problem Detail</DialogTitle>
                <div className="flex flex-wrap gap-2 mt-1">
                  {detailProblem.category && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--frost)', color: 'var(--slate)', border: '1px solid var(--fog)' }}>
                      {detailProblem.category}
                    </span>
                  )}
                  {detailProblem.skill && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--frost)', color: 'var(--slate)', border: '1px solid var(--fog)' }}>
                      {detailProblem.skill}
                    </span>
                  )}
                  {detailProblem.difficulty && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{
                      background: detailProblem.difficulty === 'Easy' ? '#D1FAE5' : detailProblem.difficulty === 'Hard' ? '#FEE2E2' : '#FEF3C7',
                      color: detailProblem.difficulty === 'Easy' ? '#065F46' : detailProblem.difficulty === 'Hard' ? '#991B1B' : '#92400E',
                    }}>
                      {detailProblem.difficulty}
                    </span>
                  )}
                  {detailProblem.external_id && (
                    <span className="text-xs" style={{ color: 'var(--mist)' }}>ID: {detailProblem.external_id}</span>
                  )}
                </div>
              </DialogHeader>

              {/* ── View mode ─── */}
              {!isEditing && (() => {
                const isMathImage = detailProblem.category === 'Math' && !!detailProblem.question_image_url;
                return (
                  <>
                    {isMathImage ? (
                      // Math image problem: show cropped preview prominently
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--mist)', fontFamily: "'Syne', sans-serif" }}>
                          Student view (cropped)
                        </p>
                        <CroppedPreview
                          imageUrl={detailProblem.question_image_url!}
                          imageWidthPx={detailProblem.image_width_px ?? 1836}
                          imageHeightPx={detailProblem.image_height_px ?? 1134}
                          cropTop={detailProblem.crop_top_px ?? 0}
                          cropBottom={detailProblem.crop_bottom_px ?? 0}
                        />
                        <p className="text-xs mt-2" style={{ color: 'var(--mist)' }}>
                          Crop: top {detailProblem.crop_top_px ?? 0}px · bottom {detailProblem.crop_bottom_px ?? 0}px
                          &nbsp;·&nbsp;Image: {detailProblem.image_width_px ?? '?'} × {detailProblem.image_height_px ?? '?'} px
                        </p>
                      </div>
                    ) : (
                      // Text-based problem: show question and choices as before
                      <>
                        {detailProblem.question_image_url && (() => {
                          const w = detailProblem.image_width_px || 1836;
                          const h = detailProblem.image_height_px || 1134;
                          const top = detailProblem.crop_top_px || 0;
                          const bottom = detailProblem.crop_bottom_px || 0;
                          const visibleHeight = Math.max(1, h - top - bottom);
                          return (
                            <div
                              className="w-full rounded-md border overflow-hidden relative"
                              style={{ borderColor: 'var(--fog)', aspectRatio: `${w} / ${visibleHeight}` }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={detailProblem.question_image_url!}
                                alt="Problem"
                                className="absolute left-0 w-full"
                                style={{ top: 0, transform: `translateY(-${(top / h * 100).toFixed(4)}%)` }}
                              />
                            </div>
                          );
                        })()}
                        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--charcoal)' }}>
                          {detailProblem.question}
                        </p>
                        <div className="space-y-2">
                          {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                            const key = `choice_${letter.toLowerCase()}` as keyof DailyPractice;
                            const isCorrect = detailProblem.correct_answer === letter;
                            return (
                              <div
                                key={letter}
                                className="flex items-start gap-2 px-3 py-2 rounded-lg text-sm"
                                style={{
                                  background: isCorrect ? 'rgba(22,163,74,0.08)' : 'var(--frost)',
                                  border: isCorrect ? '1px solid rgba(22,163,74,0.35)' : '1px solid var(--fog)',
                                  color: isCorrect ? '#16a34a' : 'var(--charcoal)',
                                  fontWeight: isCorrect ? 600 : 400,
                                }}
                              >
                                <strong>{letter}.</strong>
                                <span className="flex-1">{detailProblem[key] as string}</span>
                                {isCorrect && <span className="text-xs ml-auto shrink-0">Correct</span>}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {detailProblem.answer_explanation && (
                      <div
                        className="rounded-lg px-3 py-2 text-sm"
                        style={{ background: 'var(--frost)', border: '1px solid var(--fog)' }}
                      >
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--slate)' }}>Explanation</p>
                        <p style={{ color: 'var(--charcoal)' }}>{detailProblem.answer_explanation}</p>
                      </div>
                    )}

                    <DialogFooter showCloseButton>
                      <button
                        onClick={enterEditMode}
                        className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md"
                        style={{ color: 'var(--sky-deeper)', background: 'rgba(77,143,174,0.1)', border: '1px solid rgba(77,143,174,0.2)' }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    </DialogFooter>
                  </>
                );
              })()}

              {/* ── Edit mode ─── */}
              {isEditing && draft && (() => {
                const isMathImage = detailProblem.category === 'Math' && !!detailProblem.question_image_url;
                const imageHeightPx = detailProblem.image_height_px ?? 1134;
                const overCropped = cropTop + cropBottom >= imageHeightPx;

                return (
                  <>
                    {isMathImage ? (
                      // ── Math image problem: two-column crop tool + metadata ──
                      <div className="flex gap-5 items-start min-h-0">
                        {/* Left: cropped student view */}
                        <div style={{ flex: '0 0 55%', minWidth: 0 }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--mist)', fontFamily: "'Syne', sans-serif" }}>
                            Student view (cropped)
                          </p>
                          <CroppedPreview
                            imageUrl={detailProblem.question_image_url!}
                            imageWidthPx={detailProblem.image_width_px ?? 1836}
                            imageHeightPx={imageHeightPx}
                            cropTop={cropTop}
                            cropBottom={cropBottom}
                          />
                          {overCropped && (
                            <p className="text-xs mt-2" style={{ color: '#b91c1c' }}>
                              Warning: crop values exceed image height — nothing will be visible.
                            </p>
                          )}
                        </div>

                        {/* Right: full image with lines + crop controls + metadata */}
                        <div style={{ flex: '0 0 45%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--mist)', fontFamily: "'Syne', sans-serif" }}>
                              Full image — blue = top cut, pink = bottom cut
                            </p>
                            <FullImageWithLines
                              imageUrl={detailProblem.question_image_url!}
                              imageHeightPx={imageHeightPx}
                              cropTop={cropTop}
                              cropBottom={cropBottom}
                            />
                          </div>

                          {/* Crop inputs */}
                          <div
                            className="rounded-lg p-3 space-y-3"
                            style={{ background: 'var(--frost)', border: '1px solid var(--fog)' }}
                          >
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
                              Crop Controls
                            </p>
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--slate)' }}>Top (px)</label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={cropTop}
                                  onChange={(e) => setCropTop(Math.max(0, parseInt(e.target.value) || 0))}
                                  style={{ borderLeft: '3px solid rgba(77,143,174,0.7)' }}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--slate)' }}>Bottom (px)</label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={cropBottom}
                                  onChange={(e) => setCropBottom(Math.max(0, parseInt(e.target.value) || 0))}
                                  style={{ borderLeft: '3px solid rgba(224,166,175,0.9)' }}
                                />
                              </div>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--mist)' }}>
                              Image: {detailProblem.image_width_px ?? '?'} × {imageHeightPx} px
                            </p>
                            <button
                              onClick={handleSaveCrop}
                              disabled={savingCrop || overCropped}
                              className="flex items-center justify-center gap-2 w-full text-sm py-2 rounded-md"
                              style={{
                                background: savingCrop || overCropped ? 'var(--fog)' : 'var(--rose)',
                                color: savingCrop || overCropped ? 'var(--mist)' : 'white',
                                border: 'none',
                                cursor: savingCrop || overCropped ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              {savingCrop && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              {savingCrop ? 'Saving…' : 'Save Crop'}
                            </button>
                          </div>

                          {/* Metadata fields */}
                          <div
                            className="rounded-lg p-3 space-y-3"
                            style={{ background: 'var(--frost)', border: '1px solid var(--fog)' }}
                          >
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
                              Metadata
                            </p>
                            <div>
                              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--slate)' }}>Correct Answer</label>
                              <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={draft.correct_answer}
                                onChange={(e) => setDraft((d) => d ? { ...d, correct_answer: e.target.value } : d)}
                              >
                                {['A', 'B', 'C', 'D'].map((l) => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--slate)' }}>Skill</label>
                              <Input
                                value={draft.skill}
                                onChange={(e) => setDraft((d) => d ? { ...d, skill: e.target.value } : d)}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--slate)' }}>Difficulty</label>
                              <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={draft.difficulty}
                                onChange={(e) => setDraft((d) => d ? { ...d, difficulty: e.target.value } : d)}
                              >
                                <option value="">None</option>
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--slate)' }}>Answer Explanation</label>
                              <Textarea
                                placeholder="Optional explanation shown to tutors…"
                                value={draft.answer_explanation}
                                onChange={(e) => setDraft((d) => d ? { ...d, answer_explanation: e.target.value } : d)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // ── Text-based problem (R&W or plain-text Math): full field set ──
                      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                        <div>
                          <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>Question</label>
                          <Textarea
                            className="mt-1"
                            value={draft.question}
                            onChange={(e) => setDraft((d) => d ? { ...d, question: e.target.value } : d)}
                          />
                        </div>
                        {(['a', 'b', 'c', 'd'] as const).map((letter) => (
                          <div key={letter}>
                            <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>
                              Choice {letter.toUpperCase()}
                            </label>
                            <Input
                              className="mt-1"
                              value={draft[`choice_${letter}` as keyof EditDraft]}
                              onChange={(e) => setDraft((d) => d ? { ...d, [`choice_${letter}`]: e.target.value } : d)}
                            />
                          </div>
                        ))}
                        <div>
                          <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>Correct Answer</label>
                          <select
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={draft.correct_answer}
                            onChange={(e) => setDraft((d) => d ? { ...d, correct_answer: e.target.value } : d)}
                          >
                            {['A', 'B', 'C', 'D'].map((l) => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>Answer Explanation</label>
                          <Textarea
                            className="mt-1"
                            placeholder="Optional explanation shown to tutors…"
                            value={draft.answer_explanation}
                            onChange={(e) => setDraft((d) => d ? { ...d, answer_explanation: e.target.value } : d)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>Category</label>
                          <select
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={draft.category}
                            onChange={(e) => setDraft((d) => d ? { ...d, category: e.target.value } : d)}
                          >
                            <option value="">None</option>
                            <option value="Math">Math</option>
                            <option value="Reading and Writing">Reading and Writing</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>Skill</label>
                          <Input
                            className="mt-1"
                            value={draft.skill}
                            onChange={(e) => setDraft((d) => d ? { ...d, skill: e.target.value } : d)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>Difficulty</label>
                          <select
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={draft.difficulty}
                            onChange={(e) => setDraft((d) => d ? { ...d, difficulty: e.target.value } : d)}
                          >
                            <option value="">None</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <button
                        onClick={() => { setIsEditing(false); setDraft(null); }}
                        disabled={saving}
                        className="text-sm px-4 py-2 rounded-md border"
                        style={{ borderColor: 'var(--fog)', color: 'var(--slate)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="flex items-center gap-2 text-sm px-4 py-2 rounded-md"
                        style={{ background: 'var(--sky-deeper)', color: 'white' }}
                      >
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </DialogFooter>
                  </>
                );
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
