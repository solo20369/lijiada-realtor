/**
 * next-auth 的總機路由 —— /api/auth/* 底下所有網址（登入、登出、
 * callback、session 查詢…）都經過這裡轉給 next-auth 處理。
 *
 * 沒有這個檔案，/api/auth/signin 之類的網址一律 404，
 * 後台的 Google 登入就永遠進不去。
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
