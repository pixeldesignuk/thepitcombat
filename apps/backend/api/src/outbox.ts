import type pg from 'pg';
import { Resend } from 'resend';

type EmailSender = Pick<Resend, 'emails'>;
type EmailSettings = { resendKey: string; resendFrom: string; replyTo?: string };

export function startOutbox(pool: pg.Pool, settings: EmailSettings, report: (message: string) => void) {
  if (!settings.resendKey || !settings.resendFrom) {
    report('Email delivery is unconfigured. Confirmations remain queued in PostgreSQL.');
    return async () => {};
  }
  const resend = new Resend(settings.resendKey);
  let running: Promise<void> | undefined;
  const run = () => { if (!running) running = processOutbox(pool, resend, settings, report).catch(() => report('Email worker could not reach its queue.')).finally(() => { running = undefined; }); };
  const interval = setInterval(run, 5000);
  interval.unref();
  run();
  return async () => { clearInterval(interval); await running; };
}

export async function processOutbox(pool: pg.Pool, resend: EmailSender, settings: EmailSettings, report: (message: string) => void) {
    await pool.query("UPDATE registration_email_outbox SET status='failed',last_error='retry_limit_reached' WHERE status='processing' AND attempts>=6 AND next_attempt_at<=NOW()");
    const { rows: [job] } = await pool.query(`UPDATE registration_email_outbox SET status='processing', attempts=attempts+1, next_attempt_at=NOW()+INTERVAL '5 minutes' WHERE registration_id=(SELECT registration_id FROM registration_email_outbox WHERE status IN ('pending','processing') AND next_attempt_at<=NOW() AND attempts<6 ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING registration_id,attempts`);
    if (!job) return;
    try {
      const { rows: [registration] } = await pool.query('SELECT email FROM registrations WHERE id=$1', [job.registration_id]);
      const result = await resend.emails.send({
        from: settings.resendFrom, to: registration.email, replyTo: settings.replyTo,
        subject: 'You’re on The Pit interest list',
        text: 'Thanks for registering your interest in The Pit Combat Academy.\n\nWe’ll keep you updated about opening and training. Your first session is free. This confirms your interest only; it is not a class booking or a guaranteed place.\n\nTo stop opening updates, reply to this email.',
      }, { idempotencyKey: `registration-${job.registration_id}` });
      if (result.error) throw new Error(result.error.name);
      await pool.query("UPDATE registration_email_outbox SET status='sent',sent_at=NOW(),last_error=NULL WHERE registration_id=$1", [job.registration_id]);
    } catch {
      await pool.query("UPDATE registration_email_outbox SET status=CASE WHEN attempts>=6 THEN 'failed' ELSE 'pending' END,last_error='delivery_failed',next_attempt_at=NOW()+($2 * INTERVAL '1 second') WHERE registration_id=$1", [job.registration_id, Math.min(3600, 30 * 2 ** job.attempts)]);
      report('A confirmation could not be delivered; its retry status is saved.');
    }
}
