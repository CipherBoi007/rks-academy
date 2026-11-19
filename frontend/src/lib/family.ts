"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type {
  AdPlacement,
  FeeStatus,
  Level,
  Page,
  Payment,
  PaymentReport,
  PlayerAttendance,
  PlayerDetail,
  PlayerRef,
  Product,
  ProductCategory,
  Progress,
  Quote,
  Receipt,
} from "./types";

/** Family portal data. Every call goes to /api/v1/family/*, which only ever returns the parent's own children. */

export interface FamilyChild {
  id: number;
  code: string;
  name: string;
  initials: string;
  photoUrl: string | null;
  age: number;
  level: Level;
  batchName: string;
  startTime: string;
  endTime: string;
  days: string[];
  courtName: string;
  coachName: string;
  feeStatus: FeeStatus;
  due: { amount: number; periodFrom: string; periodTo: string; payBy: string } | null;
  attendancePct: number;
}

export interface FamilyMe {
  mobile: string;
  parentName: string | null;
  children: FamilyChild[];
}

/** The Fees page, for every child at once. upiId is null when the academy takes fees only at the desk. */
export interface FamilyFees {
  totalDue: number;
  /** The part of totalDue not yet covered by a waiting payment report. */
  toReport: number;
  children: { player: PlayerRef; due: Quote | null; payBy: string | null; reported: boolean }[];
  payTo: { upiId: string | null; payee: string; phone: string };
  reports: PaymentReport[];
  payments: Payment[];
}

export const familyKeys = {
  me: ["family", "me"] as const,
  fees: ["family", "fees"] as const,
  child: (id: number) => ["family", "child", id] as const,
  attendance: (id: number, month: string) => ["family", "child", id, "attendance", month] as const,
  progress: (id: number) => ["family", "child", id, "progress"] as const,
  payments: (id: number) => ["family", "child", id, "payments"] as const,
  due: (id: number) => ["family", "child", id, "due"] as const,
  receipt: (no: string) => ["family", "receipt", no] as const,
  products: (q?: string, category?: ProductCategory) => ["family", "shop", q ?? "", category ?? ""] as const,
  product: (id: number) => ["family", "shop", "product", id] as const,
  related: (id: number) => ["family", "shop", "related", id] as const,
  ad: (placement: AdPlacement) => ["family", "ad", placement] as const,
};

export const useFamily = () => useQuery({ queryKey: familyKeys.me, queryFn: () => api<FamilyMe>("/family/me") });

export const useFamilyFees = () =>
  useQuery({ queryKey: familyKeys.fees, queryFn: () => api<FamilyFees>("/family/fees") });

export const useFamilyChild = (id: number) =>
  useQuery({ queryKey: familyKeys.child(id), queryFn: () => api<PlayerDetail>(`/family/children/${id}`) });

/** One calendar month of a child's attendance; month is its first day, e.g. "2026-11-01". */
export const useFamilyAttendance = (id: number, month: string) =>
  useQuery({
    queryKey: familyKeys.attendance(id, month),
    queryFn: () => api<PlayerAttendance>(`/family/children/${id}/attendance`, { query: { month: month.slice(0, 7) } }),
    placeholderData: keepPreviousData,
  });

export const useFamilyProgress = (id: number) =>
  useQuery({ queryKey: familyKeys.progress(id), queryFn: () => api<Progress>(`/family/children/${id}/progress`) });

export const useFamilyPayments = (id: number) =>
  useQuery({ queryKey: familyKeys.payments(id), queryFn: () => api<Payment[]>(`/family/children/${id}/payments`) });

/** What is due now, or null when the child is paid up (the API answers 204). */
export const useFamilyDue = (id: number) =>
  useQuery({
    queryKey: familyKeys.due(id),
    queryFn: async () => (await api<Quote | undefined>(`/family/children/${id}/due`)) ?? null,
  });

export const useFamilyReceipt = (yy: string, n: string) =>
  useQuery({ queryKey: familyKeys.receipt(`${yy}/${n}`), queryFn: () => api<Receipt>(`/family/receipts/${yy}/${n}`) });

export const useShopProducts = (q?: string, category?: ProductCategory) =>
  useInfiniteQuery({
    queryKey: familyKeys.products(q, category),
    queryFn: ({ pageParam }) =>
      api<Page<Product>>("/family/shop/products", { query: { q, category, page: pageParam, size: 24 } }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });

export const useShopProduct = (id: number) =>
  useQuery({ queryKey: familyKeys.product(id), queryFn: () => api<Product>(`/family/shop/products/${id}`) });

export const useShopRelated = (id: number) =>
  useQuery({ queryKey: familyKeys.related(id), queryFn: () => api<Product[]>(`/family/shop/products/${id}/related`) });

/** The advertised product for a placement; resolves to null when there is no ad (204). */
export const useShopAd = (placement: AdPlacement) =>
  useQuery({
    queryKey: familyKeys.ad(placement),
    queryFn: async () =>
      (await api<Product | undefined>("/family/shop/ads", { query: { placement } })) ?? null,
    staleTime: 5 * 60_000,
  });
