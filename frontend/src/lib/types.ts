/** Mirrors the backend DTOs (Java records). Dates are ISO strings: "2026-11-05", times "06:00:00". */

export type Role = "OWNER" | "COACH";
export type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "TOURNAMENT";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type FeeStatus = "PAID" | "DUE";
export type PaymentMode = "UPI" | "CASH";
export type AttendanceStatus = "PRESENT" | "ABSENT";
export type Skill = "FOOTWORK" | "SMASH" | "DEFENCE" | "NET_PLAY" | "STAMINA";
export type ProductCategory = "RACKETS" | "SHUTTLECOCKS" | "SHOES" | "GRIPS" | "BAGS" | "JERSEYS";
export type AdPlacement = "HERO" | "INLINE" | "STRIP";
export type SlotStatus = "DONE" | "LIVE" | "UPCOMING";

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface User {
  id: number;
  name: string;
  displayName: string;
  role: Role;
  initials: string;
}

export interface LoginResult {
  mustChangePin: boolean;
  user: User;
}

export interface PublicConfig {
  academyName: string;
  shortName: string;
  whatsappNumber: string;
  today: string;
}

export interface PlayerRef {
  id: number;
  code: string;
  name: string;
  initials: string;
  photoUrl: string | null;
  level: Level;
}

export interface PlanRef {
  id: number;
  name: string;
  periodMonths: number;
}

export interface CourtRef {
  id: number;
  name: string;
  surfaceType: string;
}

export interface PlayerSummary {
  id: number;
  code: string;
  name: string;
  initials: string;
  photoUrl: string | null;
  age: number;
  gender: Gender;
  level: Level;
  batch: { id: number; name: string };
  court: CourtRef;
  feeStatus: FeeStatus;
}

export interface PlayerDetail {
  id: number;
  code: string;
  name: string;
  initials: string;
  photoUrl: string | null;
  dob: string;
  age: number;
  gender: Gender;
  bloodGroup: string | null;
  school: string | null;
  address: string | null;
  level: Level;
  feeStatus: FeeStatus;
  parent: { name: string; mobile: string; occupation: string | null };
  joinDate: string;
  batch: { id: number; name: string; startTime: string; endTime: string };
  court: CourtRef;
  coach: { id: number; name: string; title: string | null; initials: string };
  plan: PlanRef;
  siblingGroupId: string | null;
  siblings: PlayerRef[];
  active: boolean;
}

export interface PlayerInput {
  name: string;
  dob: string;
  gender: Gender;
  parentName: string;
  parentMobile: string;
  parentOccupation?: string;
  bloodGroup?: string;
  school?: string;
  address?: string;
  level: Level;
  batchId: number;
  feePlanId: number;
  joinDate?: string;
  siblingOfPlayerId?: number;
}

export interface PlayerAttendance {
  from: string;
  to: string;
  days: { date: string; status: AttendanceStatus }[];
  present: number;
  absent: number;
  pct: number;
}

export interface Progress {
  current: Level;
  history: { level: Level; achievedOn: string }[];
  skills: { skill: Skill; score: number; updatedOn: string }[];
}

export interface Batch {
  id: number;
  name: string;
  court: CourtRef;
  coach: { id: number; name: string; title: string | null; initials: string };
  startTime: string;
  endTime: string;
  days: string[];
  level: Level | null;
  playerCount: number;
  active: boolean;
}

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface BatchInput {
  name: string;
  courtId: number;
  coachId: number;
  startTime: string;
  endTime: string;
  days: DayOfWeek[];
  level?: Level | null;
  active: boolean;
}

export interface CourtAdmin {
  id: number;
  name: string;
  surfaceType: string;
  active: boolean;
  activeBatches: number;
}

export interface CoachAdmin {
  id: number;
  name: string;
  title: string | null;
  mobile: string | null;
  initials: string;
  active: boolean;
  activeBatches: number;
}

export interface Staff {
  id: number;
  name: string;
  mobile: string;
  role: Role;
  initials: string;
  coachId: number | null;
  coachName: string | null;
  active: boolean;
  mustChangePin: boolean;
  createdAt: string;
}

export interface StaffWithPin {
  staff: Staff;
  temporaryPin: string;
}

/** Whether a player's parent can sign in to the family portal (owner only). */
export interface ParentLogin {
  mobile: string;
  parentName: string;
  hasPin: boolean;
  /** A one-time PIN was issued and hasn't been replaced yet. */
  mustChangePin: boolean;
  lastLoginAt: string | null;
}

export interface IssuedParentPin {
  login: ParentLogin;
  temporaryPin: string;
}

export interface WhatsAppStatus {
  provider: string;
  live: boolean;
  templateName: string;
  templateLanguage: string;
  issues: string[];
}

export interface WhatsAppTestResult {
  ok: boolean;
  provider: string;
  messageId: string | null;
  error: string | null;
  preview: string;
}

export interface ProductInput {
  brand: string;
  category: ProductCategory;
  name: string;
  description?: string;
  price: number;
  mrp: number;
  rating?: number | null;
  reviewCount: number;
  stock?: number | null;
  tagLabel?: string;
  images: string[];
  specs: { label: string; value: string }[];
  variants: { group: string; value: string }[];
  advertised: boolean;
  adPlacement?: AdPlacement | null;
  adHeadline?: string;
  adHighlight?: string;
  adCopy?: string;
  adImage?: string;
}

export interface AttendanceSheet {
  date: string;
  batch: Batch;
  entries: { player: PlayerRef; status: AttendanceStatus | null }[];
  present: number;
  absent: number;
  unmarked: number;
}

export interface FeePlan {
  id: number;
  name: string;
  levelLabel: string;
  price: number | null;
  periodMonths: number;
  sessionsPerWeek: number;
  perks: string[];
  mostPopular: boolean;
  playerCount: number;
}

export interface FeePlanInput {
  name: string;
  levelLabel: string;
  price: number;
  periodMonths: number;
  sessionsPerWeek: number;
  perks: string[];
  mostPopular: boolean;
}

export interface Policy {
  registrationFee: number;
  siblingDiscount2ndPct: number;
  siblingDiscount3rdPct: number;
  lateFeeAfterDay: number;
  lateFeeBase: number;
  lateFeePerDay: number;
  lateFeeMax: number;
  effectiveFrom: string;
}

export type PolicyInput = Omit<Policy, "effectiveFrom">;

export interface PolicyView {
  current: Policy;
  pending: Policy | null;
}

export interface Payment {
  id: number;
  receiptNo: string;
  player: PlayerRef;
  plan: PlanRef;
  planAmount: number;
  siblingDiscount: number;
  lateFee: number;
  registrationFee: number;
  adjustment: number;
  amount: number;
  mode: PaymentMode;
  paidOn: string;
  periodFrom: string;
  periodTo: string;
  note: string | null;
  voided: boolean;
  voidedAt: string | null;
  voidReason: string | null;
}

/** A parent's UPI payment from the family app, waiting for (or decided by) the owner. */
export type PaymentReportStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export interface PaymentReport {
  id: number;
  /** The full UPI reference for the owner; only its last 4 characters for parents. */
  utr: string;
  amount: number;
  paidOn: string;
  status: PaymentReportStatus;
  reportedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  parentName: string | null;
  parentMobile: string | null;
  feesTotal: number;
  items: { player: PlayerRef; periodFrom: string; amount: number; receiptNo: string | null }[];
}

export interface Quote {
  player: PlayerRef;
  plan: PlanRef;
  periodFrom: string;
  periodTo: string;
  planAmount: number;
  siblingRank: number;
  siblingDiscountPct: number;
  siblingDiscount: number;
  lateFee: number;
  registrationFee: number;
  total: number;
}

export interface Due {
  player: PlayerRef;
  batchName: string;
  plan: PlanRef;
  periodFrom: string;
  periodTo: string;
  daysOverdue: number;
  planAmount: number;
  siblingDiscount: number;
  lateFee: number;
  registrationFee: number;
  amount: number;
}

export interface PaymentsSummary {
  month: string;
  collected: number;
  paymentCount: number;
  upiAmount: number;
  upiPct: number;
  pending: number;
  dueCount: number;
}

export interface Receipt {
  receiptNo: string;
  issuedOn: string;
  academyName: string;
  academyAddress: string;
  academyPhone: string;
  playerCode: string;
  playerName: string;
  parentName: string;
  batchName: string;
  planName: string;
  periodFrom: string;
  periodTo: string;
  lines: { label: string; amount: number }[];
  total: number;
  totalInWords: string;
  mode: PaymentMode;
  recordedBy: string | null;
  note: string | null;
  voided: boolean;
  voidedAt: string | null;
  voidReason: string | null;
}

export interface DashboardSummary {
  date: string;
  activePlayers: number;
  newThisMonth: number;
  presentToday: number;
  markedToday: number;
  attendancePct: number;
  collectedThisMonth: number | null;
  paymentsThisMonth: number | null;
  pendingDues: number | null;
  duePlayers: number | null;
}

export interface CourtDay {
  court: CourtRef;
  slots: {
    batchId: number;
    batchName: string;
    startTime: string;
    endTime: string;
    status: SlotStatus;
    coachName: string;
    playerCount: number;
  }[];
}

export interface Product {
  id: number;
  brand: string;
  category: ProductCategory;
  name: string;
  description: string | null;
  price: number;
  mrp: number;
  discountPct: number;
  savings: number;
  rating: number | null;
  reviewCount: number;
  stock: number | null;
  tagLabel: string | null;
  images: string[];
  specs: { label: string; value: string }[];
  variants: { name: string; values: string[] }[];
  ad: {
    placement: AdPlacement;
    headline: string | null;
    highlight: string | null;
    copy: string | null;
    image: string | null;
  } | null;
  active: boolean;
}

export interface ReminderRun {
  month: string;
  eligible: number;
  sent: number;
  failed: number;
  alreadySent: number;
}

/** One parent's fee reminder for a period. provider "log" means it was only recorded, never sent. */
export interface FeeReminder {
  id: number;
  player: PlayerRef;
  periodFrom: string;
  toMobile: string;
  amount: number;
  status: "SENT" | "FAILED";
  provider: string;
  /** Meta's exact error when it failed, e.g. "(#132001) Template name does not exist". */
  error: string | null;
  attempts: number;
  sentAt: string | null;
}

/** delivered: accepted by Meta. undelivered: failed, or only recorded while WhatsApp wasn't connected. */
export interface ReminderStatus {
  month: string;
  sent: number;
  failed: number;
  delivered: number;
  undelivered: number;
}

export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  fieldErrors?: { field: string; message: string }[];
}
