/**
 * POST /api/admin/appointments/[id] —— 後台預約卡片上所有按鈕的總機。
 *
 * 🚨 只有白名單管理員能呼叫。
 *
 * 前端 `AppointmentActions.tsx` 的每顆按鈕都打這一支，用 body.action 分流：
 *   confirm / complete / cancel        狀態切換
 *   mark_contacted                     標記已聯絡
 *   set_attendance                     已到場 / 未到場
 *   save_operations                    儲存跟進與成交結果
 *   create_followup                    建立跟進紀錄
 *   resend_customer_confirmation       重排客戶確認通知
 *   reschedule                         改期
 *
 * 回傳格式跟前端約定一致：
 *   { ok: true, notice }               成功
 *   { saved: true, notice }            資料存了但背景任務沒排進去
 *   { error }                          失敗
 */
import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin-check";
import {
  createAppointmentFollowup,
  enqueueAppointmentOutbox,
  getAppointment,
  setAppointmentSlot,
  setAppointmentStatus,
  updateAppointmentOperations,
} from "@/lib/appointment";
import { isGoogleConfigured } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown>;

const str = (v: unknown, max = 4000): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;

/** 排背景任務：失敗不讓整個操作跟著失敗，改回報「資料存了但通知沒排進去」。 */
async function enqueue(tasks: Promise<void>[]): Promise<boolean> {
  try {
    await Promise.all(tasks);
    return true;
  } catch (error) {
    console.error("[admin/appointments] enqueue failed:", error);
    return false;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "權限不足。" }, { status: 403 });
  }

  const { id } = await context.params;
  const appt = await getAppointment(id);
  if (!appt) {
    return NextResponse.json({ error: "找不到這筆預約。" }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "請求格式不正確。" }, { status: 400 });
  }

  const action = str(body.action, 64);
  const notifyCustomer = body.notifyCustomer === true;

  try {
    switch (action) {
      // ---- 狀態切換 ----
      case "confirm": {
        await setAppointmentStatus(id, "confirmed");
        const queued = notifyCustomer
          ? await enqueue([
              enqueueAppointmentOutbox({
                appointmentId: id,
                taskType: "notify_new",
                dedupeKey: `appointment:${id}:admin-confirm:${Date.now()}`,
                payload: { phase: "admin_confirm" },
              }),
            ])
          : true;
        return NextResponse.json(
          queued
            ? { ok: true, notice: "已確認預約。" }
            : { saved: true, notice: "已確認預約，但通知沒有排入佇列。" },
        );
      }

      case "complete": {
        await setAppointmentStatus(id, "completed");
        return NextResponse.json({ ok: true, notice: "已標記為完成。" });
      }

      case "cancel": {
        await setAppointmentStatus(id, "cancelled");
        const tasks: Promise<void>[] = [];
        if (notifyCustomer) {
          tasks.push(
            enqueueAppointmentOutbox({
              appointmentId: id,
              taskType: "notify_cancel",
              dedupeKey: `appointment:${id}:notify-cancel`,
            }),
          );
        }
        // 日曆事件要一起撤掉，否則你的行事曆會留著一筆不存在的約
        if (isGoogleConfigured() && appt.google_event_id) {
          tasks.push(
            enqueueAppointmentOutbox({
              appointmentId: id,
              taskType: "calendar_cancel",
              dedupeKey: `appointment:${id}:calendar-cancel`,
            }),
          );
        }
        const queued = tasks.length === 0 || (await enqueue(tasks));
        return NextResponse.json(
          queued
            ? { ok: true, notice: "已取消預約，時段已釋出。" }
            : { saved: true, notice: "已取消預約，但背景通知沒有排入佇列。" },
        );
      }

      // ---- 聯絡 / 出席 ----
      case "mark_contacted": {
        const done = await updateAppointmentOperations({ id, contactStatus: "contacted" });
        return done
          ? NextResponse.json({ ok: true, notice: "已標記為已聯絡。" })
          : NextResponse.json({ error: "更新失敗，請重試。" }, { status: 500 });
      }

      case "set_attendance": {
        const value = str(body.attendanceStatus, 24);
        if (!["arrived", "no_show", "pending", "confirmed"].includes(value)) {
          return NextResponse.json({ error: "出席狀態不正確。" }, { status: 400 });
        }
        const done = await updateAppointmentOperations({ id, attendanceStatus: value });
        return done
          ? NextResponse.json({
              ok: true,
              notice: value === "arrived" ? "已標記為到場。" : "已標記為未到場。",
            })
          : NextResponse.json({ error: "更新失敗，請重試。" }, { status: 500 });
      }

      // ---- 跟進與成交 ----
      case "save_operations": {
        const rawFollowup = str(body.nextFollowupAt, 40);
        let nextFollowupAt: Date | null = null;
        if (rawFollowup) {
          const parsed = new Date(rawFollowup);
          if (Number.isNaN(parsed.getTime())) {
            return NextResponse.json({ error: "跟進時間格式不正確。" }, { status: 400 });
          }
          nextFollowupAt = parsed;
        }
        const done = await updateAppointmentOperations({
          id,
          attendanceStatus: str(body.attendanceStatus, 24) || null,
          outcomeStatus: str(body.outcomeStatus, 24) || null,
          outcomeNote: str(body.outcomeNote),
          contactStatus: str(body.contactStatus, 24) || null,
          nextFollowupAt,
          estimatedCommission: num(body.estimatedCommission),
          actualCommission: num(body.actualCommission),
          caseReference: str(body.caseReference, 160),
        });
        return done
          ? NextResponse.json({ ok: true, notice: "跟進與成交結果已儲存。" })
          : NextResponse.json({ error: "儲存失敗，請重試。" }, { status: 500 });
      }

      case "create_followup": {
        await createAppointmentFollowup(appt);
        return NextResponse.json({ ok: true, notice: "已建立跟進紀錄。" });
      }

      // ---- 通知 ----
      case "resend_customer_confirmation": {
        const queued = await enqueue([
          enqueueAppointmentOutbox({
            appointmentId: id,
            taskType: "notify_new",
            dedupeKey: `appointment:${id}:resend:${Date.now()}`,
            payload: { phase: "resend_confirmation" },
          }),
        ]);
        return queued
          ? NextResponse.json({ ok: true, notice: "客戶確認通知已排入佇列。" })
          : NextResponse.json({ error: "排入佇列失敗，請稍後重試。" }, { status: 500 });
      }

      // ---- 改期 ----
      case "reschedule": {
        const slotIso = str(body.slotIso, 40);
        const slotAt = new Date(slotIso);
        if (!slotIso || Number.isNaN(slotAt.getTime())) {
          return NextResponse.json({ error: "改期時間格式不正確。" }, { status: 400 });
        }
        const durationMin = num(body.durationMin);
        const slotEndAt = durationMin ? new Date(slotAt.getTime() + durationMin * 60_000) : null;
        try {
          await setAppointmentSlot(id, slotAt, slotEndAt);
        } catch (error) {
          // setAppointmentSlot 撞號會丟錯 —— 這是保護，不是 bug
          console.error("[admin/appointments] reschedule conflict:", error);
          return NextResponse.json(
            { error: "這個時段已經被佔用，請換一個時間。" },
            { status: 409 },
          );
        }
        const tasks: Promise<void>[] = [];
        if (notifyCustomer) {
          tasks.push(
            enqueueAppointmentOutbox({
              appointmentId: id,
              taskType: "notify_reschedule",
              dedupeKey: `appointment:${id}:notify-reschedule:${slotAt.getTime()}`,
            }),
          );
        }
        if (isGoogleConfigured()) {
          tasks.push(
            enqueueAppointmentOutbox({
              appointmentId: id,
              taskType: "calendar_reschedule",
              dedupeKey: `appointment:${id}:calendar-reschedule:${slotAt.getTime()}`,
            }),
          );
        }
        const queued = tasks.length === 0 || (await enqueue(tasks));
        return NextResponse.json(
          queued
            ? { ok: true, notice: "已改期。" }
            : { saved: true, notice: "已改期，但背景通知沒有排入佇列。" },
        );
      }

      default:
        return NextResponse.json({ error: `不支援的操作：${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[admin/appointments]", action, error);
    return NextResponse.json({ error: "操作失敗，請稍後重試。" }, { status: 500 });
  }
}
