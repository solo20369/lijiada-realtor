/**
 * GET /api/cron/appointment-outbox —— 待辦籃的「補救網」
 *
 * 主要的通知是在預約成立當下就 inline 寄出去的（見 appointment-outbox-worker.ts），
 * 這支只負責把當下失敗、正在等重試的工單補跑掉。
 *
 * 排程設在 vercel.json，一天一次 —— 因為 Vercel 免費方案的 Cron 上限就是每天一次。
 * 想要更即時的重試就得升級 Pro，但既然主要路徑是 inline，這裡一天一次夠用。
 *
 * 🔐 CRON_SECRET 沒設一律 503（忘了設的後果是「不會動」，
 *    而不是「全世界都能觸發你的寄信」）。
 */
import { NextResponse } from "next/server";
import { runAppointmentOutboxOnce } from "@/lib/appointment-outbox-worker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET 未設定。" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "未授權。" }, { status: 401 });
  }

  const result = await runAppointmentOutboxOnce(50);
  return NextResponse.json({ ok: true, ...result });
}
