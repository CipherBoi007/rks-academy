"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type {
  AttendanceSheet,
  Batch,
  CoachAdmin,
  CourtAdmin,
  CourtDay,
  CourtRef,
  DashboardSummary,
  Due,
  FamilyLogin,
  FeePlan,
  FeeStatus,
  Level,
  Page,
  Payment,
  PaymentMode,
  PaymentReport,
  PaymentsSummary,
  PlayerAttendance,
  PlayerDetail,
  PlayerSummary,
  PolicyView,
  Product,
  ProductCategory,
  Progress,
  PublicConfig,
  Receipt,
  ReminderStatus,
  Staff,
  User,
  WhatsAppStatus,
} from "./types";

/** Every cache key lives here so mutations can invalidate precisely. */
export const keys = {
  me: ["me"] as const,
  config: ["config"] as const,
  summary: ["dashboard", "summary"] as const,
  todayCourts: ["dashboard", "courts"] as const,
  courts: ["courts"] as const,
  batches: (courtId?: number, date?: string) => ["batches", courtId ?? null, date ?? null] as const,
  players: ["players"] as const,
  playerList: (f: PlayerFilters) => ["players", "list", f] as const,
  player: (id: number) => ["players", id] as const,
  playerAttendance: (id: number, month: string) => ["players", id, "attendance", month] as const,
  playerProgress: (id: number) => ["players", id, "progress"] as const,
  playerPayments: (id: number) => ["players", id, "payments"] as const,
  familyLogin: (id: number) => ["players", id, "family-login"] as const,
  attendance: (date: string, batchId: number) => ["attendance", date, batchId] as const,
  payments: ["payments"] as const,
  paymentList: (f: PaymentFilters) => ["payments", "list", f] as const,
  paymentsSummary: ["payments", "summary"] as const,
  dues: ["dues"] as const,
  receipt: (no: string) => ["receipt", no] as const,
  plans: ["fee-plans"] as const,
  policy: ["fee-policy"] as const,
  products: (f: ProductFilters) => ["products", "list", f] as const,
  product: (id: number) => ["products", id] as const,
  related: (id: number) => ["products", id, "related"] as const,
  reminders: ["reminders"] as const,
  paymentReports: ["payment-reports"] as const,
  staff: ["staff"] as const,
  adminCourts: ["courts", "admin"] as const,
  coaches: ["coaches"] as const,
  adminBatches: ["batches", "admin"] as const,
  whatsapp: ["whatsapp"] as const,
};

export interface PlayerFilters {
  q?: string;
  batchId?: number;
  courtId?: number;
  level?: Level;
  feeStatus?: FeeStatus;
}

export interface PaymentFilters {
  from?: string;
  to?: string;
  mode?: PaymentMode;
  playerId?: number;
}

export interface ProductFilters {
  q?: string;
  category?: ProductCategory;
  /** Owners only: include archived products. */
  includeInactive?: boolean;
}

const PAGE = 30;

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => api<User>("/auth/me"), staleTime: Infinity });

export const useConfig = () =>
  useQuery({ queryKey: keys.config, queryFn: () => api<PublicConfig>("/config/public"), staleTime: 5 * 60_000 });

/** Owners see fee amounts; coaches only see PAID/DUE. */
export function useCanSeeFees(): boolean {
  return useMe().data?.role === "OWNER";
}

export const useDashboardSummary = () =>
  useQuery({ queryKey: keys.summary, queryFn: () => api<DashboardSummary>("/dashboard/summary") });

export const useTodayCourts = () =>
  useQuery({ queryKey: keys.todayCourts, queryFn: () => api<CourtDay[]>("/dashboard/today-courts") });

export const useCourts = () =>
  useQuery({ queryKey: keys.courts, queryFn: () => api<CourtRef[]>("/courts"), staleTime: 10 * 60_000 });

export const useBatches = (courtId?: number, date?: string) =>
  useQuery({
    queryKey: keys.batches(courtId, date),
    queryFn: () => api<Batch[]>("/batches", { query: { courtId, date } }),
    staleTime: 5 * 60_000,
  });

export const usePlayers = (filters: PlayerFilters) =>
  useInfiniteQuery({
    queryKey: keys.playerList(filters),
    queryFn: ({ pageParam }) =>
      api<Page<PlayerSummary>>("/players", { query: { ...filters, page: pageParam, size: PAGE } }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });

/** Every active player, for pickers (sibling, record payment). */
export const useAllPlayers = (enabled = true) =>
  useQuery({
    queryKey: [...keys.players, "all"],
    queryFn: async () => {
      const all: PlayerSummary[] = [];
      for (let page = 0; ; page++) {
        const res = await api<Page<PlayerSummary>>("/players", { query: { page, size: 100 } });
        all.push(...res.content);
        if (page + 1 >= res.totalPages) return all;
      }
    },
    enabled,
  });

export const usePlayer = (id: number) =>
  useQuery({ queryKey: keys.player(id), queryFn: () => api<PlayerDetail>(`/players/${id}`) });

/** One calendar month of a player's attendance; month is its first day, e.g. "2026-11-01". */
export const usePlayerAttendance = (id: number, month: string) =>
  useQuery({
    queryKey: keys.playerAttendance(id, month),
    queryFn: () => api<PlayerAttendance>(`/players/${id}/attendance`, { query: { month: month.slice(0, 7) } }),
    placeholderData: keepPreviousData,
  });

export const usePlayerProgress = (id: number) =>
  useQuery({ queryKey: keys.playerProgress(id), queryFn: () => api<Progress>(`/players/${id}/progress`) });

/** Owner only: the family-app sign-in for this player's contact number. */
export const useFamilyLogin = (id: number) =>
  useQuery({ queryKey: keys.familyLogin(id), queryFn: () => api<FamilyLogin>(`/players/${id}/family-login`) });

export const usePlayerPayments = (id: number, enabled: boolean) =>
  useQuery({
    queryKey: keys.playerPayments(id),
    queryFn: () => api<Payment[]>(`/players/${id}/payments`),
    enabled,
  });

export const useAttendanceSheet = (date: string, batchId?: number) =>
  useQuery({
    queryKey: keys.attendance(date, batchId ?? 0),
    queryFn: () => api<AttendanceSheet>("/attendance", { query: { date, batchId } }),
    enabled: batchId !== undefined,
  });

export const usePayments = (filters: PaymentFilters, enabled = true) =>
  useInfiniteQuery({
    queryKey: keys.paymentList(filters),
    queryFn: ({ pageParam }) =>
      api<Page<Payment>>("/payments", { query: { ...filters, page: pageParam, size: PAGE } }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    enabled,
  });

export const useRecentPayments = (enabled: boolean) =>
  useQuery({
    queryKey: [...keys.payments, "recent"],
    // Voided payments stay in the Fees history but never appear as "recent payments".
    queryFn: () => api<Page<Payment>>("/payments", { query: { size: 6, includeVoided: false } }),
    enabled,
  });

export const usePaymentsSummary = (enabled = true) =>
  useQuery({ queryKey: keys.paymentsSummary, queryFn: () => api<PaymentsSummary>("/payments/summary"), enabled });

export const useDues = (enabled = true) =>
  useQuery({
    queryKey: keys.dues,
    queryFn: () => api<Page<Due>>("/dues", { query: { size: 100 } }),
    enabled,
  });

export const useReceipt = (yy: string, n: string) =>
  useQuery({ queryKey: keys.receipt(`${yy}/${n}`), queryFn: () => api<Receipt>(`/receipts/${yy}/${n}`) });

export const usePlans = () => useQuery({ queryKey: keys.plans, queryFn: () => api<FeePlan[]>("/fee-plans") });

export const usePolicy = (enabled = true) =>
  useQuery({ queryKey: keys.policy, queryFn: () => api<PolicyView>("/fee-policy"), enabled });

export const useProducts = (filters: ProductFilters) =>
  useInfiniteQuery({
    queryKey: keys.products(filters),
    queryFn: ({ pageParam }) =>
      api<Page<Product>>("/products", { query: { ...filters, page: pageParam, size: 24 } }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });

export const useProduct = (id: number) =>
  useQuery({ queryKey: keys.product(id), queryFn: () => api<Product>(`/products/${id}`) });

export const useRelatedProducts = (id: number) =>
  useQuery({ queryKey: keys.related(id), queryFn: () => api<Product[]>(`/products/${id}/related`) });

export const useStaff = () => useQuery({ queryKey: keys.staff, queryFn: () => api<Staff[]>("/staff") });

export const useAdminCourts = () =>
  useQuery({ queryKey: keys.adminCourts, queryFn: () => api<CourtAdmin[]>("/courts", { query: { includeInactive: true } }) });

export const useCoaches = (includeInactive = false) =>
  useQuery({
    queryKey: [...keys.coaches, includeInactive],
    queryFn: () => api<CoachAdmin[]>("/coaches", { query: { includeInactive } }),
  });

export const useAdminBatches = () =>
  useQuery({ queryKey: keys.adminBatches, queryFn: () => api<Batch[]>("/batches", { query: { includeInactive: true } }) });

export const useWhatsAppStatus = () =>
  useQuery({ queryKey: keys.whatsapp, queryFn: () => api<WhatsAppStatus>("/notifications/whatsapp") });

/** UPI payments families reported in the family app: waiting ones first. Owner only. */
export const usePaymentReports = (enabled = true) =>
  useQuery({
    queryKey: keys.paymentReports,
    queryFn: () => api<PaymentReport[]>("/payment-reports"),
    enabled,
  });

export const useReminderStatus = (enabled: boolean) =>
  useQuery({
    queryKey: keys.reminders,
    queryFn: () => api<ReminderStatus>("/notifications/fee-reminders/status"),
    enabled,
  });
