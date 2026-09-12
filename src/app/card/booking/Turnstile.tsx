"use client";

/**
 * Cloudflare Turnstile 人機驗證框。
 *
 * 沒設 `NEXT_PUBLIC_TURNSTILE_SITE_KEY` 就整個不顯示、也不擋送出 ——
 * 後端 `verifyAppointmentTurnstile()` 在沒設 secret 時同樣直接放行，
 * 兩邊行為一致，所以「還沒申請金鑰」不會把預約表單弄壞。
 *
 * Managed 模式下大多數真人完全不用點任何東西，框會自己驗完。
 */
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
    onTurnstileReady?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileReady";

export default function Turnstile({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // 用 ref 存 callback，避免父層每次 render 都重建 widget
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !boxRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return; // 已經畫過就不重畫
      widgetIdRef.current = window.turnstile.render(boxRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
        theme: "auto",
        language: "zh-tw",
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      window.onTurnstileReady = renderWidget;
      if (!document.getElementById(SCRIPT_ID)) {
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // widget 已經被移除就算了，不需要處理
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={boxRef} style={{ margin: "1rem 0" }} />;
}
