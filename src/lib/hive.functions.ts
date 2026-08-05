import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PublishInput = z.object({
  videoPath: z.string().min(1),
  caption: z.string().trim().max(500),
  tags: z.array(z.string().trim().max(24)).max(8),
  kind: z.enum(["original", "duet", "stitch"]),
  parentVideoId: z.string().uuid().nullable(),
});

type Verdict = {
  decision: "approved" | "rejected";
  positivity: number;
  reason: string;
  suggestedTags: string[];
};

async function judge(caption: string): Promise<Verdict> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { decision: "approved", positivity: 60, reason: "Moderator offline", suggestedTags: [] };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-lite",
      messages: [
        {
          role: "system",
          content:
            "You are Hive's positivity moderator for a private short-video community. Approve posts that are kind, uplifting, funny-without-cruelty, creative or neutral. Reject hate, harassment, bullying, sexual content, graphic violence, self-harm, scams, spam, or targeted negativity. Reply ONLY with JSON: {\"decision\":\"approved\"|\"rejected\",\"positivity\":0-100,\"reason\":\"one short sentence\",\"suggestedTags\":[\"tag\"]}",
        },
        { role: "user", content: `Caption to review: "${caption || "(no caption)"}"` },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("The hive moderator is busy right now. Try again in a moment.");
  if (res.status === 402) throw new Error("AI moderation credits are exhausted. Add credits to keep the hive safe.");
  if (!res.ok) return { decision: "approved", positivity: 55, reason: "Auto-approved (moderator unavailable)", suggestedTags: [] };

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  try {
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as Partial<Verdict>;
    return {
      decision: parsed.decision === "rejected" ? "rejected" : "approved",
      positivity: Math.max(0, Math.min(100, Number(parsed.positivity ?? 60))),
      reason: String(parsed.reason ?? "Reviewed by the hive moderator"),
      suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags.slice(0, 5).map(String) : [],
    };
  } catch {
    return { decision: "approved", positivity: 55, reason: "Reviewed by the hive moderator", suggestedTags: [] };
  }
}

export const publishVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PublishInput.parse(input))
  .handler(async ({ data, context }) => {
    const verdict = await judge(data.caption);
    const tags = Array.from(new Set([...data.tags, ...verdict.suggestedTags])).slice(0, 8);

    const { data: row, error } = await context.supabase
      .from("videos")
      .insert({
        user_id: context.userId,
        video_url: data.videoPath,
        caption: data.caption,
        tags,
        kind: data.kind,
        parent_video_id: data.parentVideoId,
        status: verdict.decision,
        moderation_reason: verdict.reason,
        positivity_score: verdict.positivity,
      })
      .select("id, status, moderation_reason, positivity_score")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

const CommentInput = z.object({ videoId: z.string().uuid(), body: z.string().trim().min(1).max(400) });

export const postComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CommentInput.parse(input))
  .handler(async ({ data, context }) => {
    const verdict = await judge(data.body);
    if (verdict.decision === "rejected") {
      return { ok: false as const, reason: verdict.reason };
    }
    const { error } = await context.supabase
      .from("comments")
      .insert({ video_id: data.videoId, user_id: context.userId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true as const, reason: verdict.reason };
  });

const MessageInput = z.object({ recipientId: z.string().uuid(), body: z.string().trim().min(1).max(1000) });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MessageInput.parse(input))
  .handler(async ({ data, context }) => {
    const verdict = await judge(data.body);
    if (verdict.decision === "rejected") {
      return { ok: false as const, reason: verdict.reason };
    }
    const { error } = await context.supabase
      .from("messages")
      .insert({ sender_id: context.userId, recipient_id: data.recipientId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true as const, reason: verdict.reason };
  });

const ModerateInput = z.object({
  videoId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(300),
});

export const staffModerate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ModerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!isStaff) throw new Error("Only hive moderators can do that.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("videos")
      .update({ status: data.decision, moderation_reason: data.reason || "Reviewed by a human moderator" })
      .eq("id", data.videoId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AppealDecisionInput = z.object({
  appealId: z.string().uuid(),
  status: z.enum(["upheld", "denied"]),
  note: z.string().trim().max(300),
});

export const decideAppeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AppealDecisionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!isStaff) throw new Error("Only hive moderators can do that.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: appeal, error: readErr } = await supabaseAdmin
      .from("appeals")
      .select("id, video_id")
      .eq("id", data.appealId)
      .single();
    if (readErr) throw new Error(readErr.message);

    const { error } = await supabaseAdmin
      .from("appeals")
      .update({ status: data.status, decision_note: data.note })
      .eq("id", data.appealId);
    if (error) throw new Error(error.message);

    if (data.status === "upheld") {
      await supabaseAdmin
        .from("videos")
        .update({ status: "approved", moderation_reason: "Restored after a successful appeal" })
        .eq("id", appeal.video_id);
    }
    return { ok: true };
  });
