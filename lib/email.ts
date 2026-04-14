import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = 'DC SAT Tutor <onboarding@resend.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function emailStudentSessionProposed(opts: {
  studentEmail: string;
  studentName: string;
  proposedTime: Date;
  tutorName: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.studentEmail,
    subject: 'New tutoring session proposed',
    html: `
      <p>Hi ${opts.studentName},</p>
      <p><strong>${opts.tutorName}</strong> has proposed a tutoring session on
         <strong>${opts.proposedTime.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</strong>.</p>
      <p><a href="${APP_URL}/student/schedule">Log in to approve or deny →</a></p>
    `,
  });
}

export async function emailTutorSessionStatusChanged(opts: {
  tutorEmail: string;
  studentName: string;
  status: 'approved' | 'denied';
  proposedTime: Date;
}) {
  const verb = opts.status === 'approved' ? 'approved' : 'declined';
  await resend.emails.send({
    from: FROM,
    to: opts.tutorEmail,
    subject: `Session ${verb} by ${opts.studentName}`,
    html: `
      <p>${opts.studentName} has <strong>${verb}</strong> the session scheduled for
         ${opts.proposedTime.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}.</p>
      <p><a href="${APP_URL}/tutor/schedule">View your schedule →</a></p>
    `,
  });
}
