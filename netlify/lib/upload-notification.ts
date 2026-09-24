import { serverEnv } from "./env.ts";

export interface UploadedDocument {
  courseCode: string;
  originalFilename: string;
  examDate: string;
  fileType: "EXAM" | "SOLUTION";
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]!,
  );
}

/** Emails the reviewers a summary of new uploads. Returns false when not configured. */
export async function sendUploadNotification(files: UploadedDocument[]): Promise<boolean> {
  const config = serverEnv();
  if (!config.resendApiKey || !config.uploadNotificationTo) {
    console.warn("Upload notification skipped: RESEND_API_KEY or UPLOAD_NOTIFICATION_TO is not set");
    return false;
  }

  const rows = files
    .map(
      (file) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827">${escapeHtml(file.courseCode)}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#374151">${escapeHtml(file.examDate)}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#374151">${file.fileType === "SOLUTION" ? "Facit" : "Tenta"}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280">${escapeHtml(file.originalFilename)}</td>
        </tr>`,
    )
    .join("");

  const count = files.length;
  const subject = `${count} ${count === 1 ? "ny fil" : "nya filer"} väntar på granskning`;
  const html = `<!doctype html>
<html lang="sv">
  <body style="margin:0;background:#f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111827">
    <div style="display:none;max-height:0;overflow:hidden">${subject} i LiU Tentor.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;overflow:hidden;box-shadow:0 8px 24px rgba(17,24,39,.08)">
          <tr><td style="padding:28px 32px;background:#111827;color:#ffffff">
            <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#93c5fd">LiU Tentor</div>
            <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25">Nytt material att granska</h1>
          </td></tr>
          <tr><td style="padding:28px 32px 12px">
            <p style="margin:0;font-size:16px;line-height:1.6;color:#374151">Någon har laddat upp <strong>${count} ${count === 1 ? "fil" : "filer"}</strong>. Här är en snabb sammanställning:</p>
          </td></tr>
          <tr><td style="padding:12px 32px 24px;overflow-x:auto">
            <table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-collapse:separate;border-spacing:0;font-size:14px">
              <thead><tr style="background:#f9fafb;text-align:left">
                <th style="padding:11px 16px">Kurs</th><th style="padding:11px 16px">Datum</th><th style="padding:11px 16px">Typ</th><th style="padding:11px 16px">Filnamn</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </td></tr>
          <tr><td style="padding:0 32px 32px">
            <a href="${escapeHtml(config.uploadReviewUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px">Öppna granskningssidan →</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `upload-${crypto.randomUUID()}`,
    },
    body: JSON.stringify({
      from: config.uploadNotificationFrom,
      to: [config.uploadNotificationTo],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
  return true;
}
