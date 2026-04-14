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
