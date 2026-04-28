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

export async function getProblemSetsByStudent(studentId: string) {
  return sql`
    SELECT ps.id, ps.title, ps.problem_pdf_url, ps.created_at,
           u.name AS tutor_name
    FROM problem_sets ps
    JOIN users u ON u.id = ps.tutor_id
    WHERE ps.student_id = ${studentId}
    ORDER BY ps.created_at DESC
  `;
}

export async function getProblemSetsByTutor(tutorId: string) {
  return sql`
    SELECT ps.id, ps.title, ps.problem_pdf_url, ps.answer_pdf_url, ps.created_at,
           u.name AS student_name
    FROM problem_sets ps
    JOIN users u ON u.id = ps.student_id
    WHERE ps.tutor_id = ${tutorId}
    ORDER BY ps.created_at DESC
  `;
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
    VALUES (${tutorId}, ${studentId}, ${proposedTime}, 'pending', ${seriesId ?? null})
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

// ─── Admin: Problem Sets ──────────────────────────────────────────────────────

export async function getAllProblemSets() {
  return sql`
    SELECT ps.id, ps.title, ps.problem_pdf_url, ps.answer_pdf_url, ps.created_at,
           t.name AS tutor_name,
           s.name AS student_name
    FROM problem_sets ps
    JOIN users t ON t.id = ps.tutor_id
    JOIN users s ON s.id = ps.student_id
    ORDER BY ps.created_at DESC
  `;
}

export async function adminCreateProblemSet(
  title: string,
  tutorId: string,
  studentId: string,
  problemPdfUrl: string,
  answerPdfUrl?: string
) {
  const rows = await sql`
    INSERT INTO problem_sets (title, tutor_id, student_id, problem_pdf_url, answer_pdf_url)
    VALUES (${title}, ${tutorId}, ${studentId}, ${problemPdfUrl}, ${answerPdfUrl ?? null})
    RETURNING *
  `;
  return rows[0];
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
    SELECT id, test_date, created_at
    FROM sat_test_dates
    WHERE student_id = ${studentId}
    ORDER BY test_date ASC
  `;
}

export async function getSatDatesForTutorStudents(tutorId: string) {
  return sql`
    SELECT std.id, std.test_date, std.created_at,
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
    SELECT std.id, std.test_date, std.created_at,
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
    RETURNING id, student_id, test_date, created_at
  `;
  return rows[0];
}

export async function deleteSatDate(id: string) {
  await sql`DELETE FROM sat_test_dates WHERE id = ${id}`;
}

// ─── Tutor: Test Results ─────────────────────────────────────────────────────

export async function getTestResultsForTutorStudents(tutorId: string) {
  return sql`
    SELECT tr.id, tr.test_name, tr.test_date, tr.total_score, tr.math_score,
           tr.reading_writing_score, tr.notes, tr.pdf_url, tr.created_at,
           s.name AS student_name
    FROM test_results tr
    JOIN users s ON s.id = tr.student_id
    JOIN tutor_student_assignments tsa ON tsa.student_id = tr.student_id
    WHERE tsa.tutor_id = ${tutorId}
    ORDER BY tr.test_date DESC
  `;
}

// ─── Session ↔ Problem Set Attachments ───────────────────────────────────────

export async function getProblemSetsBySession(sessionId: string) {
  return sql`
    SELECT ps.id, ps.title, ps.problem_pdf_url, ps.answer_pdf_url
    FROM session_problem_sets sps
    JOIN problem_sets ps ON ps.id = sps.problem_set_id
    WHERE sps.session_id = ${sessionId}
    ORDER BY ps.created_at DESC
  `;
}

export async function getProblemSetsForSessionPair(tutorId: string, studentId: string) {
  return sql`
    SELECT id, title, problem_pdf_url, answer_pdf_url
    FROM problem_sets
    WHERE tutor_id = ${tutorId} AND student_id = ${studentId}
    ORDER BY created_at DESC
  `;
}

export async function setSessionProblemSets(sessionId: string, problemSetIds: string[]) {
  await sql`DELETE FROM session_problem_sets WHERE session_id = ${sessionId}`;
  if (problemSetIds.length === 0) return;
  await Promise.all(
    problemSetIds.map((psId) =>
      sql`INSERT INTO session_problem_sets (session_id, problem_set_id) VALUES (${sessionId}, ${psId})`
    )
  );
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
  }
) {
  const rows = await sql`
    UPDATE breakfast_problems SET
      question           = COALESCE(${fields.question        ?? null}, question),
      choice_a           = COALESCE(${fields.choice_a        ?? null}, choice_a),
      choice_b           = COALESCE(${fields.choice_b        ?? null}, choice_b),
      choice_c           = COALESCE(${fields.choice_c        ?? null}, choice_c),
      choice_d           = COALESCE(${fields.choice_d        ?? null}, choice_d),
      correct_answer     = COALESCE(${fields.correct_answer  ?? null}, correct_answer),
      answer_explanation = ${'answer_explanation' in fields ? fields.answer_explanation : null}::text,
      category           = ${'category'   in fields ? fields.category   : null}::text,
      skill              = ${'skill'       in fields ? fields.skill       : null}::text,
      difficulty         = ${'difficulty'  in fields ? fields.difficulty  : null}::text,
      crop_top_px        = COALESCE(${fields.crop_top_px    ?? null}::int, crop_top_px),
      crop_bottom_px     = COALESCE(${fields.crop_bottom_px ?? null}::int, crop_bottom_px)
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
      sbr.submitted_at
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
      sbr.student_answer,
      sbr.is_correct,
      sbr.submitted_at,
      sba.assigned_date,
      bp.question,
      bp.correct_answer,
      bp.category,
      u.id   AS student_id,
      u.name AS student_name
    FROM student_breakfast_responses sbr
    JOIN student_breakfast_assignments sba ON sba.id = sbr.assignment_id
    JOIN breakfast_problems bp             ON bp.id  = sbr.problem_id
    JOIN users u                           ON u.id   = sbr.student_id
    ORDER BY u.name ASC, sba.assigned_date DESC
  `;
}
