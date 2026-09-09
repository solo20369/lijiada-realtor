/**
 * 竹南頭份房仲 CIS — 前台亮色版（/card 名片頁 / 預約表單 / 成功頁，給客戶看）
 * 2026-09：有巢氏綠 深綠 #005335 + 活力綠 #4FAF38 + 深字 #173D30。
 * ⚠️ 跟後台有巢氏房屋深色 cis.ts 分開（那是給系統擁有者久盯的深色；這是給客戶的亮色名片）。
 */
export const RCIS = {
  // 2026-09：改套李建達的有巢氏綠 CIS（原本天藍+橘已換掉，變數名沿用不動）
  sky: "#005335", // 主色：專業深綠
  skyDeep: "#002E1F", // 深一階
  skySoft: "#F2F7F3", // 淺綠灰底
  orange: "#4FAF38", // CTA：活力綠
  orangeDeep: "#3E8E2C",
  orangeSoft: "#E9F6E5",
  ink: "#173D30", // 深字（主文字）
  inkSoft: "#38564A", // 次深字
  muted: "#64776F", // 弱字
  bg: "#FFFFFF",
  bgSoft: "#F7FAF8",
  border: "#D8E7DD",
  line: "#E6F0EA",
  green: "#4FAF38", // 成功 / 確認
  accent: "#D8261C", // 強調紅（重要提醒 / 警示）
  font: "'Noto Sans TC','PingFang TC','Microsoft JhengHei',-apple-system,BlinkMacSystemFont,sans-serif",
  radius: 16,
  radiusSm: 10,
  shadow: "0 4px 20px rgba(28,45,58,0.08)",
  shadowLg: "0 12px 44px rgba(28,45,58,0.14)",
} as const;

// 業績溫度色（後台 + 通知共用判讀）
export const HEAT_TONE: Record<string, { label: string; emoji: string; color: string }> = {
  high: { label: "高溫", emoji: "🔥", color: "#D8261C" },
  mid: { label: "中溫", emoji: "🟡", color: "#4FAF38" },
  low: { label: "低溫", emoji: "⚪", color: "#64776F" },
};
