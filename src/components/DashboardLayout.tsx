import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  Key,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Shield,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildPartnerBranding,
  PARTNER_SUPPORT_COPY,
  partnerAccentStyle,
  partnerRoute,
  roleCodeToLabel,
} from "@/lib/drtsApi";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "儀表板", href: "/", icon: LayoutDashboard },
  { name: "預約清單", href: "/booking-list", icon: Calendar },
  { name: "建立預約", href: "/bookings/new", icon: Plus },
  { name: "乘客管理", href: "/passengers", icon: Users },
  { name: "地址簿", href: "/addresses", icon: MapPin },
  { name: "成本中心", href: "/cost-centers", icon: Tag },
  { name: "報表下載", href: "/reports", icon: FileText },
  { name: "API Keys", href: "/api-keys", icon: Key },
  { name: "Webhooks", href: "/webhooks", icon: Bell },
  { name: "付款發票", href: "/billing", icon: CreditCard },
  { name: "通知設定", href: "/notifications", icon: Bell },
  { name: "SLA 設定", href: "/sla", icon: Building2 },
  { name: "使用者", href: "/users", icon: Shield },
  { name: "審計軌跡", href: "/audit", icon: ClipboardList },
];

const partnerNavigation = [
  { name: "建立預約", href: "/bookings/new", icon: Plus },
];

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const { signOut, profile, partnerEntry, isPartnerMode } = useAuth();
  const visibleNavigation = isPartnerMode ? partnerNavigation : navigation;
  const brandingItems = buildPartnerBranding(partnerEntry);
  const activeItem =
    visibleNavigation.find((item) =>
      isRouteActive(
        location.pathname,
        partnerEntry ? partnerRoute(partnerEntry.entrySlug, item.href) : item.href,
      ),
    ) ??
    null;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border shadow-sm z-50">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow"
            style={
              partnerEntry?.themeAccent
                ? { background: partnerEntry.themeAccent }
                : undefined
            }
          >
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              {partnerEntry?.displayName ?? "租戶入口"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isPartnerMode ? "合作方訂車入口" : "租戶管理入口"}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {visibleNavigation.map((item) => {
            const targetHref =
              partnerEntry && isPartnerMode
                ? partnerRoute(partnerEntry.entrySlug, item.href)
                : item.href;
            const isActive = isRouteActive(location.pathname, targetHref);
            return (
              <Link
                key={item.name}
                to={targetHref}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          {isPartnerMode && partnerEntry && (
            <div
              className="mb-4 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground"
              style={partnerAccentStyle(partnerEntry)}
            >
              <div className="mb-2 font-medium text-foreground">合作方案資訊</div>
              <div className="space-y-1">
                {brandingItems.map((item) => (
                  <div key={item.label}>
                    {item.label}：{item.value}
                  </div>
                ))}
              </div>
              <p className="mt-3 leading-5">{PARTNER_SUPPORT_COPY}</p>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            登出
          </Button>
        </div>
      </aside>

      <div className="pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-6">
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">
              {activeItem?.name || (isPartnerMode ? "合作方訂車入口" : "儀表板")}
            </h1>
            <div className="text-right">
              <div className="text-sm text-foreground">
                {profile?.full_name || profile?.email || "臨時工作階段"}
              </div>
              <div className="text-xs text-muted-foreground">
                {isPartnerMode && partnerEntry
                  ? `${roleCodeToLabel(profile?.role_code ?? "tenant_admin")} · ${partnerEntry.partnerCode}`
                  : roleCodeToLabel(profile?.role_code ?? "tenant_admin")}
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
