import type { Metadata } from "next";
import BookingForm from "./BookingForm";

export const metadata: Metadata = {
  title: "線上預約｜建達（李建達）",
  description: "預約竹南、頭份的房產諮詢：買房、賣房、租賃、包租代管、稅務與資產配置。自己挑時間，送出即成立。",
  robots: { index: false, follow: false },
};

export default function BookingPage() {
  return <BookingForm />;
}
