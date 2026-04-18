import { Resend } from 'resend';
import { getServerSupportEmail } from './supportEmail';

const resendApiKey = process.env.RESEND_API_KEY;
export const supportEmail = getServerSupportEmail();
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Shared HTML shell for transactional messages. */
function brandEmailHtml(title: string, innerHtml: string): string {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${safeTitle}</title>
</head>
<body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px 24px;border:1px solid #e4e4e7;">
        <tr><td style="font-size:15px;line-height:1.6;">${innerHtml}</td></tr>
        <tr><td style="padding-top:20px;margin-top:16px;font-size:12px;color:#71717a;border-top:1px solid #f4f4f5;">Pest Trace · Pest control compliance</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendMail(payload: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}) {
  if (!resend) {
    throw new Error('Email service is not configured. Set RESEND_API_KEY.');
  }

  return resend.emails.send({
    from: `Pest Trace <${supportEmail}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

export async function sendWelcomeEmail(email: string, fullName?: string, businessName?: string) {
  const userName = fullName ? escapeHtml(fullName) : 'Pest Trace user';
  const companyName = businessName ? escapeHtml(businessName) : null;
  const appLink = `${appUrl}/auth/verify?email=${encodeURIComponent(email)}`;
  const inner = `
    <p>Hi ${userName},</p>
    <p>Welcome to Pest Trace! Your account has been created successfully.</p>
    ${companyName ? `<p>Your business: <strong>${companyName}</strong></p>` : ''}
    <p>To complete setup, verify your email address by clicking the link in the verification email we sent to <strong>${escapeHtml(email)}</strong>.</p>
    <p>If you did not receive a verification email, please visit <a href="${appLink}">this verification help page</a>.</p>
    <p>Need help? Email us at <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.</p>
    <p>Thanks,<br />The Pest Trace team</p>
  `;
  const text = `Hi ${fullName ?? 'Pest Trace user'},

Welcome to Pest Trace! Your account has been created successfully.
${companyName ? `Your business: ${businessName}

` : ''}
To complete setup, verify your email address by clicking the link in the verification email we sent to ${email}.

If you did not receive your verification email, visit ${appLink}.

Need help? Email us at ${supportEmail}.

Thanks,
The Pest Trace team`;

  await sendMail({
    to: [email],
    subject: 'Welcome to Pest Trace',
    html: brandEmailHtml('Welcome to Pest Trace', inner),
    text,
  });
}

export async function sendVerificationReminderEmail(email: string) {
  const appLink = `${appUrl}/auth/verify?email=${encodeURIComponent(email)}`;
  const inner = `
    <p>Hi there,</p>
    <p>We have sent a verification email to <strong>${escapeHtml(email)}</strong>.</p>
    <p>Click the link in that email to activate your Pest Trace account and return to the dashboard.</p>
    <p>If you still do not see the verification email, check your spam folder or visit <a href="${appLink}">this page</a> for additional instructions.</p>
    <p>If you need help, contact us at <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.</p>
    <p>Thanks,<br />The Pest Trace team</p>
  `;
  const text = `Hi there,

We have sent a verification email to ${email}.

Click the link in that email to activate your Pest Trace account and return to the dashboard.

If you still do not see the verification email, check your spam folder or visit ${appLink} for additional instructions.

If you need help, contact us at ${supportEmail}.

Thanks,
The Pest Trace team`;

  await sendMail({
    to: [email],
    subject: 'Verify your Pest Trace account',
    html: brandEmailHtml('Verify your Pest Trace account', inner),
    text,
  });
}

export async function sendAccountDeletionEmail(email: string, companyName?: string) {
  const inner = `
    <p>Hi,</p>
    <p>Your Pest Trace account has been deleted and your company data has been removed.</p>
    ${companyName ? `<p>Company: <strong>${escapeHtml(companyName)}</strong></p>` : ''}
    <p>If this was not requested by you, please contact us immediately at <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.</p>
    <p>Thank you for trying Pest Trace.</p>
  `;
  const text = `Hi,

Your Pest Trace account has been deleted and your company data has been removed.
${companyName ? `Company: ${companyName}

` : ''}
If this was not requested by you, please contact us immediately at ${supportEmail}.

Thank you for trying Pest Trace.`;

  await sendMail({
    to: [email],
    subject: 'Your Pest Trace account has been deleted',
    html: brandEmailHtml('Account deleted', inner),
    text,
  });
}

export async function sendUpgradeNotificationEmail(email: string, plan: string) {
  const planLabel = plan === 'business' ? 'Business' : plan === 'pro' ? 'Pro' : plan;
  const inner = `
    <p>Hi,</p>
    <p>Your Pest Trace subscription is now active on the <strong>${escapeHtml(planLabel)}</strong> plan.</p>
    <p>You can now access improved reporting, analytics, and higher tier features inside your dashboard.</p>
    <p>If you have questions about your plan or billing, reach out at <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.</p>
    <p>Thanks,<br />The Pest Trace team</p>
  `;
  const text = `Hi,

Your Pest Trace subscription is now active on the ${planLabel} plan.

You can now access improved reporting, analytics, and higher tier features inside your dashboard.

If you have questions about your plan or billing, reach out at ${supportEmail}.

Thanks,
The Pest Trace team`;

  await sendMail({
    to: [email],
    subject: `Your Pest Trace ${planLabel} subscription is active`,
    html: brandEmailHtml('Subscription active', inner),
    text,
  });
}

export async function sendVerificationEmail(email: string, token: string, userName?: string) {
  const verificationUrl = `${appUrl}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const greeting = userName ? escapeHtml(userName) : 'there';
  const inner = `
    <p>Hi ${greeting},</p>
    <p>Please click the button below to verify your Pest Trace email address:</p>
    <p style="text-align:center;">
      <a href="${verificationUrl}" style="background-color:#3B82F6;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block;">
        Verify email address
      </a>
    </p>
    <p>This verification link will expire in 24 hours.</p>
    <p>If you did not create a Pest Trace account, please ignore this email.</p>
    <p>Thanks,<br />The Pest Trace team</p>
  `;
  const text = `Hi ${userName ?? 'there'},

Please verify your email by visiting this link:
${verificationUrl}

This link expires in 24 hours.

If you did not create a Pest Trace account, please ignore this email.

Thanks,
The Pest Trace team`;

  await sendMail({
    to: [email],
    subject: 'Verify your Pest Trace email address',
    html: brandEmailHtml('Verify your email', inner),
    text,
  });
}
