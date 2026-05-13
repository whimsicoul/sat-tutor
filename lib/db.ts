import { neon } from '@neondatabase/serverless';

// Replace 'any' with 'unknown' for flexible but safe typing
type Row = Record<string, unknown>;

// Replace 'any[]' with 'unknown[]'
type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>;

interface SqlProxy extends SqlFn {
  // Replace 'any[]' with 'unknown[]'
  query(text: string, params?: unknown[]): Promise<Row[]>;
}

let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// sql is a tagged template literal function; proxy it so the connection is
// only created on first use (not at module load time during Next.js build).
const sql = new Proxy(
  function sql(...args: Parameters<ReturnType<typeof neon>>) {
    // Cast to SqlFn instead of any to satisfy the linter
    return (getSql() as unknown as SqlFn)(...args);
  } as unknown as SqlProxy,
  {
    get(_, prop) {
      const db = getSql();
      return db[prop as keyof typeof db];
    },
  }
) as SqlProxy;

export default sql;

export async function getUserByEmail(email: string) {
  const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return rows[0] ?? null;
}

export async function getUserById(id: string) {
  const rows = await sql`SELECT id, name, email, role, created_at FROM users WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function getAllStudents() {
  return sql`SELECT id, name, email FROM users WHERE role = 'student' ORDER BY name`;
}

export async function getSessionsByStudent(studentId: string) {
  return sql`
    SELECT s.id, s.proposed_time, s.status, s.created_at,
           u.name AS tutor_name
    FROM sessions s
    JOIN users u ON u.id = s.tutor_id
    WHERE s.student_id = ${studentId}
    ORDER BY s.proposed_time DESC
  `;
}

export async function getSessionsByTutor(tutorId: string) {
  return sql`
    SELECT s.id, s.proposed_time, s.status, s.created_at,
           u.name AS student_name, u.email AS student_email
    FROM sessions s
    JOIN users u ON u.id = s.student_id
    WHERE s.tutor_id = ${tutorId}
    ORDER BY s.proposed_time DESC
  `;
}

export async function getSessionById(id: string) {
  const rows = await sql`
    SELECT s.*,
           st.name AS student_name, st.email AS student_email,
           t.name AS tutor_name, t.email AS tutor_email
    FROM sessions s
    JOIN users st ON st.id = s.student_id
    JOIN users t ON t.id = s.tutor_id
    WHERE s.id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getTestimonials() {
  return sql`SELECT * FROM testimonials ORDER BY created_at DESC`;
}

// ─── Admin: Users ────────────────────────────────────────────────────────────

export async function getAllUsers() {
  return sql`SELECT id, name, email, role, active, created_at FROM users ORDER BY name`;
}

export async function getUsersByRole(role: string) {
  return sql`SELECT id, name, email, role, active, created_at FROM users WHERE role = ${role} ORDER BY name`;
}

export async function createUser(
  name: string,
  email: string,
  hashedPassword: string,
  role: string
) {
  const rows = await sql`
    INSERT INTO users (name, email, hashed_password, role)
    VALUES (${name}, ${email}, ${hashedPassword}, ${role})
    RETURNING id, name, email, role, active, created_at
  `;
  return rows[0];
}

export async function updateUser(
  id: string,
  fields: { name?: string; email?: string; role?: string; active?: boolean; hashedPassword?: string }
) {
  const rows = await sql`
    UPDATE users
    SET
      name            = COALESCE(${fields.name ?? null}, name),
      email           = COALESCE(${fields.email ?? null}, email),
      role            = COALESCE(${fields.role ?? null}, role),
      active          = COALESCE(${fields.active ?? null}, active),
      hashed_password = COALESCE(${fields.hashedPassword ?? null}, hashed_password)
    WHERE id = ${id}
    RETURNING id, name, email, role, active, created_at
  `;
  return rows[0] ?? null;
}

export async function getUserByIdWithPassword(id: string) {
  const rows = await sql`SELECT id, name, email, role, active, hashed_password, created_at FROM users WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function updateUserPassword(id: string, hashedPassword: string) {
  const rows = await sql`
    UPDATE users SET hashed_password = ${hashedPassword} WHERE id = ${id}
    RETURNING id, name, email, role, active, created_at
  `;
  return rows[0] ?? null;
}

export async function deleteUser(id: string) {
  await sql`DELETE FROM users WHERE id = ${id}`;
}

// ─── Admin: Tutor-Student Assignments ────────────────────────────────────────

export async function getTutorStudentAssignments() {
  return sql`
    SELECT tsa.id, tsa.created_at,
           t.id AS tutor_id, t.name AS tutor_name,
           s.id AS student_id, s.name AS student_name
    FROM tutor_student_assignments tsa
    JOIN users t ON t.id = tsa.tutor_id
    JOIN users s ON s.id = tsa.student_id
    ORDER BY t.name, s.name
  `;
}

export async function createTutorStudentAssignment(tutorId: string, studentId: string) {
  const rows = await sql`
    INSERT INTO tutor_student_assignments (tutor_id, student_id)
    VALUES (${tutorId}, ${studentId})
    ON CONFLICT (tutor_id, student_id) DO NOTHING
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function deleteTutorStudentAssignment(id: string) {
  await sql`DELETE FROM tutor_student_assignments WHERE id = ${id}`;
}

// ─── Admin: Sessions ─────────────────────────────────────────────────────────

export async function getAllSessions() {
  return sql`
    SELECT s.id, s.proposed_time, s.status, s.created_at, s.series_id,
           t.id AS tutor_id, t.name AS tutor_name,
           st.id AS student_id, st.name AS student_name
    FROM sessions s
    JOIN users t  ON t.id  = s.tutor_id
    JOIN users st ON st.id = s.student_id
    ORDER BY s.proposed_time ASC
  `;
}

export async function adminCreateSession(
  tutorId: string,
  studentId: string,
  proposedTime: string,
  seriesId?: string
) {
  const rows = await sql`
    INSERT INTO sessions (tutor_id, student_id, proposed_time, status, series_id)
    VALUES (${tutorId}, ${studentId}, ${proposedTime}, 'approved', ${seriesId ?? null})
    RETURNING *
  `;
  return rows[0];
}

// ─── Admin: Session Series ────────────────────────────────────────────────────

export async function getSessionSeries() {
  return sql`
    SELECT ss.id, ss.recurrence_rule, ss.start_date, ss.end_date, ss.created_at,
           t.id AS tutor_id, t.name AS tutor_name,
           s.id AS student_id, s.name AS student_name
    FROM session_series ss
    JOIN users t ON t.id = ss.tutor_id
    JOIN users s ON s.id = ss.student_id
    ORDER BY ss.created_at DESC
  `;
}

export async function createSessionSeries(
  tutorId: string,
  studentId: string,
  recurrenceRule: string,
  startDate: string,
  endDate?: string
) {
  const rows = await sql`
    INSERT INTO session_series (tutor_id, student_id, recurrence_rule, start_date, end_date)
    VALUES (${tutorId}, ${studentId}, ${recurrenceRule}, ${startDate}, ${endDate ?? null})
    RETURNING *
  `;
  return rows[0];
}

export async function deleteSessionSeries(id: string) {
  await sql`DELETE FROM sessions WHERE series_id = ${id}`;
  await sql`DELETE FROM session_series WHERE id = ${id}`;
}

export async function adminUpdateSessionStatus(id: string, status: string) {
  const rows = await sql`
    UPDATE sessions SET status = ${status} WHERE id = ${id} RETURNING *
  `;
  return rows[0] ?? null;
}

export async function adminBulkUpdateSessionStatus(ids: string[], status: string): Promise<Row[]> {
  if (ids.length === 0) return [];
  
  // By typing the return of the query, we satisfy the linter
  return sql.query(
    'UPDATE sessions SET status = $1 WHERE id = ANY($2::uuid[]) RETURNING *',
    [status, ids]
  );
}

// ─── Student: Session Requests ────────────────────────────────────────────────

export async function getAssignedTutorForStudent(studentId: string) {
  const rows = await sql`
    SELECT u.id, u.name, u.email
    FROM tutor_student_assignments tsa
    JOIN users u ON u.id = tsa.tutor_id
    WHERE tsa.student_id = ${studentId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// ─── SAT Test Dates ───────────────────────────────────────────────────────────

export async function getSatDatesByStudent(studentId: string) {
  return sql`
    SELECT id, test_date, created_at, notes
    FROM sat_test_dates
    WHERE student_id = ${studentId}
    ORDER BY test_date ASC
  `;
}

export async function getSatDatesForTutorStudents(tutorId: string) {
  return sql`
    SELECT std.id, std.test_date, std.created_at, std.notes,
           s.id AS student_id, s.name AS student_name
    FROM sat_test_dates std
    JOIN users s ON s.id = std.student_id
    JOIN tutor_student_assignments tsa ON tsa.student_id = std.student_id
    WHERE tsa.tutor_id = ${tutorId}
    ORDER BY std.test_date ASC
  `;
}

export async function getAllSatDates() {
  return sql`
    SELECT std.id, std.test_date, std.created_at, std.notes,
           s.id AS student_id, s.name AS student_name
    FROM sat_test_dates std
    JOIN users s ON s.id = std.student_id
    ORDER BY std.test_date ASC
  `;
}

export async function createSatDate(studentId: string, testDate: string, createdBy: string) {
  const rows = await sql`
    INSERT INTO sat_test_dates (student_id, test_date, created_by)
    VALUES (${studentId}, ${testDate}, ${createdBy})
    RETURNING id, student_id, test_date, created_at, notes
  `;
  return rows[0];
}

export async function updateSatDateNotes(id: string, notes: string | null) {
  const rows = await sql`
    UPDATE sat_test_dates SET notes = ${notes}
    WHERE id = ${id}
    RETURNING id, notes
  `;
  return rows[0] ?? null;
}

export async function deleteSatDate(id: string) {
  await sql`DELETE FROM sat_test_dates WHERE id = ${id}`;
}

// ─── Tutor: Test Results ─────────────────────────────────────────────────────

export async function getTestResultsForTutorStudents(tutorId: string) {
  return sql`
    SELECT tr.id, tr.test_name, tr.test_date, tr.total_score, tr.math_score,
           tr.reading_writing_score, tr.notes, tr.pdf_url, tr.created_at,
           tr.score_type, tr.act_english_score, tr.act_reading_score,
           s.name AS student_name
    FROM test_results tr
    JOIN users s ON s.id = tr.student_id
    JOIN tutor_student_assignments tsa ON tsa.student_id = tr.student_id
    WHERE tsa.tutor_id = ${tutorId}
    ORDER BY tr.test_date DESC
  `;
}

export async function getWorksheetBySession(sessionId: string) {
  const rows = await sql`
    SELECT w.id, w.title
    FROM worksheets w
    JOIN sessions s ON s.worksheet_id = w.id
    WHERE s.id = ${sessionId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function setSessionWorksheet(sessionId: string, worksheetId: string | null) {
  await sql`UPDATE sessions SET worksheet_id = ${worksheetId} WHERE id = ${sessionId}`;
}

export async function getWorksheetsByTutor(tutorId: string) {
  return sql`
    SELECT id, title
    FROM worksheets
    WHERE created_by = ${tutorId}
    ORDER BY created_at DESC
  `;
}

// ─── Breakfast Problems: Admin ────────────────────────────────────────────────

export async function getAllBreakfastProblems() {
  return sql`
    SELECT id, question, choice_a, choice_b, choice_c, choice_d,
           correct_answer, category, skill, difficulty, external_id, created_at
    FROM breakfast_problems
    ORDER BY created_at DESC
  `;
}

export async function bulkInsertBreakfastProblems(
  rows: Array<{
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
  }>
) {
  if (rows.length === 0) return [];
  const results = await Promise.all(
    rows.map((r) =>
      sql`
        INSERT INTO breakfast_problems
          (question, choice_a, choice_b, choice_c, choice_d, correct_answer,
           category, skill, difficulty, external_id)
        VALUES
          (${r.question}, ${r.choice_a}, ${r.choice_b}, ${r.choice_c}, ${r.choice_d},
           ${r.correct_answer.toUpperCase()}, ${r.category ?? null},
           ${r.skill ?? null}, ${r.difficulty ?? null}, ${r.external_id ?? null})
        ON CONFLICT (external_id) DO NOTHING
        RETURNING id
      `
    )
  );
  return results.flat();
}

export async function deleteBreakfastProblem(id: string) {
  await sql`DELETE FROM breakfast_problems WHERE id = ${id}`;
}

export async function updateBreakfastProblem(
  id: string,
  fields: {
    question?: string;
    choice_a?: string;
    choice_b?: string;
    choice_c?: string;
    choice_d?: string;
    correct_answer?: string;
    answer_explanation?: string | null;
    category?: string | null;
    skill?: string | null;
    difficulty?: string | null;
    crop_top_px?: number | null;
    crop_bottom_px?: number | null;
    review_status?: string | null;
  }
) {
  const updateReviewStatus = 'review_status' in fields;
  const newReviewStatus = fields.review_status ?? null;
  const rows = await sql`
    UPDATE breakfast_problems SET
      question           = COALESCE(${fields.question        ?? null}, question),
      choice_a           = COALESCE(${fields.choice_a        ?? null}, choice_a),
      choice_b           = COALESCE(${fields.choice_b        ?? null}, choice_b),
      choice_c           = COALESCE(${fields.choice_c        ?? null}, choice_c),
      choice_d           = COALESCE(${fields.choice_d        ?? null}, choice_d),
      correct_answer     = COALESCE(${fields.correct_answer  ?? null}, correct_answer),
      answer_explanation = COALESCE(${fields.answer_explanation ?? null}::text, answer_explanation),
      category           = COALESCE(${fields.category           ?? null}::text, category),
      skill              = COALESCE(${fields.skill               ?? null}::text, skill),
      difficulty         = COALESCE(${fields.difficulty          ?? null}::text, difficulty),
      crop_top_px        = COALESCE(${fields.crop_top_px    ?? null}::int, crop_top_px),
      crop_bottom_px     = COALESCE(${fields.crop_bottom_px ?? null}::int, crop_bottom_px),
      review_status      = CASE WHEN ${updateReviewStatus} THEN ${newReviewStatus}::text ELSE review_status END
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function getBreakfastProblemsForCropReview() {
  return sql`
    SELECT id, question_image_url, crop_top_px, crop_bottom_px, image_width_px, image_height_px
    FROM breakfast_problems
    WHERE question_image_url IS NOT NULL
    ORDER BY id ASC
  `;
}

export async function getAllBreakfastProblemsWithFlagCounts() {
  return sql`
    SELECT
      bp.id, bp.question, bp.choice_a, bp.choice_b, bp.choice_c, bp.choice_d,
      bp.correct_answer, bp.category, bp.skill, bp.difficulty,
      bp.external_id, bp.created_at,
      bp.answer_explanation,
      bp.review_status,
      bp.question_image_url, bp.crop_top_px, bp.crop_bottom_px,
      bp.image_width_px, bp.image_height_px,
      COUNT(bpf.id)::int AS flag_count,
      MAX(bpf.reason)    AS latest_flag_reason
    FROM breakfast_problems bp
    LEFT JOIN breakfast_problem_flags bpf ON bpf.problem_id = bp.id
    GROUP BY bp.id
    ORDER BY bp.created_at DESC
  `;
}

export async function upsertBreakfastProblemFlag(
  problemId: string,
  studentId: string,
  reason: string | null
) {
  const rows = await sql`
    INSERT INTO breakfast_problem_flags (problem_id, student_id, reason)
    VALUES (${problemId}, ${studentId}, ${reason})
    ON CONFLICT (problem_id, student_id)
    DO UPDATE SET reason = EXCLUDED.reason, created_at = now()
    RETURNING id
  `;
  return rows[0] ?? null;
}

// ─── Breakfast Problems: Student ─────────────────────────────────────────────

export async function getTodayAssignmentsForStudent(studentId: string) {
  return sql`
    SELECT
      sba.id          AS assignment_id,
      sba.assigned_date,
      bp.id           AS problem_id,
      bp.question,
      bp.choice_a,
      bp.choice_b,
      bp.choice_c,
      bp.choice_d,
      bp.category,
      bp.question_image_url,
      bp.crop_top_px,
      bp.crop_bottom_px,
      bp.image_width_px,
      bp.image_height_px,
      sbr.student_answer,
      sbr.is_correct,
      sbr.submitted_at,
      sba.annotations
    FROM student_breakfast_assignments sba
    JOIN breakfast_problems bp ON bp.id = sba.problem_id
    LEFT JOIN student_breakfast_responses sbr
           ON sbr.assignment_id = sba.id AND sbr.student_id = ${studentId}
    WHERE sba.student_id  = ${studentId}
      AND sba.assigned_date = CURRENT_DATE
    ORDER BY sba.created_at ASC
  `;
}

export async function assignBreakfastProblemsForToday(
  studentId: string,
  limit: number = 5
): Promise<number> {
  // If both Math and Reading/Writing exist in the pool, split assignments 50/50
  // (rounding so total == limit). Falls back to random if only one category exists.
  const categoryCounts = (await sql`
    SELECT category, COUNT(*) AS cnt
    FROM breakfast_problems
    WHERE category IN ('Math', 'Reading and Writing')
      AND id NOT IN (
        SELECT problem_id FROM student_breakfast_assignments WHERE student_id = ${studentId}
      )
    GROUP BY category
  `) as { category: string; cnt: number }[];

  const hasMath = categoryCounts.some((r) => r.category === 'Math' && Number(r.cnt) > 0);
  const hasRW   = categoryCounts.some((r) => r.category === 'Reading and Writing' && Number(r.cnt) > 0);

  if (hasMath && hasRW) {
    const mathLimit = Math.round(limit / 2);
    const rwLimit   = limit - mathLimit;

    const [mathRows, rwRows] = await Promise.all([
      sql`
        INSERT INTO student_breakfast_assignments (student_id, problem_id, assigned_date)
        SELECT ${studentId}, bp.id, CURRENT_DATE
        FROM breakfast_problems bp
        WHERE bp.category = 'Math'
          AND bp.id NOT IN (
            SELECT problem_id FROM student_breakfast_assignments WHERE student_id = ${studentId}
          )
        ORDER BY random()
        LIMIT ${mathLimit}
        ON CONFLICT (student_id, problem_id) DO NOTHING
        RETURNING id
      `,
      sql`
        INSERT INTO student_breakfast_assignments (student_id, problem_id, assigned_date)
        SELECT ${studentId}, bp.id, CURRENT_DATE
        FROM breakfast_problems bp
        WHERE bp.category = 'Reading and Writing'
          AND bp.id NOT IN (
            SELECT problem_id FROM student_breakfast_assignments WHERE student_id = ${studentId}
          )
        ORDER BY random()
        LIMIT ${rwLimit}
        ON CONFLICT (student_id, problem_id) DO NOTHING
        RETURNING id
      `,
    ]);
    return mathRows.length + rwRows.length;
  }

  // Single category or uncategorised pool — assign randomly
  const rows = await sql`
    INSERT INTO student_breakfast_assignments (student_id, problem_id, assigned_date)
    SELECT ${studentId}, bp.id, CURRENT_DATE
    FROM breakfast_problems bp
    WHERE bp.id NOT IN (
      SELECT problem_id FROM student_breakfast_assignments WHERE student_id = ${studentId}
    )
    ORDER BY random()
    LIMIT ${limit}
    ON CONFLICT (student_id, problem_id) DO NOTHING
    RETURNING id
  `;
  return rows.length;
}

export async function saveBreakfastResponse(
  assignmentId: string,
  studentId: string,
  problemId: string,
  studentAnswer: string,
  isCorrect: boolean
) {
  const rows = await sql`
    INSERT INTO student_breakfast_responses
      (assignment_id, student_id, problem_id, student_answer, is_correct)
    VALUES
      (${assignmentId}, ${studentId}, ${problemId},
       ${studentAnswer.toUpperCase()}, ${isCorrect})
    ON CONFLICT ON CONSTRAINT uq_sbr_assignment DO NOTHING
    RETURNING id
  `;
  return rows[0] ?? null;
}

export async function getBreakfastCompletionByStudent(studentId: string) {
  return sql`
    SELECT
      sba.assigned_date::text AS assigned_date,
      COUNT(sba.id)           AS total,
      COUNT(sbr.id)           AS submitted
    FROM student_breakfast_assignments sba
    LEFT JOIN student_breakfast_responses sbr
           ON sbr.assignment_id = sba.id AND sbr.student_id = ${studentId}
    WHERE sba.student_id = ${studentId}
    GROUP BY sba.assigned_date
    ORDER BY sba.assigned_date DESC
  `;
}

// ─── Breakfast Problems: Tutor / Admin Results ────────────────────────────────

export async function getBreakfastResultsForTutorStudents(tutorId: string) {
  return sql`
    SELECT
      sbr.id,
      sbr.problem_id,
      sbr.student_answer,
      sbr.is_correct,
      sbr.submitted_at,
      sba.assigned_date,
      bp.question,
      bp.choice_a,
      bp.choice_b,
      bp.choice_c,
      bp.choice_d,
      bp.correct_answer,
      bp.category,
      bp.answer_explanation,
      bp.question_image_url, bp.crop_top_px, bp.crop_bottom_px,
      bp.image_width_px, bp.image_height_px,
      u.id   AS student_id,
      u.name AS student_name
    FROM student_breakfast_responses sbr
    JOIN student_breakfast_assignments sba ON sba.id = sbr.assignment_id
    JOIN breakfast_problems bp             ON bp.id  = sbr.problem_id
    JOIN users u                           ON u.id   = sbr.student_id
    JOIN tutor_student_assignments tsa     ON tsa.student_id = sbr.student_id
    WHERE tsa.tutor_id = ${tutorId}
    ORDER BY u.name ASC, sba.assigned_date DESC
  `;
}

export async function getLastSessionDatePerStudent(tutorId: string) {
  return sql`
    SELECT s.student_id, MAX(s.proposed_time::date) AS last_session_date
    FROM sessions s
    WHERE s.tutor_id = ${tutorId}
      AND s.status   = 'confirmed'
    GROUP BY s.student_id
  `;
}

export async function getAllBreakfastResults() {
  return sql`
    SELECT
      sbr.id,
      sbr.problem_id,
      sbr.student_answer,
      sbr.is_correct,
      sbr.submitted_at,
      sba.assigned_date,
      bp.question,
      bp.choice_a, bp.choice_b, bp.choice_c, bp.choice_d,
      bp.correct_answer,
      bp.category,
      bp.answer_explanation,
      bp.question_image_url, bp.crop_top_px, bp.crop_bottom_px,
      bp.image_width_px, bp.image_height_px,
      u.id   AS student_id,
      u.name AS student_name
    FROM student_breakfast_responses sbr
    JOIN student_breakfast_assignments sba ON sba.id = sbr.assignment_id
    JOIN breakfast_problems bp             ON bp.id  = sbr.problem_id
    JOIN users u                           ON u.id   = sbr.student_id
    ORDER BY u.name ASC, sba.assigned_date DESC
  `;
}

// ─── ACT Practice Test ────────────────────────────────────────────────────────

const ACT_SCALE: Record<string, Record<number, number>> = {
  english: {
    40:36,39:35,38:35,37:33,36:31,35:29,34:28,33:27,32:26,31:25,
    30:24,29:23,28:22,27:22,26:21,25:20,24:20,23:19,22:18,21:17,
    20:16,19:15,18:15,17:14,16:13,15:13,14:12,13:11,12:11,11:10,
    10:10,9:10,8:9,7:8,6:7,5:7,4:6,3:5,2:3,1:2,0:1,
  },
  math: {
    41:36,40:36,39:35,38:34,37:34,36:33,35:32,34:31,33:30,32:29,
    31:29,30:28,29:27,28:27,27:26,26:25,25:24,24:23,23:22,22:21,
    21:20,20:19,19:19,18:18,17:17,16:17,15:17,14:16,13:16,12:15,
    11:15,10:15,9:14,8:14,7:13,6:13,5:12,4:11,3:9,2:7,1:5,0:1,
  },
  reading: {
    27:36,26:35,25:34,24:32,23:30,22:28,21:26,20:25,19:24,18:23,
    17:22,16:21,15:20,14:18,13:17,12:16,11:15,10:14,9:13,8:12,
    7:12,6:11,5:10,4:9,3:7,2:5,1:3,0:1,
  },
  science: {
    34:36,33:35,32:34,31:33,30:32,29:31,28:30,27:29,26:28,25:27,
    24:26,23:25,22:25,21:24,20:23,19:23,18:22,17:21,16:20,15:19,
    14:18,13:18,12:17,11:16,10:15,9:14,8:12,7:12,6:11,5:10,
    4:9,3:7,2:6,1:3,0:1,
  },
};

export function actRawToScale(section: string, raw: number): number {
  const table = ACT_SCALE[section];
  if (!table) return 1;
  return table[raw] ?? 1;
}

export async function getActPages(section: string) {
  return sql`
    SELECT id, section, page_number, image_url
    FROM act_pages
    WHERE section = ${section}
    ORDER BY page_number ASC
  `;
}

export async function upsertActPage(section: string, pageNumber: number, imageUrl: string) {
  const rows = await sql`
    INSERT INTO act_pages (section, page_number, image_url)
    VALUES (${section}, ${pageNumber}, ${imageUrl})
    ON CONFLICT (section, page_number) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING *
  `;
  return rows[0];
}

export async function deleteActPage(section: string, pageNumber: number) {
  return sql`DELETE FROM act_pages WHERE section = ${section} AND page_number = ${pageNumber}`;
}

export async function deleteActPageById(id: string) {
  return sql`DELETE FROM act_pages WHERE id = ${id}`;
}

export async function getActBubblePositions(section: string) {
  return sql`
    SELECT id, section, page_number, question_number, choice, x_percent, y_percent
    FROM act_bubble_positions
    WHERE section = ${section}
    ORDER BY question_number ASC, choice ASC
  `;
}

export async function upsertActBubble(
  section: string,
  pageNumber: number,
  questionNumber: number,
  choice: string,
  xPercent: number,
  yPercent: number
) {
  const rows = await sql`
    INSERT INTO act_bubble_positions (section, page_number, question_number, choice, x_percent, y_percent)
    VALUES (${section}, ${pageNumber}, ${questionNumber}, ${choice}, ${xPercent}, ${yPercent})
    ON CONFLICT (section, question_number, choice)
    DO UPDATE SET page_number = EXCLUDED.page_number, x_percent = EXCLUDED.x_percent, y_percent = EXCLUDED.y_percent
    RETURNING *
  `;
  return rows[0];
}

export async function deleteActBubble(id: string) {
  return sql`DELETE FROM act_bubble_positions WHERE id = ${id}`;
}

export async function getActAnswerKey(section: string) {
  return sql`
    SELECT section, question_number, correct_answer, is_scored, reporting_category
    FROM act_answer_key
    WHERE section = ${section}
    ORDER BY question_number ASC
  `;
}

export async function bulkUpsertActAnswerKey(entries: { section: string; question_number: number; correct_answer: string }[]) {
  for (const e of entries) {
    await sql`
      INSERT INTO act_answer_key (section, question_number, correct_answer)
      VALUES (${e.section}, ${e.question_number}, ${e.correct_answer})
      ON CONFLICT (section, question_number) DO UPDATE SET correct_answer = EXCLUDED.correct_answer
    `;
  }
}

export async function startActAttempt(studentId: string, section: string) {
  const rows = await sql`
    INSERT INTO act_test_attempts (student_id, section)
    VALUES (${studentId}, ${section})
    RETURNING id, started_at
  `;
  return rows[0];
}

export async function getActiveActAttempt(studentId: string, section: string) {
  const rows = await sql`
    SELECT id, started_at, completed_at
    FROM act_test_attempts
    WHERE student_id = ${studentId} AND section = ${section} AND completed_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function completeActAttempt(attemptId: string) {
  return sql`
    UPDATE act_test_attempts
    SET completed_at = NOW()
    WHERE id = ${attemptId}
  `;
}

export async function saveActResponse(
  attemptId: string,
  studentId: string,
  section: string,
  questionNumber: number,
  studentAnswer: string,
  isCorrect: boolean
) {
  return sql`
    INSERT INTO act_test_responses (attempt_id, student_id, section, question_number, student_answer, is_correct)
    VALUES (${attemptId}, ${studentId}, ${section}, ${questionNumber}, ${studentAnswer}, ${isCorrect})
    ON CONFLICT (attempt_id, question_number) DO UPDATE
      SET student_answer = EXCLUDED.student_answer, is_correct = EXCLUDED.is_correct
  `;
}

export async function getActResponses(attemptId: string) {
  return sql`
    SELECT question_number, student_answer, is_correct
    FROM act_test_responses
    WHERE attempt_id = ${attemptId}
    ORDER BY question_number ASC
  `;
}

export async function getActResultsForStudent(studentId: string) {
  return sql`
    SELECT
      a.id AS attempt_id,
      a.section,
      a.started_at,
      a.completed_at,
      COUNT(r.id)::int AS total_questions,
      SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)::int AS correct_count
    FROM act_test_attempts a
    LEFT JOIN act_test_responses r ON r.attempt_id = a.id
    WHERE a.student_id = ${studentId} AND a.completed_at IS NOT NULL
    GROUP BY a.id, a.section, a.started_at, a.completed_at
    ORDER BY a.completed_at DESC
  `;
}

export async function getActResultsForTutorStudents(tutorId: string) {
  return sql`
    SELECT
      a.id AS attempt_id,
      a.section,
      a.started_at,
      a.completed_at,
      u.id AS student_id,
      u.name AS student_name,
      COUNT(r.id)::int AS total_questions,
      SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)::int AS correct_count
    FROM act_test_attempts a
    JOIN users u ON u.id = a.student_id
    JOIN tutor_student_assignments tsa ON tsa.student_id = u.id AND tsa.tutor_id = ${tutorId}
    LEFT JOIN act_test_responses r ON r.attempt_id = a.id
    WHERE a.completed_at IS NOT NULL
    GROUP BY a.id, a.section, a.started_at, a.completed_at, u.id, u.name
    ORDER BY u.name ASC, a.completed_at DESC
  `;
}

export async function getAllActResults() {
  return sql`
    SELECT
      a.id AS attempt_id,
      a.section,
      a.started_at,
      a.completed_at,
      u.id AS student_id,
      u.name AS student_name,
      COUNT(r.id)::int AS total_questions,
      SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)::int AS correct_count
    FROM act_test_attempts a
    JOIN users u ON u.id = a.student_id
    LEFT JOIN act_test_responses r ON r.attempt_id = a.id
    WHERE a.completed_at IS NOT NULL
    GROUP BY a.id, a.section, a.started_at, a.completed_at, u.id, u.name
    ORDER BY a.completed_at DESC
  `;
}

// Returns the most-recent raw_correct count per section for a student (scored questions only)
export async function getActScoredRawForStudent(studentId: string): Promise<{ section: string; raw_correct: number }[]> {
  const rows = await sql`
    SELECT
      a.section,
      SUM(CASE WHEN r.is_correct AND ak.is_scored THEN 1 ELSE 0 END)::int AS raw_correct
    FROM act_test_attempts a
    JOIN act_test_responses r ON r.attempt_id = a.id
    JOIN act_answer_key ak ON ak.section = a.section AND ak.question_number = r.question_number
    WHERE a.student_id = ${studentId}
      AND a.completed_at IS NOT NULL
      AND a.id IN (
        SELECT DISTINCT ON (section) id
        FROM act_test_attempts
        WHERE student_id = ${studentId} AND completed_at IS NOT NULL
        ORDER BY section, completed_at DESC
      )
    GROUP BY a.section
  `;
  return rows as { section: string; raw_correct: number }[];
}

export async function insertActCompositeResult(
  studentId: string,
  testName: string,
  composite: number,
  englishScale: number,
  mathScale: number,
  readingScale: number
) {
  return sql`
    INSERT INTO test_results
      (student_id, test_name, test_date, total_score, math_score, act_english_score, act_reading_score, score_type)
    VALUES
      (${studentId}, ${testName}, NOW(), ${composite}, ${mathScale}, ${englishScale}, ${readingScale}, 'act')
    ON CONFLICT (student_id, test_name, score_type) DO NOTHING
  `;
}

// ── Worksheets ────────────────────────────────────────────────────────────────

export async function getAllWorksheets() {
  return sql`
    SELECT w.id, w.title, w.created_at,
           a.name AS created_by_name,
           (SELECT COUNT(*) FROM worksheet_steps ws WHERE ws.worksheet_id = w.id) AS step_count
    FROM worksheets w
    JOIN users a ON a.id = w.created_by
    ORDER BY w.created_at DESC
  `;
}

export async function createWorksheet(title: string, createdBy: string) {
  const rows = await sql`
    INSERT INTO worksheets (title, created_by)
    VALUES (${title}, ${createdBy})
    RETURNING *
  `;
  return rows[0];
}

export async function getWorksheetById(id: string) {
  const rows = await sql`SELECT * FROM worksheets WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function deleteWorksheet(id: string) {
  await sql`DELETE FROM worksheets WHERE id = ${id}`;
}

export async function getWorksheetSteps(worksheetId: string) {
  return sql`
    SELECT * FROM worksheet_steps
    WHERE worksheet_id = ${worksheetId}
    ORDER BY step_order ASC
  `;
}

export async function createWorksheetStep(
  worksheetId: string,
  stepOrder: number,
  title: string,
  type: 'instruction' | 'problems' | 'warm_up',
  stageLabel: string | null,
  lockedNav: boolean,
  pdfUrl: string | null,
) {
  const rows = await sql`
    INSERT INTO worksheet_steps (worksheet_id, step_order, title, type, stage_label, locked_nav, pdf_url)
    VALUES (${worksheetId}, ${stepOrder}, ${title}, ${type}, ${stageLabel}, ${lockedNav}, ${pdfUrl})
    RETURNING *
  `;
  return rows[0];
}

export async function updateWorksheetStep(
  stepId: string,
  fields: {
    title?: string;
    stageLabel?: string | null;
    lockedNav?: boolean;
    pdfUrl?: string | null;
    stepOrder?: number;
  },
) {
  const rows = await sql`
    UPDATE worksheet_steps SET
      title       = COALESCE(${fields.title ?? null}, title),
      stage_label = CASE WHEN ${fields.stageLabel !== undefined} THEN ${fields.stageLabel ?? null} ELSE stage_label END,
      locked_nav  = COALESCE(${fields.lockedNav ?? null}, locked_nav),
      pdf_url     = CASE WHEN ${fields.pdfUrl !== undefined} THEN ${fields.pdfUrl ?? null} ELSE pdf_url END,
      step_order  = COALESCE(${fields.stepOrder ?? null}, step_order)
    WHERE id = ${stepId}
    RETURNING *
  `;
  return rows[0];
}

export async function deleteWorksheetStep(stepId: string) {
  await sql`DELETE FROM worksheet_steps WHERE id = ${stepId}`;
}

export async function reorderWorksheetSteps(worksheetId: string, orderedStepIds: string[]) {
  for (let i = 0; i < orderedStepIds.length; i++) {
    await sql`
      UPDATE worksheet_steps SET step_order = ${i + 1}
      WHERE id = ${orderedStepIds[i]} AND worksheet_id = ${worksheetId}
    `;
  }
}

export async function getWorksheetStepPages(stepId: string) {
  return sql`
    SELECT * FROM worksheet_step_pages
    WHERE step_id = ${stepId}
    ORDER BY page_number ASC
  `;
}

export async function insertWorksheetStepPage(stepId: string, pageNumber: number, imageUrl: string) {
  const rows = await sql`
    INSERT INTO worksheet_step_pages (step_id, page_number, image_url)
    VALUES (${stepId}, ${pageNumber}, ${imageUrl})
    RETURNING *
  `;
  return rows[0];
}

export async function deleteWorksheetStepPage(pageId: string) {
  await sql`DELETE FROM worksheet_step_pages WHERE id = ${pageId}`;
}

export async function getWorksheetStepPositions(stepId: string) {
  const rows = await sql`
    SELECT * FROM worksheet_step_positions
    WHERE step_id = ${stepId}
    ORDER BY question_number ASC, page_number ASC
  `;
  return rows.map((r: Record<string, unknown>) => ({
    ...r,
    x_percent: Number(r.x_percent),
    y_percent: Number(r.y_percent),
  }));
}

export async function upsertWorksheetStepPosition(
  stepId: string,
  questionNumber: number,
  pageNumber: number,
  xPercent: number,
  yPercent: number,
) {
  const rows = await sql`
    INSERT INTO worksheet_step_positions (step_id, question_number, page_number, x_percent, y_percent)
    VALUES (${stepId}, ${questionNumber}, ${pageNumber}, ${xPercent}, ${yPercent})
    RETURNING *
  `;
  return rows[0];
}

export async function deleteWorksheetStepPosition(positionId: string) {
  await sql`DELETE FROM worksheet_step_positions WHERE id = ${positionId}`;
}

export async function getWorksheetStepAnswerKey(stepId: string) {
  return sql`
    SELECT * FROM worksheet_step_answer_key
    WHERE step_id = ${stepId}
    ORDER BY question_number ASC
  `;
}

export async function saveWorksheetStepAnswerKey(
  stepId: string,
  entries: { questionNumber: number; correctAnswer: string }[],
) {
  await sql`DELETE FROM worksheet_step_answer_key WHERE step_id = ${stepId}`;
  for (const e of entries) {
    await sql`
      INSERT INTO worksheet_step_answer_key (step_id, question_number, correct_answer)
      VALUES (${stepId}, ${e.questionNumber}, ${e.correctAnswer})
    `;
  }
}

export async function getWorksheetsByStudent(studentId: string) {
  return sql`
    SELECT DISTINCT w.id, w.title, w.created_at,
           a.name AS created_by_name,
           (SELECT COUNT(*) FROM worksheet_steps ws WHERE ws.worksheet_id = w.id) AS step_count,
           (SELECT s.proposed_time FROM sessions s WHERE s.worksheet_id = w.id AND s.student_id = ${studentId} ORDER BY s.proposed_time ASC LIMIT 1) AS session_date
    FROM worksheets w
    JOIN users a ON a.id = w.created_by
    WHERE EXISTS (
      SELECT 1 FROM sessions s WHERE s.worksheet_id = w.id AND s.student_id = ${studentId}
    )
    ORDER BY w.created_at DESC
  `;
}

export async function getWorksheetStepResponses(stepId: string, studentId: string) {
  return sql`
    SELECT * FROM worksheet_step_responses
    WHERE step_id = ${stepId} AND student_id = ${studentId}
    ORDER BY question_number ASC
  `;
}

export async function upsertWorksheetStepResponse(
  stepId: string,
  studentId: string,
  questionNumber: number,
  selectedAnswer: string | null,
  eliminatedChoices: string[],
) {
  await sql`
    INSERT INTO worksheet_step_responses (step_id, student_id, question_number, selected_answer, eliminated_choices, updated_at)
    VALUES (${stepId}, ${studentId}, ${questionNumber}, ${selectedAnswer}, ${eliminatedChoices}, now())
    ON CONFLICT (step_id, student_id, question_number)
    DO UPDATE SET
      selected_answer    = EXCLUDED.selected_answer,
      eliminated_choices = EXCLUDED.eliminated_choices,
      updated_at         = now()
  `;
}

export async function getWorksheetStepProblems(stepId: string) {
  return sql`
    SELECT id, step_id, question_number, question_image_url, correct_answer, explanation_image_url,
           explanation_image_urls, question_type, accepted_answers,
           answer_box_x, answer_box_y, answer_box_width, answer_box_height,
           created_at
    FROM worksheet_step_problems
    WHERE step_id = ${stepId}
    ORDER BY question_number ASC
  `;
}

export async function insertWorksheetStepProblem(stepId: string, questionNumber: number, questionImageUrl: string) {
  const rows = await sql`
    INSERT INTO worksheet_step_problems (step_id, question_number, question_image_url)
    VALUES (${stepId}, ${questionNumber}, ${questionImageUrl})
    RETURNING *
  `;
  return rows[0];
}

export async function deleteWorksheetStepProblem(problemId: string) {
  await sql`DELETE FROM worksheet_step_problems WHERE id = ${problemId}`;
}

export async function updateWorksheetStepProblemAnswerKey(
  stepId: string,
  questionNumber: number,
  correctAnswer: string | null,
  explanationImageUrl: string | null,
  questionType: 'multiple_choice' | 'open_ended' = 'multiple_choice',
  acceptedAnswers: string[] = [],
  answerBoxX: number | null = null,
  answerBoxY: number | null = null,
  answerBoxWidth: number | null = null,
  answerBoxHeight: number | null = null,
  explanationImageUrls: string[] = [],
  updateAnswerBox: boolean = false,
) {
  const primaryUrl = explanationImageUrls.length > 0 ? explanationImageUrls[0] : explanationImageUrl;
  const rows = await sql`
    UPDATE worksheet_step_problems
    SET correct_answer          = ${correctAnswer},
        explanation_image_url   = ${primaryUrl},
        explanation_image_urls  = ${explanationImageUrls},
        question_type           = ${questionType},
        accepted_answers        = ${acceptedAnswers},
        answer_box_x            = CASE WHEN ${updateAnswerBox} THEN ${answerBoxX} ELSE answer_box_x END,
        answer_box_y            = CASE WHEN ${updateAnswerBox} THEN ${answerBoxY} ELSE answer_box_y END,
        answer_box_width        = CASE WHEN ${updateAnswerBox} THEN ${answerBoxWidth} ELSE answer_box_width END,
        answer_box_height       = CASE WHEN ${updateAnswerBox} THEN ${answerBoxHeight} ELSE answer_box_height END
    WHERE step_id = ${stepId} AND question_number = ${questionNumber}
    RETURNING *
  `;
  return rows[0];
}

// ─── Warm-Up Step ─────────────────────────────────────────────────────────────

export async function getPreviousWorksheetAssignedDate(
  studentId: string,
  currentWorksheetId: string,
): Promise<Date | null> {
  const rows = await sql`
    SELECT s.proposed_time
    FROM sessions s
    JOIN worksheets w ON s.worksheet_id = w.id
    WHERE s.student_id = ${studentId}
      AND w.id != ${currentWorksheetId}
    ORDER BY s.proposed_time DESC
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return new Date(rows[0].proposed_time as string);
}

export async function getMissedBreakfastProblemsSince(studentId: string, sinceDate: Date) {
  return sql`
    SELECT
      bp.id,
      bp.question,
      bp.choice_a,
      bp.choice_b,
      bp.choice_c,
      bp.choice_d,
      bp.correct_answer,
      bp.category,
      bp.question_image_url,
      bp.crop_top_px,
      bp.crop_bottom_px,
      bp.image_width_px,
      bp.image_height_px,
      sbr.student_answer,
      sba.assigned_date
    FROM student_breakfast_responses sbr
    JOIN student_breakfast_assignments sba ON sba.id = sbr.assignment_id
    JOIN breakfast_problems bp ON bp.id = sbr.problem_id
    WHERE sbr.student_id = ${studentId}
      AND sbr.is_correct = false
      AND sba.assigned_date >= ${sinceDate.toISOString().split('T')[0]}
    ORDER BY sba.assigned_date ASC, bp.category ASC
  `;
}

export async function hasAnyBreakfastHistory(studentId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM student_breakfast_responses
    WHERE student_id = ${studentId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function getWorksheetAnnotations(
  stepId: string,
  studentId: string,
  questionNumber: number,
): Promise<unknown[]> {
  const rows = await sql`
    SELECT annotations FROM worksheet_step_responses
    WHERE step_id = ${stepId}
      AND student_id = ${studentId}
      AND question_number = ${questionNumber}
    LIMIT 1
  `;
  return (rows[0]?.annotations ?? []) as unknown[];
}

export async function saveWorksheetAnnotations(
  stepId: string,
  studentId: string,
  questionNumber: number,
  annotations: unknown[],
): Promise<void> {
  await sql`
    INSERT INTO worksheet_step_responses (step_id, student_id, question_number, annotations, updated_at)
    VALUES (${stepId}, ${studentId}, ${questionNumber}, ${JSON.stringify(annotations)}, now())
    ON CONFLICT (step_id, student_id, question_number)
    DO UPDATE SET annotations = EXCLUDED.annotations, updated_at = now()
  `;
}

export async function getBreakfastAnnotations(
  assignmentId: string,
): Promise<unknown[]> {
  const rows = await sql`
    SELECT annotations FROM student_breakfast_assignments
    WHERE id = ${assignmentId}
    LIMIT 1
  `;
  return (rows[0]?.annotations ?? []) as unknown[];
}

export async function saveBreakfastAnnotations(
  assignmentId: string,
  annotations: unknown[],
): Promise<void> {
  await sql`
    UPDATE student_breakfast_assignments
    SET annotations = ${JSON.stringify(annotations)}
    WHERE id = ${assignmentId}
  `;
}
