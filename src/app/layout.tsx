import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "李建達｜竹南・頭份不動產經紀人　數位名片 ‧ 線上預約",
  description: "深耕竹南、頭份。買房、賣房、租賃、包租代管、稅務諮詢，線上直接挑時間預約。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
