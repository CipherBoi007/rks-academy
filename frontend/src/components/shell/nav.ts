import {
  BadgePercent,
  CalendarCheck,
  LayoutGrid,
  ReceiptIndianRupee,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the mobile tab bar. */
  tabLabel?: string;
  icon: LucideIcon;
  /** Fee screens are hidden from coaches. */
  ownerOnly?: boolean;
  /** Shown in the phone tab bar (Fee Structure is reached from Fees and the avatar menu instead). */
  inTabBar: boolean;
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", tabLabel: "Home", icon: LayoutGrid, inTabBar: true },
  { href: "/players", label: "Players", icon: Users, inTabBar: true },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, inTabBar: true },
  { href: "/fees", label: "Fees", icon: ReceiptIndianRupee, ownerOnly: true, inTabBar: true },
  { href: "/store", label: "Store", icon: ShoppingBag, inTabBar: true },
  { href: "/fee-structure", label: "Fee Structure", icon: BadgePercent, ownerOnly: true, inTabBar: false },
  { href: "/settings", label: "Settings", icon: Settings, ownerOnly: true, inTabBar: false },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
