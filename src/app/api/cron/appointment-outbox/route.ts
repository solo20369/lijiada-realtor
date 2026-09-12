/**
 * GET /api/cron/appointment-outbox —— 背景工作處理器（「收工單的人」）
 *
 * 系統建立預約時，會把「寄確認信」「建日曆事件」等工作寫進 appointment_outbox
 * 這個待辦籃。**原始碼只有寫入、沒有任何東西負責取出來執行**，
 * 所以在補上這支之前，所有通知都永遠停在「已排隊」。
 *
 * 由 Vercel Cron 每分鐘叫一次（設定在 vercel.json）。
 *
 * 🔐 存取控制：
 *   - Vercel Cron 會帶 `Authorization: Bearer $CRON_SECRET`
 *   - 沒設 CRON_SECRET 時一律拒絕（忘了設的後果應該是「不會動」，
 *     而不是「全世界都能觸發你的寄信」）
 *
 * 🛡️ 失效安全：
 *   - 每張工單各自 try/catch，一張失敗不影響其他張
 *   - 失敗交給 finishAppointmentOutbox 記錄並指數退避重試（最多 8 次）
 *   - 認領用 claimAppointmentOutbox 搶鎖，同時跑兩次也不會重複寄信
 */
import { NextResponse } from "next/server";
import {
  claimAppointmentOutbox,
  finishAppointmentOutbox,
  getAppointment,
  listDueAppointmentOutbox,
  setAppointmentGoogleEvent,
  type AppointmentOutboxRow,
} from "@/lib/appointment";
import {
  appointmentLocationText,
  notifyAppointmentChange,
  notifyNewAppointment,
  type NotifyInput,
} from "@/lib/appointment-notify";
import { meetTypeLabel, type MeetLocation } from "@/lib/appointment";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  isGoogleBound,
  updateCalendarEventTime,
} from "@/lib/google-calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 一次最多處理幾張工單，避免超過 serverless 執行時間上限 */
const BATCH_SIZE = 20;

type Appointment = NonNullable<Awaited<ReturnType<typeof getAppointment>>>;

function parseIntent(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseMeetLocation(raw: string | null): MeetLocation | null {
  if (!raw) return null;
  try {
    const location = JSON.parse(raw) as Partial<MeetLocation>;
    if (!location.name) return null;
    return {
      name: String(location.name).slice(0, 120),
      address: String(location.address || "").slice(0, 200),
      lat: typeof location.lat === "number" ? location.lat : null,
      lng: typeof location.lng === "number" ? location.lng : null,
      placeId: typeof location.placeId === "string" ? location.placeId.slice(0, 200) : null,
      source: location.source === "google" ? "google" : "manual",
    };
  } catch {
    return null;
  }
}

function slotEnd(appt: Appointment): Date {
  const start = new Date(appt.slot_at);
  return appt.slot_end_at
    ? new Date(appt.slot_end_at)
    : new Date(start.getTime() + 60 * 60_000);
}

/** 資料庫列 → 通知函式要的形狀（沿用 manage/route.ts 的同名轉換） */
function toNotifyInput(appt: Appointment): NotifyInput {
  return {
    id: appt.id,
    name: appt.name,
    gender: appt.gender,
    phone: appt.phone,
    email: appt.email,
    lineId: appt.line_id,
    meetType: appt.meet_type,
    meetLocation: parseMeetLocation(appt.meet_location),
    intent: parseIntent(appt.intent),
    urgency: appt.urgency,
    note: appt.note,
    slotAt: new Date(appt.slot_at),
    slotEndAt: slotEnd(appt),
    aiHeat: appt.ai_heat,
    aiSuggestion: appt.ai_suggestion,
    meetUrl: appt.meet_url,
    status: appt.status,
  };
}

function parsePayload(row: AppointmentOutboxRow): Record<string, unknown> {
  const raw = (row as unknown as { payload_json?: string | null }).payload_json;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function runTask(row: AppointmentOutboxRow): Promise<void> {
  const appt = await getAppointment(row.appointment_id);
  if (!appt) {
    // 預約被刪了（例如清測試資料）→ 這張工單已無意義，直接視為完成
    return;
  }
  const payload = parsePayload(row);

  switch (row.task_type) {
    case "notify_new": {
      const phase = payload.phase === "confirmation_request" ? "confirmation_request" : "confirmed";
      await notifyNewAppointment(toNotifyInput(appt), { phase, onlyPending: true });
      return;
    }

    case "notify_reschedule": {
      await notifyAppointmentChange(
        toNotifyInput(appt),
        { type: "reschedule", previousSlotTw: (payload.previousSlotTw as string) || null },
        { onlyPending: true },
      );
      return;
    }

    case "notify_cancel": {
      await notifyAppointmentChange(toNotifyInput(appt), { type: "cancel" }, { onlyPending: true });
      return;
    }

    case "calendar_create": {
      if (!(await isGoogleBound())) return; // 沒綁日曆 = 這張工單不用做
      if (appt.google_event_id) return; // 已經建過了
      const start = new Date(appt.slot_at);
      const end = appt.slot_end_at
        ? new Date(appt.slot_end_at)
        : new Date(start.getTime() + 60 * 60_000);
      const created = await createCalendarEvent({
        summary: `${appt.name}（${meetTypeLabel(appt.meet_type)}）`,
        description: [
          `客戶：${appt.name}`,
          appt.phone ? `電話：${appt.phone}` : "",
          appt.email ? `Email：${appt.email}` : "",
          appt.note ? `備註：${appt.note}` : "",
          `案件編號：${appt.case_no || appt.id}`,
        ]
          .filter(Boolean)
          .join("\n"),
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        withMeet: appt.meet_type === "video",
        location: appointmentLocationText(appt.meet_type, parseMeetLocation(appt.meet_location)),
        attendeeEmail: appt.email || null,
        attendeeName: appt.name || null,
      });
      if (created?.eventId) {
        await setAppointmentGoogleEvent(appt.id, created.eventId, created.meetUrl || null);
      }
      return;
    }

    case "calendar_reschedule": {
      if (!(await isGoogleBound()) || !appt.google_event_id) return;
      const start = new Date(appt.slot_at);
      const end = appt.slot_end_at
        ? new Date(appt.slot_end_at)
        : new Date(start.getTime() + 60 * 60_000);
      await updateCalendarEventTime(appt.google_event_id, start.toISOString(), end.toISOString());
      return;
    }

    case "calendar_cancel": {
      if (!(await isGoogleBound()) || !appt.google_event_id) return;
      await deleteCalendarEvent(appt.google_event_id);
      await setAppointmentGoogleEvent(appt.id, null, null);
      return;
    }

    // 這些是選配功能，沒接就當作完成，不要一直重試卡住佇列
    case "ai_grade":
    case "analytics_ga4":
    case "analytics_meta":
      return;

    default:
      return;
  }
}

export async function GET(request: Request) {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET 未設定。" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "未授權。" }, { status: 401 });
  }

  const due = await listDueAppointmentOutbox(BATCH_SIZE);
  let done = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of due) {
    // 搶鎖失敗 = 另一個執行緒已經在處理，跳過
    if (!(await claimAppointmentOutbox(row.id))) {
      skipped += 1;
      continue;
    }
    try {
      await runTask(row);
      await finishAppointmentOutbox(row.id);
      done += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[cron/outbox]", row.task_type, row.id, message);
      await finishAppointmentOutbox(row.id, message);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, picked: due.length, done, failed, skipped });
}
