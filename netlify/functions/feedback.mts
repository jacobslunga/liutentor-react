import { createClient } from "@supabase/supabase-js";
import { json, serverEnv } from "../lib/env.ts";

/** Stores a feedback message. */
export default async (req: Request) => {
  if (req.method !== "POST") return json({ message: "Method not allowed" }, 405);

  let body: { name?: string; message?: string; part_of_website?: string; liu_mail?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ message: "Invalid body" }, 400);
  }
  if (!body.message || !body.liu_mail) return json({ message: "Missing required fields" }, 400);

  const config = serverEnv();
  const supabase = createClient(config.supabaseUrl, config.supabaseKey);
  const { error } = await supabase.from("feedback").insert([
    {
      name: body.name,
      message: body.message,
      part_of_website: body.part_of_website,
      liu_mail: body.liu_mail,
    },
  ]);
  if (error) return json({ message: error.message }, 500);

  return json({ success: true });
};

export const config = { path: "/api/feedback" };
