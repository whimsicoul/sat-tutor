'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { ActPage, ActBubble, ActAnswerKeyEntry } from './page';

type Section = 'english' | 'math' | 'reading' | 'science';
type AdminTab = 'pages' | 'bubbles' | 'answerkey';

const SECTIONS: { value: Section; label: string; questions: number }[] = [
  { value: 'english', label: 'English', questions: 75 },
  { value: 'math', label: 'Math', questions: 60 },
  { value: 'reading', label: 'Reading', questions: 40 },
  { value: 'science', label: 'Science', questions: 40 },
];

const CHOICES_FOR_QUESTION = (qNum: number) =>
  qNum % 2 === 1 ? ['A', 'B', 'C', 'D'] : ['F', 'G', 'H', 'J'];

interface Props {
  initialPages: ActPage[];
  initialBubbles: ActBubble[];
  initialAnswerKey: ActAnswerKeyEntry[];
}

export default function AdminActTestClient({ initialPages, initialBubbles, initialAnswerKey }: Props) {
  const [tab, setTab] = useState<AdminTab>('pages');
  const [section, setSection] = useState<Section>('english');
  const [pages, setPages] = useState<ActPage[]>(initialPages);
  const [bubbles, setBubbles] = useState<ActBubble[]>(initialBubbles);
  const [answerKey, setAnswerKey] = useState<ActAnswerKeyEntry[]>(initialAnswerKey);

  // Page upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bubble placement state
  const [placingBubble, setPlacingBubble] = useState<{
    questionNumber: number;
    choice: string;
  } | null>(null);
  const [activeBubblePage, setActiveBubblePage] = useState<number>(1);

  // Answer key edit state
  const [keyEdits, setKeyEdits] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState(false);

  const sectionPages = pages.filter(p => p.section === section).sort((a, b) => a.page_number - b.page_number);
  const sectionBubbles = bubbles.filter(b => b.section === section);
  const sectionKey = answerKey.filter(k => k.section === section);
  const sectionInfo = SECTIONS.find(s => s.value === section)!;

  // --- Page Upload ---
  async function handlePageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const pageNumberMatch = file.name.match(/(\d+)/);
        if (!pageNumberMatch) {
          toast.error(`Could not parse page number from filename: ${file.name}`);
          continue;
        }
        const pageNumber = parseInt(pageNumberMatch[1], 10);

        // Upload to uploadthing via our pages API
        const fd = new FormData();
        fd.append('file', file);
        fd.append('section', section);
        fd.append('pageNumber', String(pageNumber));

        const res = await fetch('/api/admin/act-test/pages/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          const err = await res.json();
          toast.error(`Failed to upload page ${pageNumber}: ${err.error}`);
          continue;
        }
        const { page } = await res.json();
        setPages(prev => {
          const filtered = prev.filter(p => !(p.section === section && p.page_number === pageNumber));
          return [...filtered, page];
        });
        toast.success(`Uploaded page ${pageNumber}`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeletePage(pageId: string, pageNumber: number) {
    if (!confirm(`Delete page ${pageNumber} of ${section}?`)) return;
    const res = await fetch('/api/admin/act-test/pages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pageId }),
    });
    if (!res.ok) { toast.error('Failed to delete page'); return; }
    setPages(prev => prev.filter(p => p.id !== pageId));
    toast.success('Page deleted');
  }

  // --- Bubble Placement ---
  const handleImageClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    if (!placingBubble) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    const res = await fetch('/api/admin/act-test/bubbles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section,
        pageNumber,
        questionNumber: placingBubble.questionNumber,
        choice: placingBubble.choice,
        xPercent,
        yPercent,
      }),
    });
    if (!res.ok) { toast.error('Failed to place bubble'); return; }
    const { bubble } = await res.json();
    setBubbles(prev => {
      const filtered = prev.filter(
        b => !(b.section === section && b.question_number === placingBubble.questionNumber && b.choice === placingBubble.choice)
      );
      return [...filtered, bubble];
    });
    toast.success(`Placed ${placingBubble.choice} for Q${placingBubble.questionNumber}`);
  }, [placingBubble, section]);

  async function handleDeleteBubble(bubbleId: string) {
    const res = await fetch('/api/admin/act-test/bubbles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bubbleId }),
    });
    if (!res.ok) { toast.error('Failed to delete bubble'); return; }
    setBubbles(prev => prev.filter(b => b.id !== bubbleId));
    toast.success('Bubble removed');
  }

  // --- Answer Key ---
  function getKeyValue(qNum: number): string {
    const editKey = `${section}-${qNum}`;
    if (editKey in keyEdits) return keyEdits[editKey];
    return sectionKey.find(k => k.question_number === qNum)?.correct_answer ?? '';
  }

  function handleKeyEdit(qNum: number, value: string) {
    setKeyEdits(prev => ({ ...prev, [`${section}-${qNum}`]: value.toUpperCase().slice(0, 1) }));
  }

  async function handleSaveAnswerKey() {
    const entries: { section: string; question_number: number; correct_answer: string }[] = [];
    for (let q = 1; q <= sectionInfo.questions; q++) {
      const val = getKeyValue(q);
      if (val) entries.push({ section, question_number: q, correct_answer: val });
    }
    if (!entries.length) { toast.error('No answers to save'); return; }
    setSavingKey(true);
    try {
      const res = await fetch('/api/admin/act-test/answer-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) { toast.error('Failed to save answer key'); return; }
      setAnswerKey(prev => {
        const filtered = prev.filter(k => k.section !== section);
        return [...filtered, ...entries];
      });
      setKeyEdits(prev => {
        const next = { ...prev };
        for (let q = 1; q <= sectionInfo.questions; q++) delete next[`${section}-${q}`];
        return next;
      });
      toast.success(`Saved ${entries.length} answers for ${sectionInfo.label}`);
    } finally {
      setSavingKey(false);
    }
  }

  const pageForBubblePlacement = sectionPages.find(p => p.page_number === activeBubblePage);
  const bubblesOnActivePage = sectionBubbles.filter(b => b.page_number === activeBubblePage);

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 8 }}>
        ACT Test Management
      </h1>
      <p style={{ color: 'var(--mist)', fontSize: 14, marginBottom: 28 }}>
        Upload page images, place answer bubbles, and manage the answer key.
      </p>

      {/* Section selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {SECTIONS.map(s => (
          <button
            key={s.value}
            onClick={() => setSection(s.value)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: section === s.value ? '2px solid var(--rose)' : '1px solid var(--fog)',
              background: section === s.value ? 'rgba(224,166,175,0.14)' : 'var(--white)',
              color: section === s.value ? 'var(--rose-deeper)' : 'var(--slate)',
              fontFamily: "'Syne', sans-serif",
              fontSize: 13,
              fontWeight: section === s.value ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {s.label} ({s.questions}Q)
          </button>
        ))}
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--fog)', marginBottom: 28 }}>
        {(['pages', 'bubbles', 'answerkey'] as AdminTab[]).map(t => {
          const labels: Record<AdminTab, string> = { pages: 'Page Images', bubbles: 'Bubble Placement', answerkey: 'Answer Key' };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--rose)' : '2px solid transparent',
                background: 'transparent',
                color: tab === t ? 'var(--rose-deeper)' : 'var(--mist)',
                fontFamily: "'Syne', sans-serif",
                fontSize: 13,
                fontWeight: tab === t ? 600 : 400,
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* ===== TAB: Page Images ===== */}
      {tab === 'pages' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ color: 'var(--slate)', fontSize: 14 }}>
              {sectionPages.length} page{sectionPages.length !== 1 ? 's' : ''} uploaded for <strong>{sectionInfo.label}</strong>
            </div>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              background: 'var(--rose)',
              color: 'white',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "'Syne', sans-serif",
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.7 : 1,
            }}>
              {uploading ? 'Uploading...' : 'Upload Images'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handlePageUpload}
                disabled={uploading}
              />
            </label>
          </div>
          <p style={{ fontSize: 12, color: 'var(--mist)', marginBottom: 20 }}>
            File names must contain the page number (e.g. <code>page_01.png</code>, <code>english_001.png</code>). Pages are matched by the first number found in the filename.
          </p>
          {sectionPages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mist)', fontSize: 14 }}>
              No pages uploaded yet for {sectionInfo.label}. Upload PNG images to get started.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {sectionPages.map(page => (
                <div key={page.id} style={{ border: '1px solid var(--fog)', borderRadius: 10, overflow: 'hidden', background: 'var(--white)' }}>
                  <div style={{ position: 'relative', paddingTop: '141%', background: '#f5f5f5' }}>
                    <img
                      src={page.image_url}
                      alt={`Page ${page.page_number}`}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--charcoal)', fontFamily: "'Syne', sans-serif" }}>
                      Page {page.page_number}
                    </span>
                    <button
                      onClick={() => handleDeletePage(page.id, page.page_number)}
                      style={{ background: 'none', border: 'none', color: 'var(--mist)', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: Bubble Placement ===== */}
      {tab === 'bubbles' && (
        <div>
          {sectionPages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mist)', fontSize: 14 }}>
              Upload page images first before placing bubbles.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 24 }}>
              {/* Left: controls */}
              <div style={{ width: 260, flexShrink: 0 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--mist)', marginBottom: 6, fontFamily: "'Syne', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>Page</label>
                  <select
                    value={activeBubblePage}
                    onChange={e => setActiveBubblePage(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--fog)', fontFamily: "'Syne', sans-serif", fontSize: 13 }}
                  >
                    {sectionPages.map(p => (
                      <option key={p.id} value={p.page_number}>Page {p.page_number}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--mist)', marginBottom: 6, fontFamily: "'Syne', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Click to place:
                  </label>
                  {placingBubble ? (
                    <div style={{ padding: '10px 12px', background: 'rgba(224,166,175,0.14)', border: '1px solid var(--rose)', borderRadius: 8, fontSize: 13, color: 'var(--rose-deeper)', fontFamily: "'Syne', sans-serif" }}>
                      <strong>Placing Q{placingBubble.questionNumber} choice {placingBubble.choice}</strong>
                      <br />
                      <span style={{ fontSize: 11, color: 'var(--mist)' }}>Click on the image to set position</span>
                      <br />
                      <button
                        onClick={() => setPlacingBubble(null)}
                        style={{ marginTop: 8, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--fog)', background: 'var(--white)', fontSize: 12, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--mist)' }}>Select a question and choice below, then click on the image.</p>
                  )}
                </div>

                {/* Question list for this section */}
                <div style={{ maxHeight: 500, overflowY: 'auto', border: '1px solid var(--fog)', borderRadius: 8 }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--fog)', fontSize: 11, color: 'var(--mist)', fontFamily: "'Syne', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', background: '#fafafa' }}>
                    Questions — {sectionInfo.label}
                  </div>
                  {Array.from({ length: sectionInfo.questions }, (_, i) => i + 1).map(qNum => {
                    const choices = CHOICES_FOR_QUESTION(qNum);
                    const qBubbles = sectionBubbles.filter(b => b.question_number === qNum);
                    const allPlaced = choices.every(c => qBubbles.some(b => b.choice === c));
                    return (
                      <div key={qNum} style={{ padding: '8px 12px', borderBottom: '1px solid var(--fog)', background: allPlaced ? 'rgba(200,240,200,0.3)' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 600, color: 'var(--charcoal)' }}>
                            Q{qNum}
                          </span>
                          {allPlaced && <span style={{ fontSize: 10, color: '#4a9e4a' }}>✓</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {choices.map(c => {
                            const placed = qBubbles.find(b => b.choice === c);
                            const isActive = placingBubble?.questionNumber === qNum && placingBubble?.choice === c;
                            return (
                              <button
                                key={c}
                                onClick={() => setPlacingBubble(isActive ? null : { questionNumber: qNum, choice: c })}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  border: isActive ? '2px solid var(--rose)' : placed ? '1px solid #4a9e4a' : '1px solid var(--fog)',
                                  background: isActive ? 'rgba(224,166,175,0.2)' : placed ? 'rgba(200,240,200,0.4)' : 'var(--white)',
                                  color: isActive ? 'var(--rose-deeper)' : placed ? '#4a9e4a' : 'var(--slate)',
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  fontFamily: "'Syne', sans-serif",
                                }}
                              >
                                {c}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: page image with bubbles */}
              <div style={{ flex: 1 }}>
                {pageForBubblePlacement ? (
                  <div
                    style={{ position: 'relative', display: 'inline-block', cursor: placingBubble ? 'crosshair' : 'default', width: '100%' }}
                    onClick={e => handleImageClick(e, activeBubblePage)}
                  >
                    <img
                      src={pageForBubblePlacement.image_url}
                      alt={`Page ${activeBubblePage}`}
                      style={{ width: '100%', display: 'block', border: placingBubble ? '2px solid var(--rose)' : '1px solid var(--fog)', borderRadius: 8 }}
                      draggable={false}
                    />
                    {bubblesOnActivePage.map(b => (
                      <div
                        key={b.id}
                        style={{
                          position: 'absolute',
                          left: `${b.x_percent}%`,
                          top: `${b.y_percent}%`,
                          transform: 'translate(-50%, -50%)',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'rgba(224,100,120,0.7)',
                          border: '2px solid var(--rose-deeper)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 8,
                          color: 'white',
                          fontWeight: 700,
                          cursor: 'pointer',
                          zIndex: 10,
                          pointerEvents: 'all',
                        }}
                        title={`Q${b.question_number} ${b.choice} — click to remove`}
                        onClick={e => { e.stopPropagation(); handleDeleteBubble(b.id); }}
                      >
                        {b.choice}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 48, textAlign: 'center', color: 'var(--mist)', fontSize: 14, border: '1px dashed var(--fog)', borderRadius: 8 }}>
                    No image for page {activeBubblePage}. Upload it in the Page Images tab.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: Answer Key ===== */}
      {tab === 'answerkey' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ color: 'var(--slate)', fontSize: 14 }}>
              Enter the correct answer for each question in <strong>{sectionInfo.label}</strong>.
              Odd questions use A/B/C/D; even questions use F/G/H/J.
            </p>
            <button
              onClick={handleSaveAnswerKey}
              disabled={savingKey}
              style={{
                padding: '9px 20px',
                background: 'var(--rose)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "'Syne', sans-serif",
                cursor: savingKey ? 'not-allowed' : 'pointer',
                opacity: savingKey ? 0.7 : 1,
                flexShrink: 0,
              }}
            >
              {savingKey ? 'Saving...' : 'Save Answer Key'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
            {Array.from({ length: sectionInfo.questions }, (_, i) => i + 1).map(qNum => {
              const choices = CHOICES_FOR_QUESTION(qNum);
              const val = getKeyValue(qNum);
              const isDirty = `${section}-${qNum}` in keyEdits;
              return (
                <div key={qNum} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--mist)', marginBottom: 4, fontFamily: "'Syne', sans-serif" }}>Q{qNum}</div>
                  <select
                    value={val}
                    onChange={e => handleKeyEdit(qNum, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 4px',
                      borderRadius: 6,
                      border: isDirty ? '1px solid var(--rose)' : val ? '1px solid #4a9e4a' : '1px solid var(--fog)',
                      fontFamily: "'Syne', sans-serif",
                      fontSize: 13,
                      background: isDirty ? 'rgba(224,166,175,0.1)' : val ? 'rgba(200,240,200,0.2)' : 'var(--white)',
                      color: 'var(--charcoal)',
                      textAlign: 'center',
                    }}
                  >
                    <option value="">—</option>
                    {choices.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(200,240,200,0.2)', borderRadius: 8, border: '1px solid rgba(74,158,74,0.2)' }}>
            <span style={{ fontSize: 13, color: '#4a9e4a', fontFamily: "'Syne', sans-serif" }}>
              {sectionKey.length}/{sectionInfo.questions} answers saved
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
