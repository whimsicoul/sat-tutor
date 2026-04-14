'use client';

import { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Download, ExternalLink, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getGoogleCalendarUrl } from '@/lib/calendar';
import type { SessionRow } from './page';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'status-pending',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'status-approved',
  },
  denied: {
    label: 'Declined',
    icon: XCircle,
    className: 'status-denied',
  },
};

export default function StudentScheduleClient({ sessions: initial }: { sessions: SessionRow[] }) {
  const [sessions, setSessions] = useState(initial);

  async function updateStatus(id: string, status: 'approved' | 'denied') {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { toast.error('Failed to update session status.'); return; }
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    toast.success(status === 'approved' ? 'Session approved!' : 'Session declined.');
  }

  async function downloadICS(id: string) {
    const res = await fetch(`/api/sessions/${id}/ics`);
    if (!res.ok) { toast.error('Failed to generate calendar file.'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'session.ics'; a.click();
    URL.revokeObjectURL(url);
  }

  const pending = sessions.filter((s) => s.status === 'pending');
  const others = sessions.filter((s) => s.status !== 'pending');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px w-6" style={{ background: '#C9A84C' }} />
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: '#C9A84C', fontFamily: "'DM Sans', sans-serif" }}
          >
            Student Portal
          </span>
        </div>
        <h1 className="portal-section-title">Schedule</h1>
        <p className="text-sm mt-1" style={{ color: '#4A5568', fontFamily: "'DM Sans', sans-serif" }}>
          Review and respond to proposed tutoring sessions.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="portal-card flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
            style={{ background: '#F8F6F1', border: '1px solid #E0D8CB' }}
          >
            <Calendar className="h-6 w-6" style={{ color: '#C9A84C' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#12192C', fontFamily: "'DM Sans', sans-serif" }}>
            No sessions scheduled yet
          </p>
          <p className="text-xs mt-1" style={{ color: '#8A95A3', fontFamily: "'DM Sans', sans-serif" }}>
            Your tutor will propose sessions here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending — needs action */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: '#C9A84C', fontFamily: "'DM Sans', sans-serif" }}
              >
                Awaiting Your Response ({pending.length})
              </h2>
              {pending.map((s) => {
                const dt = new Date(s.proposed_time);
                return (
                  <div
                    key={s.id}
                    className="portal-card p-5"
                    style={{ borderLeft: '3px solid #C9A84C' }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: '#12192C', fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {format(dt, 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#8A95A3', fontFamily: "'DM Sans', sans-serif" }}>
                          {format(dt, 'h:mm a')} · with {s.tutor_name}
                        </p>
                      </div>
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full status-pending"
                        style={{ fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
                      >
                        Pending
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(s.id, 'approved')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-all"
                        style={{
                          background: '#065F46',
                          color: '#D1FAE5',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(s.id, 'denied')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-all"
                        style={{
                          background: 'transparent',
                          color: '#991B1B',
                          border: '1px solid #FECACA',
                          cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Past / resolved sessions */}
          {others.length > 0 && (
            <div className="space-y-3">
              <h2
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: '#8A95A3', fontFamily: "'DM Sans', sans-serif" }}
              >
                All Sessions
              </h2>
              {others.map((s) => {
                const dt = new Date(s.proposed_time);
                const cfg = STATUS_CONFIG[s.status];
                const Icon = cfg.icon;
                const gcUrl = getGoogleCalendarUrl({
                  title: 'SAT Tutoring Session',
                  start: dt,
                  durationMinutes: 60,
                });

                return (
                  <div key={s.id} className="portal-card p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: '#12192C', fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {format(dt, 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#8A95A3', fontFamily: "'DM Sans', sans-serif" }}>
                          {format(dt, 'h:mm a')} · with {s.tutor_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        {s.status === 'approved' && (
                          <>
                            <button
                              onClick={() => downloadICS(s.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
                              style={{
                                background: '#F8F6F1',
                                color: '#12192C',
                                border: '1px solid #E0D8CB',
                                cursor: 'pointer',
                                fontFamily: "'DM Sans', sans-serif",
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                              .ics
                            </button>
                            <a
                              href={gcUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
                              style={{
                                background: '#F8F6F1',
                                color: '#12192C',
                                border: '1px solid #E0D8CB',
                                textDecoration: 'none',
                                fontFamily: "'DM Sans', sans-serif",
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Google Cal
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
