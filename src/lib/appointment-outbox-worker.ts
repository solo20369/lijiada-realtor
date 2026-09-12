/**
 * 背景工單處理器 —— 把 appointment_outbox 待辦籃裡到期的工作真的執行掉。
 *
 * 🔴 為什麼不是純靠排程：
 *    Vercel 免費方案的 Cron 一天只能跑一次，客戶約完要等到隔天才收到信 —— 沒有意義。
 *    所以改成「預約成立當下就直接呼叫這支」（inline），排程只留一天一次當補救網，
 *    負責重試當下失敗的工單。
 *
 * 🛡️ 失效安全：
 *    - 每張工單各自 try/catch，一張失敗不影響其他張
 *    - 失敗交給 finishAppointmentOutbox 記錄並指數退避重試（最多 8 次）
 *    - 認領用 claimAppointmentOutbox 搶鎖，同時跑兩次也不會重複寄信
 *    - 整支包在 try/catch 裡，**絕對不能讓寄信失敗害預約送不出去**
 */
import {
  claimAppointmentOutbox,
  finishAppointmentOutbox,
  getAppointment,
  listDueAppointmentOutbox,
  meetTypeLabel,
  setAppointmentGoogleEvent,
  type AppointmentOutboxRow,
  type MeetLocation,
} from "@/lib/appointment";
import {
  appointmentLocationText,
  notifyAppointmentChange,
  notifyNewAppointment,
  type NotifyInput,
} from "@/lib/appointment-notify";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  isGoogleBound,
  updateCalendarEventTime,
} from "@/lib/google-calendar";

type Appointment = NonNullable<Awaited<ReturnType<typeof getAppointment>>>;

export type OutboxRunResult = {
  picked: number;
  done: number;
  failed: number;
  skipped: number;
};

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
  return appt.slot_end_at ? new Date(appt.slot_end_at) : new Date(start.getTime() + 60 * 60_000);
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
  // 預約被刪了（例如清測試資料）→ 這張工單已無意義，視為完成
  if (!appt) return;
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
      const end = slotEnd(appt);
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
      await updateCalendarEventTime(
        appt.google_event_id,
        new Date(appt.slot_at).toISOString(),
        slotEnd(appt).toISOString(),
      );
      return;
    }

    case "calendar_cancel": {
      if (!(await isGoogleBound()) || !appt.google_event_id) return;
      await deleteCalendarEvent(appt.google_event_id);
      await setAppointmentGoogleEvent(appt.id, null, null);
      return;
    }

    // 選配功能，沒接就當作完成，不要一直重試卡住佇列
    case "ai_grade":
    case "analytics_ga4":
    case "analytics_meta":
      return;

    default:
      return;
  }
}

/**
 * 跑一輪待辦籃。
 *
 * @param limit 一次最多處理幾張，避免超過 serverless 執行時間上限
 */
export async function runAppointmentOutboxOnce(limit = 20): Promise<OutboxRunResult> {
  const result: OutboxRunResult = { picked: 0, done: 0, failed: 0, skipped: 0 };
  try {
    const due = await listDueAppointmentOutbox(limit);
    result.picked = due.length;
    for (const row of due) {
      // 搶鎖失敗 = 另一個執行緒已經在處理，跳過
      if (!(await claimAppointmentOutbox(row.id))) {
        result.skipped += 1;
        continue;
      }
      try {
        await runTask(row);
        await finishAppointmentOutbox(row.id);
        result.done += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[outbox]", row.task_type, row.id, message);
        await finishAppointmentOutbox(row.id, message);
        result.failed += 1;
      }
    }
  } catch (error) {
    // 🔴 整支不能往外丟錯 —— 呼叫端是「預約已經成立」之後才呼叫的，
    //    這裡丟錯會害客戶看到預約失敗，然後再送一次變成兩筆。
    console.error("[outbox] run failed:", error);
  }
  return result;
}
