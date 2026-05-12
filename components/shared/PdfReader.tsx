'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  url: string;
  title?: string;
}

export default function PdfReader({ url, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (renderedRef.current) return;
    renderedRef.current = true;

    let cancelled = false;

    async function render() {
      if (!containerRef.current) return;
      try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerUrl = new URL(
          `pdfjs-dist/build/pdf.worker.min.mjs`,
          import.meta.url,
        ).toString();
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;

        setPageCount(pdf.numPages);

        const container = containerRef.current;
        container.innerHTML = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break;

          const page = await pdf.getPage(pageNum);
          const containerWidth = container.clientWidth || 800;
          const viewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / viewport.width;
          const scaled = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = scaled.width;
          canvas.height = scaled.height;
          canvas.style.display = 'block';
          canvas.style.width = '100%';
          canvas.style.height = 'auto';

          if (pageNum > 1) {
            const divider = document.createElement('div');
            divider.style.cssText = 'height:1px;background:rgba(0,0,0,0.08);margin:0';
            container.appendChild(divider);
          }

          container.appendChild(canvas);

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, canvas, viewport: scaled }).promise;
        }

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) { setLoading(false); setError(true); }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid var(--fog)',
        background: 'var(--frost)',
        borderRadius: '14px 14px 0 0',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)', fontFamily: "'Syne', sans-serif" }}>
          {title || 'Instructions'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!loading && pageCount > 0 && (
            <span style={{ fontSize: 11, color: 'var(--mist)', fontFamily: "'Syne', sans-serif" }}>
              {pageCount} {pageCount === 1 ? 'page' : 'pages'}
            </span>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--mist)',
              textDecoration: 'none',
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid var(--fog)',
              fontFamily: "'Syne', sans-serif",
              transition: 'color 0.1s',
            }}
          >
            Open PDF ↗
          </a>
        </div>
      </div>

      {/* Canvas container */}
      <div style={{
        position: 'relative',
        background: '#f5f5f0',
        borderRadius: '0 0 14px 14px',
        overflow: 'hidden',
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
            zIndex: 1,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28,
                height: 28,
                border: '2.5px solid var(--fog)',
                borderTopColor: 'var(--sky-deeper)',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              <span style={{ fontSize: 12, color: 'var(--mist)', fontFamily: "'Syne', sans-serif" }}>
                Loading instructions…
              </span>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
            flexDirection: 'column',
            gap: 10,
          }}>
            <span style={{ fontSize: 13, color: 'var(--mist)', fontFamily: "'Syne', sans-serif" }}>
              Could not load PDF.
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--sky-deeper)', fontFamily: "'Syne', sans-serif" }}
            >
              Open directly ↗
            </a>
          </div>
        )}

        <div
          ref={containerRef}
          style={{
            width: '100%',
            minHeight: loading ? 320 : undefined,
            lineHeight: 0,
          }}
        />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
