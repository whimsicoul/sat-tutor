'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Highlighter, Pen, Eraser, Trash2, GripVertical } from 'lucide-react';

type Tool = 'highlight' | 'pen' | 'eraser';

interface DraggableAnnotationToolbarProps {
  tool: Tool;
  sliderVal: number;
  strokeCount: number;
  onToolChange: (tool: Tool) => void;
  onSliderChange: (val: number) => void;
  onClearAll: () => void;
}

const TOOLBAR_HEIGHT = 44;

export default function DraggableAnnotationToolbar({
  tool,
  sliderVal,
  strokeCount,
  onToolChange,
  onSliderChange,
  onClearAll,
}: DraggableAnnotationToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  // Start off-screen so we can measure and position to top-right after mount
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Position top-right on mount
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const w = el.offsetWidth || 280;
    setPos({ x: window.innerWidth - w - 16, y: 16 });
  }, []);

  const clamp = useCallback((x: number, y: number) => {
    const el = toolbarRef.current;
    const w = el ? el.offsetWidth : 280;
    const maxX = window.innerWidth - w;
    const maxY = window.innerHeight - TOOLBAR_HEIGHT;
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  }, []);

  const onDragStart = useCallback((clientX: number, clientY: number) => {
    dragging.current = true;
    const el = toolbarRef.current;
    if (!el || pos == null) return;
    dragOffset.current = { x: clientX - pos.x, y: clientY - pos.y };
  }, [pos]);

  const onDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current) return;
    setPos(clamp(clientX - dragOffset.current.x, clientY - dragOffset.current.y));
  }, [clamp]);

  const onDragEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => onDragMove(e.clientX, e.clientY);
    const onMouseUp = () => onDragEnd();
    const onTouchMove = (e: TouchEvent) => { if (dragging.current) { e.preventDefault(); onDragMove(e.touches[0].clientX, e.touches[0].clientY); } };
    const onTouchEnd = () => onDragEnd();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onDragMove, onDragEnd]);

  const toolButtons: { id: Tool; Icon: React.ElementType; title: string }[] = [
    { id: 'highlight', Icon: Highlighter, title: 'Highlight' },
    { id: 'pen',       Icon: Pen,         title: 'Pen' },
    { id: 'eraser',    Icon: Eraser,       title: 'Eraser' },
  ];

  return (
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        top: pos?.y ?? -200,
        left: pos?.x ?? -200,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(255,255,255,0.97)',
        border: '1px solid var(--fog)',
        borderRadius: 24,
        padding: '4px 10px 4px 6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
        userSelect: 'none',
        height: TOOLBAR_HEIGHT,
        boxSizing: 'border-box',
      }}
    >
      {/* Drag handle */}
      <div
        title="Drag to move"
        onMouseDown={(e) => { e.preventDefault(); onDragStart(e.clientX, e.clientY); }}
        onTouchStart={(e) => { e.preventDefault(); onDragStart(e.touches[0].clientX, e.touches[0].clientY); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          color: 'var(--mist, #b0b8c1)',
          padding: '0 2px',
          touchAction: 'none',
        }}
      >
        <GripVertical size={16} />
      </div>

      <div style={{ width: 1, height: 18, background: 'var(--fog)', margin: '0 2px' }} />

      {toolButtons.map(({ id, Icon, title }) => (
        <button
          key={id}
          title={title}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onToolChange(id); }}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            border: tool === id ? '1px solid var(--rose-deeper)' : '1px solid transparent',
            background: tool === id ? 'var(--rose-ultra, #fdf2f4)' : 'transparent',
            cursor: 'pointer',
            color: id === 'highlight' ? '#ca8a04' : 'var(--charcoal)',
            padding: 0,
          }}
        >
          <Icon size={15} />
        </button>
      ))}

      <div style={{ width: 1, height: 18, background: 'var(--fog)', margin: '0 2px' }} />

      <input
        type="range"
        min={1}
        max={10}
        value={sliderVal}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onSliderChange(Number(e.target.value))}
        title="Thickness"
        style={{ width: 64, accentColor: 'var(--rose-deeper)', cursor: 'pointer' }}
      />

      <div style={{ width: 1, height: 18, background: 'var(--fog)', margin: '0 2px' }} />

      <button
        title="Clear all annotations"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClearAll(); }}
        style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          border: '1px solid transparent',
          background: 'transparent',
          cursor: strokeCount > 0 ? 'pointer' : 'default',
          color: strokeCount > 0 ? 'var(--rose-deeper)' : 'var(--cloud)',
          padding: 0,
        }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
