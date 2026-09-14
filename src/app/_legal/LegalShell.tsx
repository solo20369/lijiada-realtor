/**
 * 法律頁面共用外殼（隱私權政策 / 服務條款）。
 *
 * 🔴 頁尾的名稱、地址、電話一律從 config/owner.ts 讀取，不在這裡寫死。
 *    2026-09-13 才踩過的坑：通知信裡各留了一份寫死的門市地址，結果是原始範本的
 *    台北假地址，客戶按導航會被帶去台北。同一份事實只留一個來源。
 */
import Link from "next/link";
import { AGENCY, OWNER } from "@/config/owner";

const GREEN = "#3e8e2c";
const GREEN_LIGHT = "#4faf38";
const INK = "#1c2d3a";
const MUTE = "#64776f";

export type LegalSection = {
  heading: string;
  /** 段落；字串陣列，每個元素一段 */
  paragraphs?: string[];
  /** 條列項目 */
  bullets?: string[];
  /** 需要強調的提醒框 */
  callout?: string;
};

export function LegalShell({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main
      style={{
        background: "#f7faf8",
        color: INK,
        minHeight: "100vh",
        fontFamily:
          '"Noto Sans TC", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif',
        lineHeight: 1.9,
        WebkitTextSizeAdjust: "100%",
      }}
    >
      <div style={{ background: `linear-gradient(135deg, ${GREEN_LIGHT}, ${GREEN})`, padding: "26px 20px 30px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Link href="/" style={{ color: "#eaf6e6", fontSize: 14, textDecoration: "none" }}>
            ← 回首頁
          </Link>
          <h1 style={{ color: "#fff", fontSize: 27, fontWeight: 800, margin: "10px 0 6px", lineHeight: 1.4 }}>
            {title}
          </h1>
          <div style={{ color: "#e4f3df", fontSize: 14 }}>
            {OWNER.company}　｜　最後更新：{updated}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 20px 60px" }}>
        <p style={{ fontSize: 16.5, margin: "0 0 26px" }}>{intro}</p>

        {sections.map((section) => (
          <section key={section.heading} style={{ marginBottom: 30 }}>
            <h2
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: GREEN,
                margin: "0 0 10px",
                paddingBottom: 7,
                borderBottom: "2px solid #d8e7dd",
                lineHeight: 1.5,
              }}
            >
              {section.heading}
            </h2>
            {section.paragraphs?.map((text, index) => (
              <p key={index} style={{ fontSize: 16, margin: "0 0 11px" }}>
                {text}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul style={{ fontSize: 16, margin: "0 0 11px", paddingLeft: 22 }}>
                {section.bullets.map((text, index) => (
                  <li key={index} style={{ marginBottom: 6 }}>
                    {text}
                  </li>
                ))}
              </ul>
            ) : null}
            {section.callout ? (
              <div
                style={{
                  background: "#eef8ea",
                  border: `1px solid ${GREEN_LIGHT}`,
                  borderRadius: 11,
                  padding: "13px 16px",
                  fontSize: 15.5,
                  color: "#173d30",
                  marginTop: 10,
                }}
              >
                {section.callout}
              </div>
            ) : null}
          </section>
        ))}

        <div
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: "1px solid #d8e7dd",
            fontSize: 14.5,
            color: MUTE,
            lineHeight: 1.9,
          }}
        >
          <div style={{ fontWeight: 700, color: INK, marginBottom: 4 }}>
            {OWNER.name}　{OWNER.title}
          </div>
          {AGENCY.storeName}
          <br />
          {AGENCY.address}
          <br />
          電話 {OWNER.phone}　門市 {AGENCY.tel}
          <br />
          Email {OWNER.email}
          <br />
          <span style={{ fontSize: 13.5 }}>
            經紀業：{AGENCY.legalName}（統一編號 {AGENCY.taxId}）　不動產經紀人證書字號：{AGENCY.agentLicense}
          </span>
          <div style={{ marginTop: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/privacy" style={{ color: GREEN, textDecoration: "none" }}>
              隱私權政策
            </Link>
            <Link href="/terms" style={{ color: GREEN, textDecoration: "none" }}>
              服務條款
            </Link>
            <Link href="/card/booking" style={{ color: GREEN, textDecoration: "none" }}>
              線上預約
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
