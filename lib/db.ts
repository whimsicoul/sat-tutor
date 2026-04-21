import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
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
  fields: { name?: string; email?: string; role?: string; active?: boolean }
) {
  const rows = await sql`
    UPDATE users
    SET
      name    = COALESCE(${fields.name ?? null}, name),
      email   = COALESCE(${fields.email ?? null}, email),
      role    = COALESCE(${fields.role ?? null}, role),
      active  = COALESCE(${fields.active ?? null}, active)
    WHERE id = ${id}
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

export async function adminBulkUpdateSessionStatus(ids: string[], status: string) {
  if (ids.length === 0) return [];
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
