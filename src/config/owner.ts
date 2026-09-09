/**
 * 👤 這個系統是誰的 —— 從這裡改，只改這一個檔
 *
 * 名片頁、預約表單、通知信、日曆邀請 全都讀這裡。
 *
 * ⚠️ 這個檔會進 Git。手機與 Email 填進去等於公開在網路上。
 */

export const OWNER = {
  /** 你的名字（正式全名，出現在通知信署名與日曆邀請） */
  name: "李建達",
  /** 慣用稱呼（客戶怎麼叫你，出現在文案裡：「建達會與您聯繫」） */
  alias: "建達",
  /** 頭銜（名片上印的是「專業經理人」，另持不動產經紀人證書 (112)登字第452757號） */
  title: "專業經理人｜竹南・頭份",
  /** 手機（顯示用，含分隔線） */
  phone: "0928-558-732",
  /** 手機（純數字，撥號連結與 LINE 加好友用） */
  phoneRaw: "0928558732",
  /** 聯絡信箱（客戶回信會到這裡；名片頁公開顯示） */
  email: "solo20369@gmail.com",
  /** 公司地址（「門市面談」這個選項會顯示它） */
  address: "苗栗縣頭份市公園三街119號",
  /** 公司／品牌名 */
  // TODO 李建達：確認加盟店全銜（廣告揭露用，法規要求）
  company: "有巢氏房屋　頭份中央帝景加盟店",
  /** 大頭照放 public/card/ 底下 */
  photoUrl: "/card/owner.jpg",
  /** 一句話介紹自己 */
  slogan: "深耕竹南・頭份。我不一定叫你買，但我會先告訴你買下去要承擔什麼。",
} as const;

/**
 * 經紀業（法規揭露用）—— 依不動產經紀業管理條例第 21 條，對外刊登廣告須揭露經紀業名稱。
 */
export const AGENCY = {
  legalName: "喜橙開發有限公司",
  storeName: "有巢氏房屋　頭份中央帝景加盟店",
  taxId: "83040372",
  tel: "(037)635-888",
  fax: "(037)621525",
  address: "苗栗縣頭份市公園三街119號",
  /** 李建達的不動產經紀人證書字號 */
  agentLicense: "(112)登字第452757號",
} as const;

/**
 * 社群連結 —— 用不到的留空字串，畫面會自動不顯示。
 * ⚠️ LINE 用名片上那組邀請連結（不是 ~手機號 的格式，那個是錯的）。
 */
export const SOCIAL = {
  line: "https://line.me/ti/p/zt4ZO_K706",
  fb: "",
  yt: "",
  ig: "",
} as const;

/** LINE 加好友 QR 圖（放 public/card/ 底下）。null = 不顯示 QR 區 */
export const LINE_QR: string | null = "/card/line-qr.png";

/** 網站網址（通知信裡的連結、Open Graph 用） */
export const SITE_URL = process.env.APPOINTMENT_BASE_URL || "http://localhost:3000";
