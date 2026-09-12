/**
 * /api/admin/appointment-location-approvals —— 後台「指定地點核准管理」
 *
 * 🚨 只有白名單管理員能呼叫。
 *
 *   GET     列出所有核准紀錄
 *   POST    建立一張核准，回傳給客戶的專屬預約連結
 *   DELETE  撤銷一張還沒被使用的核准
 *
 * 客戶拿到的連結長這樣：{BASE}/card/booking?location_approval={token}
 * token 只在建立當下回傳一次（資料庫只存 hash），之後無法再查出來 ——
 * 撤銷後要重發，只能重新建立一張。
 */
import { NextResponse } from "next/server";
import { isCurrentUserAdmin, getAdminCheckArgs } from "@/lib/admin-check";
import {
  createCustomLocationApproval,
  listCustomLocationApprovals,
  revokeCustomLocationApproval,
  type AppointmentLocationApprovalRow,
  type MeetLocation,
} from "@/lib/appointment";

export const dynamic = "force-dynamic";

const str = (v: unknown, max = 240): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const numOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const dateOrNull = (v: unknown): Date | null => {
  const raw = str(v, 40);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** 資料庫欄位（snake_case + hash）→ 前端要的形狀（camelCase，不外洩 hash 本身）。 */
function toListItem(row: AppointmentLocationApprovalRow) {
  let location: MeetLocation | null = null;
  if (row.location_json) {
    try {
      location = JSON.parse(row.location_json) as MeetLocation;
    } catch {
      location = null;
    }
  }
  return {
    id: row.id,
    customerHint: row.customer_hint,
    location,
    // 只回報「有沒有綁」，不回傳 hash 值
    boundPhone: Boolean(row.customer_phone_hash),
    boundEmail: Boolean(row.customer_email_hash),
    allowedStartAt: row.allowed_start_at ? new Date(row.allowed_start_at).toISOString() : null,
    allowedEndAt: row.allowed_end_at ? new Date(row.allowed_end_at).toISOString() : null,
    approvedDurationMin: row.approved_duration_min,
    expiresAt: new Date(row.expires_at).toISOString(),
    usedAt: row.used_at ? new Date(row.used_at).toISOString() : null,
    usedAppointmentId: row.used_appointment_id,
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    revokeReason: row.revoke_reason,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function requireAdmin(): Promise<NextResponse | null> {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "權限不足。" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const rows = await listCustomLocationApprovals();
    return NextResponse.json({ ok: true, approvals: rows.map(toListItem) });
  } catch (error) {
    console.error("[admin/location-approvals] list failed:", error);
    return NextResponse.json({ error: "讀取核准清單失敗。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "請求格式不正確。" }, { status: 400 });
  }

  const raw = (body.location || {}) as Record<string, unknown>;
  const name = str(raw.name, 120);
  const address = str(raw.address, 240);
  if (!name || !address) {
    return NextResponse.json({ error: "地點名稱與地址都要填。" }, { status: 400 });
  }

  const allowedStartAt = dateOrNull(body.allowedStartAt);
  const allowedEndAt = dateOrNull(body.allowedEndAt);
  if (allowedStartAt && allowedEndAt && allowedEndAt.getTime() <= allowedStartAt.getTime()) {
    return NextResponse.json({ error: "可用結束時間必須晚於開始時間。" }, { status: 400 });
  }

  try {
    const { email } = await getAdminCheckArgs();
    const created = await createCustomLocationApproval({
      customerHint: str(body.customerHint, 120) || null,
      createdBy: email || null,
      location: {
        name,
        address,
        placeId: str(raw.placeId, 240) || null,
        lat: numOrNull(raw.lat),
        lng: numOrNull(raw.lng),
      } as MeetLocation,
      customerPhone: str(body.customerPhone, 40) || null,
      customerEmail: str(body.customerEmail, 160) || null,
      allowedStartAt,
      allowedEndAt,
      approvedDurationMin: numOrNull(body.approvedDurationMin),
    });

    const base = (process.env.APPOINTMENT_BASE_URL || "").replace(/\/+$/, "");
    const url = `${base}/card/booking?location_approval=${encodeURIComponent(created.token)}`;

    return NextResponse.json({
      ok: true,
      id: created.id,
      url,
      expiresAt: created.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[admin/location-approvals] create failed:", error);
    return NextResponse.json({ error: "建立核准失敗，請稍後重試。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "請求格式不正確。" }, { status: 400 });
  }

  const id = str(body.id, 64);
  if (!id) return NextResponse.json({ error: "缺少核准編號。" }, { status: 400 });

  try {
    const done = await revokeCustomLocationApproval(id, str(body.reason, 240) || null);
    return done
      ? NextResponse.json({ ok: true, notice: "已撤銷這張核准。" })
      : NextResponse.json(
          { error: "撤銷失敗，這張核准可能已被使用或已撤銷。" },
          { status: 409 },
        );
  } catch (error) {
    console.error("[admin/location-approvals] revoke failed:", error);
    return NextResponse.json({ error: "撤銷失敗，請稍後重試。" }, { status: 500 });
  }
}
