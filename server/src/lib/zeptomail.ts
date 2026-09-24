/**
 * PBS assessment confirmation via ZeptoMail.
 * The sender name is the product, never a leftover label from another project.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FROM_NAME = 'PBS AI Readiness Assessment';
const COMPANY = 'Proficient Business Service Ltd.';
const PRODUCT = 'AI Readiness Assessment';
const TAGLINE = 'Integrity · Service · Excellence';

export interface AssessmentMail {
  toEmail: string;
  toName: string;
  companyName: string;
}

export function isZeptoConfigured(): boolean {
  return Boolean(process.env.ZEPTOMAIL_TOKEN && process.env.ZEPTOMAIL_URL && process.env.MAIL_FROM_ADDRESS);
}

export async function sendAssessmentReceivedEmail(mail: AssessmentMail): Promise<void> {
  const url = process.env.ZEPTOMAIL_URL?.trim();
  const token = process.env.ZEPTOMAIL_TOKEN?.trim();
  const fromAddress = process.env.MAIL_FROM_ADDRESS?.trim();
  if (!url || !token || !fromAddress) throw new Error('ZeptoMail is not configured');
  if (!mail.toEmail) throw new Error('Client email is missing');

  const logo = readLogo();
  const html = renderAssessmentEmail(mail, Boolean(logo));

  const payload: Record<string, unknown> = {
    from: { address: fromAddress, name: FROM_NAME },
    to: [{ email_address: { address: mail.toEmail, name: mail.toName || mail.companyName } }],
    subject: `Your AI Readiness Assessment — ${mail.companyName}`,
    htmlbody: html,
  };
  if (logo) {
    payload.inline_images = [{ mime_type: 'image/png', content: logo, cid: 'pbs-logo' }];
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ZeptoMail ${res.status}: ${detail.slice(0, 400)}`);
  }
}

/** Send once. Failures are logged and returned so the assessment save still succeeds. */
export async function notifyAssessmentReceived(mail: AssessmentMail): Promise<{ emailSent: boolean; emailError?: string }> {
  if (!isZeptoConfigured() || !mail.toEmail) {
    return { emailSent: false, emailError: 'Email is not configured or the client has no address' };
  }
  try {
    await sendAssessmentReceivedEmail(mail);
    return { emailSent: true };
  } catch (err) {
    const emailError = err instanceof Error ? err.message : 'Email failed';
    console.error('[zeptomail]', err);
    return { emailSent: false, emailError };
  }
}

function readLogo(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.join(here, '../../assets/pbs-logo.png');
  try {
    return fs.readFileSync(file).toString('base64');
  } catch {
    console.warn('[zeptomail] logo missing at', file);
    return null;
  }
}

function renderAssessmentEmail(mail: AssessmentMail, withLogo: boolean): string {
  const name = escapeHtml(mail.toName || 'there');
  const company = escapeHtml(mail.companyName);
  const logo = withLogo
    ? `<img src="cid:pbs-logo" width="56" height="56" alt="PBS" style="display:block;border:0;border-radius:28px;background:#ffffff;" />`
    : '';

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f6f5f2;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f2;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#0f1f35;padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">${logo}</td>
                  <td style="vertical-align:middle;padding-left:14px;">
                    <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;">Proficient Business Service</div>
                    <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;color:#a5cbe7;margin-top:2px;">${PRODUCT}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:4px;background:#b8955c;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:32px;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0c2340;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#0066b3;font-weight:700;">Assessment received</p>
              <h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;font-weight:650;">Thank you, ${name}.</h1>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#334155;">
                We have your AI readiness assessment for <strong style="color:#0f1f35;">${company}</strong>.
                A consultant will review the enhancements, expectations, and gaps you described.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9f2f9;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
                    <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#0066b3;font-weight:700;">What happens next</div>
                    <p style="margin:8px 0 0;font-size:15px;line-height:1.55;color:#0c2340;">
                      We read your answers against the questions prepared for ${company}, then follow up with a practical view of where to start.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">
                If you need us sooner, call +1 242 397 3100 or write to info@pbshope.com.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;background:#0f1f35;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
              <div style="font-size:13px;color:#b8955c;font-weight:700;">${TAGLINE}</div>
              <div style="margin-top:6px;font-size:13px;line-height:1.5;color:#d2e5f3;">
                ${COMPANY}<br/>
                Total I.T. Care · #25 East Ave Centreville, Nassau, Bahamas
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
