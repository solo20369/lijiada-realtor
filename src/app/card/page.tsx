/**
 * /card — 建達竹南頭份房仲電子名片門面頁(竹南頭份房仲 CIS,專業版)
 * 2026-06-19 改版:真照片 + 官方品牌 icon + 去 emoji + 精緻排版(系統擁有者:要更專業)。
 * robots noindex(個人名片頁、隱私)。
 */
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { RCIS } from "./_cis";
import { SOCIAL, ABIN, LINE_QR } from "./_links";
import { SITE_URL } from "@/config/owner";
import { FacebookIcon, YoutubeIcon, LineIcon, InstagramIcon, PhoneIcon, MailIcon, PinIcon, CalendarIcon } from "./_icons";

const OG_IMAGE = `${SITE_URL}${ABIN.photoUrl}`;

export const metadata: Metadata = {
  title: `${ABIN.name}（${ABIN.alias}）‧ ${ABIN.title} | 預約諮詢`,
  description: `${ABIN.slogan} 線上預約${ABIN.alias}:買房 / 賣房 / 租賃 / 包租代管 / 稅務諮詢,一對一為你服務。`,
  robots: { index: false, follow: false },
  openGraph: {
    title: `${ABIN.name}（${ABIN.alias}）‧ ${ABIN.title}`,
    description: `${ABIN.slogan} 線上預約${ABIN.alias}、加 LINE 諮詢買賣租賃。`,
    url: SITE_URL,
    siteName: ABIN.company,
    type: "profile",
    locale: "zh_TW",
    images: [{ url: OG_IMAGE, width: 460, height: 460, alt: ABIN.name }],
  },
  twitter: {
    card: "summary",
    title: `${ABIN.name}（${ABIN.alias}）‧ ${ABIN.title}`,
    description: `${ABIN.slogan}`,
    images: [OG_IMAGE],
  },
};

function PhotoCircle() {
  const size = 150;
  const shared: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    border: "5px solid #fff",
    boxShadow: "0 8px 26px rgba(28,45,58,0.18)",
  };
  if (ABIN.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={ABIN.photoUrl} alt={ABIN.name} width={size} height={size} style={{ ...shared, objectFit: "cover", objectPosition: "center" }} />
    );
  }
  return (
    <div style={{ ...shared, background: `linear-gradient(135deg,${RCIS.sky},${RCIS.skyDeep})`, color: "#fff", fontSize: 46, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {ABIN.name.slice(0, 1)}
    </div>
  );
}

function ContactRow({ icon, label, href }: { icon: React.ReactNode; label: string; href?: string }) {
  const inner = (
    <span style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 15, color: RCIS.inkSoft }}>
      <span style={{ color: RCIS.sky, display: "inline-flex" }}>{icon}</span>
      {label}
    </span>
  );
  return href ? (
    <a href={href} style={{ textDecoration: "none" }}>
      {inner}
    </a>
  ) : (
    inner
  );
}

function SocialBtn({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      style={{
        width: 50,
        height: 50,
        borderRadius: 14,
        background: RCIS.bgSoft,
        border: `1px solid ${RCIS.border}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </a>
  );
}

export default function CardPage() {
  return (
    <main style={{ minHeight: "100vh", background: `linear-gradient(180deg,${RCIS.skySoft},${RCIS.bgSoft})`, fontFamily: RCIS.font, color: RCIS.ink, padding: "32px 16px" }}>
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        <div style={{ background: RCIS.bg, borderRadius: 22, boxShadow: RCIS.shadowLg, overflow: "hidden" }}>
          {/* cover */}
          <div style={{ height: 92, background: `linear-gradient(120deg,${RCIS.sky},${RCIS.skyDeep})`, position: "relative" }}>
            <div style={{ position: "absolute", top: 13, left: 18, fontSize: 11.5, color: "#fff", letterSpacing: 1.6, fontWeight: 700, opacity: 0.85 }}>
              CARD
            </div>
          </div>

          {/* 照片 */}
          <div style={{ marginTop: -78, textAlign: "center", position: "relative", zIndex: 2 }}>
            <PhotoCircle />
          </div>

          {/* 名字 */}
          <div style={{ textAlign: "center", padding: "14px 26px 6px" }}>
            <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: 0.5 }}>
              {ABIN.name}
              <span style={{ color: RCIS.muted, fontSize: 17, fontWeight: 500, marginLeft: 10 }}>{ABIN.alias}</span>
            </div>
            <div style={{ fontSize: 15, color: RCIS.inkSoft, marginTop: 6, fontWeight: 500 }}>{ABIN.title}</div>
            <div style={{ display: "inline-block", fontSize: 12.5, color: RCIS.sky, background: RCIS.skySoft, border: `1px solid ${RCIS.border}`, borderRadius: 999, padding: "5px 13px", marginTop: 10, fontWeight: 600 }}>
              {ABIN.company}
            </div>
            <div style={{ fontSize: 14, color: RCIS.muted, marginTop: 12, lineHeight: 1.7 }}>{ABIN.slogan}</div>
          </div>

          {/* CTA */}
          <div style={{ padding: "18px 26px 6px", display: "grid", gap: 11 }}>
            <Link href="/card/booking" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: RCIS.sky, color: "#fff", fontSize: 17, fontWeight: 800, padding: "15px", borderRadius: 13, textDecoration: "none", boxShadow: "0 8px 20px rgba(0,83,53,0.3)" }}>
              <CalendarIcon size={20} color="#fff" />
              線上預約諮詢
            </Link>
            <a href={SOCIAL.line} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "#06C755", color: "#fff", fontSize: 16, fontWeight: 800, padding: "14px", borderRadius: 13, textDecoration: "none" }}>
              <LineIcon size={22} />
              加 {ABIN.alias} LINE
            </a>
          </div>

          {/* 聯絡 */}
          <div style={{ padding: "18px 26px", display: "grid", gap: 13, borderTop: `1px solid ${RCIS.line}`, marginTop: 14 }}>
            <ContactRow icon={<PhoneIcon size={18} />} label={ABIN.phone} href={`tel:${ABIN.phoneRaw}`} />
            <ContactRow icon={<MailIcon size={18} />} label={ABIN.email} href={`mailto:${ABIN.email}`} />
            <ContactRow icon={<PinIcon size={18} />} label={ABIN.address} />
          </div>

          {/* LINE QR（LINE_QR 設 null 就整區不顯示） */}
          {LINE_QR && (
            <div style={{ padding: "18px 26px 4px", borderTop: `1px solid ${RCIS.line}`, textAlign: "center" }}>
              <div style={{ fontSize: 12.5, color: RCIS.muted, marginBottom: 10, letterSpacing: 1 }}>掃我加 LINE</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LINE_QR} alt={`加 ${ABIN.name} LINE 好友 QR Code`} width={132} height={132} style={{ display: "inline-block", borderRadius: 10, border: `1px solid ${RCIS.border}` }} />
            </div>
          )}

          {/* 社群（沒填的連結自動不顯示；全部沒填就整區隱藏） */}
          {(SOCIAL.fb || SOCIAL.yt || SOCIAL.ig) && (
            <div style={{ padding: "6px 26px 30px", borderTop: `1px solid ${RCIS.line}` }}>
              <div style={{ fontSize: 12.5, color: RCIS.muted, margin: "16px 0 13px", textAlign: "center", letterSpacing: 1 }}>追蹤 {ABIN.alias}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
                {SOCIAL.fb && (
                  <SocialBtn href={SOCIAL.fb} label="Facebook">
                    <FacebookIcon size={26} />
                  </SocialBtn>
                )}
                {SOCIAL.yt && (
                  <SocialBtn href={SOCIAL.yt} label="YouTube">
                    <YoutubeIcon size={26} />
                  </SocialBtn>
                )}
                {SOCIAL.ig && (
                  <SocialBtn href={SOCIAL.ig} label="Instagram">
                    <InstagramIcon size={26} />
                  </SocialBtn>
                )}
              </div>
            </div>
          )}
          <div style={{ height: LINE_QR || SOCIAL.fb || SOCIAL.yt || SOCIAL.ig ? 14 : 26 }} />
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: RCIS.muted, marginTop: 18 }}>© {ABIN.name} ‧ {ABIN.company}</div>
      </div>
    </main>
  );
}
