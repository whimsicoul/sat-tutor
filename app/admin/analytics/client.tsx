'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Legend,
  Cell,
} from 'recharts';
import type { AnalyticsFilters, SkillRow, DifficultyRow, WeeklyRow } from '@/lib/db';

// ── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsSummary {
  total_attempts: number;
  correct_count: number;
  overall_accuracy: number;
  most_missed_skill: string | null;
  most_missed_difficulty: string | null;
}

// ── Design tokens (matching existing admin palette) ──────────────────────────

const ROSE        = '#E0A6AF';
const ROSE_DEEPER = '#C47F8A';
const SKY         = '#A8CBDE';
const SKY_DEEPER  = '#6FAAC4';
const CHARCOAL    = '#1A1D23';
const MIST        = '#9399A6';
const FOG         = '#E8EAF0';
const WHITE       = '#FFFFFF';
const FROST       = '#F7F8FC';

const DIFFICULTY_COLORS: Record<string, string> = {
  '1-2': SKY,
  '3':   '#C4D8A8',
  '4-5': ROSE,
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: MIST,
  marginBottom: 4,
  fontFamily: "'Syne', sans-serif",
};

const selectStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 8,
  fontSize: 13,
  border: `1px solid ${FOG}`,
  background: WHITE,
  color: CHARCOAL,
  fontFamily: "'Syne', sans-serif",
  outline: 'none',
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  width: 130,
};

const cardStyle: React.CSSProperties = {
  background: WHITE,
  border: `1px solid ${FOG}`,
  borderRadius: 14,
  padding: '20px 24px',
  boxShadow: '0 2px 8px rgba(26,29,35,0.04)',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toQueryString(filters: AnalyticsFilters): string {
  const p = new URLSearchParams();
  if (filters.source && filters.source !== 'all') p.set('source', filters.source);
  if (filters.studentId) p.set('student_id', filters.studentId);
  if (filters.category) p.set('category', filters.category);
  if (filters.dateStart) p.set('date_start', filters.dateStart);
  if (filters.dateEnd) p.set('date_end', filters.dateEnd);
  return p.toString() ? `?${p.toString()}` : '';
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: 180,
      gap: 8,
    }}>
      <span style={{ fontSize: 28 }}>📊</span>
      <p style={{ fontSize: 13, color: MIST, textAlign: 'center', maxWidth: 260, margin: 0, fontFamily: "'Syne', sans-serif" }}>
        {message}
      </p>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function SkillTooltip({ active, payload }: { active?: boolean; payload?: { payload: SkillRow }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: WHITE, border: `1px solid ${FOG}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, fontFamily: "'Syne', sans-serif", boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <p style={{ margin: '0 0 4px', fontWeight: 700, color: CHARCOAL }}>{d.skill}</p>
      {d.category && <p style={{ margin: '0 0 2px', color: MIST }}>{d.category}</p>}
      <p style={{ margin: '0 0 2px', color: CHARCOAL }}>Accuracy: <strong>{d.accuracy_pct}%</strong></p>
      <p style={{ margin: '0 0 2px', color: MIST }}>{d.correct_count} / {d.total_attempts} correct</p>
      <p style={{ margin: 0, color: MIST }}>{d.unique_student_count} student{d.unique_student_count !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AnalyticsDashboardClient({
  students,
}: {
  students: { id: string; name: string }[];
}) {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    source: 'all',
    studentId: null,
    category: null,
    dateStart: null,
    dateEnd: null,
  });

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [skillData, setSkillData] = useState<SkillRow[]>([]);
  const [diffData, setDiffData] = useState<DifficultyRow[]>([]);
  const [timeData, setTimeData] = useState<WeeklyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async (f: AnalyticsFilters) => {
    setLoading(true);
    try {
      const qs = toQueryString(f);
      const [sumRes, skillRes, diffRes, timeRes] = await Promise.all([
        fetch(`/api/admin/analytics/summary${qs}`),
        fetch(`/api/admin/analytics/by-skill${qs}`),
        fetch(`/api/admin/analytics/by-difficulty${qs}`),
        fetch(`/api/admin/analytics/over-time${qs}`),
      ]);
      const [sumData, skillJson, diffJson, timeJson] = await Promise.all([
        sumRes.json() as Promise<AnalyticsSummary>,
        skillRes.json() as Promise<{ skills: SkillRow[] }>,
        diffRes.json() as Promise<{ difficulties: DifficultyRow[] }>,
        timeRes.json() as Promise<{ weeks: WeeklyRow[] }>,
      ]);
      setSummary(sumData);
      setSkillData(skillJson.skills ?? []);
      setDiffData(diffJson.difficulties ?? []);
      setTimeData(timeJson.weeks ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(filters); }, [fetchAll, filters]);

  function setFilter<K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const noSkillData = skillData.length === 0;
  const noDiffData = diffData.length === 0;
  const noTimeData = timeData.length === 0;

  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Syne', sans-serif", minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: CHARCOAL, margin: '0 0 6px' }}>
          Analytics
        </h1>
        <p style={{ fontSize: 14, color: MIST, margin: 0 }}>
          Problem performance across daily practice and worksheets
        </p>
      </div>

      {/* ── Filters ── */}
      <div style={{ ...cardStyle, marginBottom: 28, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
        <div>
          <label style={labelStyle}>Source</label>
          <select
            value={filters.source ?? 'all'}
            onChange={(e) => setFilter('source', e.target.value as AnalyticsFilters['source'])}
            style={selectStyle}
          >
            <option value="all">All Sources</option>
            <option value="daily_practice">☀️ Daily Practice</option>
            <option value="worksheets">Worksheets</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Student</label>
          <select
            value={filters.studentId ?? ''}
            onChange={(e) => setFilter('studentId', e.target.value || null)}
            style={selectStyle}
          >
            <option value="">All Students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Category</label>
          <select
            value={filters.category ?? ''}
            onChange={(e) => setFilter('category', e.target.value || null)}
            style={selectStyle}
          >
            <option value="">All Categories</option>
            <option value="Math">Math</option>
            <option value="Reading and Writing">Reading and Writing</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>From</label>
          <input
            type="date"
            value={filters.dateStart ?? ''}
            onChange={(e) => setFilter('dateStart', e.target.value || null)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>To</label>
          <input
            type="date"
            value={filters.dateEnd ?? ''}
            onChange={(e) => setFilter('dateEnd', e.target.value || null)}
            style={inputStyle}
          />
        </div>

        {(filters.studentId || filters.category || filters.dateStart || filters.dateEnd || filters.source !== 'all') && (
          <button
            onClick={() => setFilters({ source: 'all', studentId: null, category: null, dateStart: null, dateEnd: null })}
            style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${FOG}`, background: FROST, color: MIST, fontSize: 12, fontFamily: "'Syne', sans-serif", cursor: 'pointer' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <SummaryCard
          label="Total Attempts"
          value={loading ? '—' : (summary?.total_attempts ?? 0).toLocaleString()}
          accent={SKY}
        />
        <SummaryCard
          label="Overall Accuracy"
          value={loading ? '—' : `${summary?.overall_accuracy ?? 0}%`}
          accent={summary && summary.overall_accuracy >= 70 ? '#C4D8A8' : ROSE}
          sub={loading ? undefined : `${summary?.correct_count ?? 0} correct`}
        />
        <SummaryCard
          label="Most Missed Skill"
          value={loading ? '—' : (summary?.most_missed_skill ?? 'N/A')}
          accent={ROSE}
          small
        />
        <SummaryCard
          label="Hardest Band"
          value={loading ? '—' : (summary?.most_missed_difficulty ?? 'N/A')}
          accent={ROSE_DEEPER}
        />
      </div>

      {/* ── Skill Chart + Difficulty Chart (side by side) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Skill bar chart */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: CHARCOAL, margin: '0 0 16px', fontFamily: "'Syne', sans-serif" }}>
            Accuracy by Skill
          </h2>
          {noSkillData ? (
            <EmptyChart message="No skill data yet. Tag worksheet problems or daily practice problems with a skill to see this chart." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, skillData.length * 36)}>
              <BarChart
                layout="vertical"
                data={skillData}
                margin={{ top: 0, right: 40, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={FOG} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: MIST, fontFamily: "'Syne', sans-serif" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="skill"
                  width={140}
                  tick={{ fontSize: 12, fill: CHARCOAL, fontFamily: "'Syne', sans-serif" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<SkillTooltip />} cursor={{ fill: FROST }} />
                <ReferenceLine x={50} stroke={MIST} strokeDasharray="4 2" />
                <Bar dataKey="accuracy_pct" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {skillData.map((entry, index) => (
                    <Cell
                      key={`skill-${index}`}
                      fill={entry.accuracy_pct >= 70 ? SKY_DEEPER : entry.accuracy_pct >= 50 ? SKY : ROSE}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Difficulty bar chart */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: CHARCOAL, margin: '0 0 16px', fontFamily: "'Syne', sans-serif" }}>
            Accuracy by Difficulty
          </h2>
          {noDiffData ? (
            <EmptyChart message="No difficulty data yet. Tag problems with a difficulty band to see this chart." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={diffData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={FOG} />
                <XAxis
                  dataKey="difficulty"
                  tick={{ fontSize: 12, fill: CHARCOAL, fontFamily: "'Syne', sans-serif" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => ({ '1-2': 'Easy (1–2)', '3': 'Medium (3)', '4-5': 'Hard (4–5)' }[v as string] ?? v)}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: MIST, fontFamily: "'Syne', sans-serif" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v, name) => [`${v}%`, name === 'accuracy_pct' ? 'Accuracy' : String(name)]}
                  contentStyle={{ fontFamily: "'Syne', sans-serif", fontSize: 12, borderRadius: 10, border: `1px solid ${FOG}` }}
                  cursor={{ fill: FROST }}
                />
                <ReferenceLine y={50} stroke={MIST} strokeDasharray="4 2" />
                <Bar dataKey="accuracy_pct" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {diffData.map((entry, index) => (
                    <Cell key={`diff-${index}`} fill={DIFFICULTY_COLORS[entry.difficulty] ?? SKY} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Attempt counts below difficulty chart */}
          {!noDiffData && (
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              {diffData.map((d) => (
                <div key={d.difficulty} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MIST, fontFamily: "'Syne', sans-serif" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: DIFFICULTY_COLORS[d.difficulty] ?? SKY, display: 'inline-block' }} />
                  {d.difficulty === '1-2' ? 'Easy' : d.difficulty === '3' ? 'Medium' : 'Hard'}: {d.total_attempts} attempts
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Accuracy Over Time ── */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: CHARCOAL, margin: '0 0 16px', fontFamily: "'Syne', sans-serif" }}>
          Accuracy Over Time
          <span style={{ fontSize: 11, fontWeight: 400, color: MIST, marginLeft: 8 }}>weekly</span>
        </h2>
        {noTimeData ? (
          <EmptyChart message="No response data yet. Students need to answer problems for this chart to appear." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={FOG} />
              <XAxis
                dataKey="week_start"
                tickFormatter={formatWeek}
                tick={{ fontSize: 11, fill: MIST, fontFamily: "'Syne', sans-serif" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: MIST, fontFamily: "'Syne', sans-serif" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [`${v}%`, 'Accuracy']}
                labelFormatter={(label) => `Week of ${formatWeek(String(label))}`}
                contentStyle={{ fontFamily: "'Syne', sans-serif", fontSize: 12, borderRadius: 10, border: `1px solid ${FOG}` }}
              />
              <Legend
                formatter={() => 'Weekly Accuracy'}
                wrapperStyle={{ fontSize: 12, fontFamily: "'Syne', sans-serif" }}
              />
              {summary && (
                <ReferenceLine
                  y={summary.overall_accuracy}
                  stroke={MIST}
                  strokeDasharray="4 2"
                  label={{ value: `Avg ${summary.overall_accuracy}%`, position: 'insideTopRight', fontSize: 10, fill: MIST, fontFamily: "'Syne', sans-serif" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="accuracy_pct"
                stroke={SKY_DEEPER}
                strokeWidth={2.5}
                dot={{ fill: SKY_DEEPER, r: 4 }}
                activeDot={{ r: 6, fill: ROSE_DEEPER }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}

// ── Summary card sub-component ────────────────────────────────────────────────

function SummaryCard({
  label, value, accent, sub, small,
}: {
  label: string;
  value: string;
  accent: string;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div style={{
      background: WHITE,
      border: `1px solid ${FOG}`,
      borderRadius: 14,
      padding: '20px 24px',
      boxShadow: '0 2px 8px rgba(26,29,35,0.04)',
      borderLeft: `4px solid ${accent}`,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: MIST, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px', fontFamily: "'Syne', sans-serif" }}>
        {label}
      </p>
      <p style={{ fontSize: small ? 18 : 28, fontWeight: 700, color: CHARCOAL, margin: 0, fontFamily: small ? "'Syne', sans-serif" : "'Cormorant Garamond', serif", lineHeight: 1.1, wordBreak: 'break-word' }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 12, color: MIST, margin: '4px 0 0', fontFamily: "'Syne', sans-serif" }}>{sub}</p>
      )}
    </div>
  );
}
