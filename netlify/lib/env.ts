/** Server-side configuration. Supabase falls back to the client's public values. */
export function serverEnv() {
  const env = process.env;
  return {
    supabaseUrl: env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? "",
    supabaseKey: env.SUPABASE_KEY ?? env.VITE_SUPABASE_KEY ?? "",
    resendApiKey: env.RESEND_API_KEY ?? env.NUXT_RESEND_API_KEY ?? "",
    uploadNotificationTo:
      env.UPLOAD_NOTIFICATION_TO ?? "jacobslunga21@yahoo.se",
    uploadNotificationFrom: env.UPLOAD_NOTIFICATION_FROM ?? "LiU Tentor <notifications@liutentor.se>",
    uploadReviewUrl: env.UPLOAD_REVIEW_URL ?? "https://admin.liutentor.se/admin/review",
  };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
