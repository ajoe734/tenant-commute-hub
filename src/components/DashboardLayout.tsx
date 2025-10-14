import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  Key, 
  CreditCard, 
  Bell, 
  Shield,
  ClipboardList,
  Building2
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Bookings", href: "/bookings", icon: Calendar },
  { name: "Passengers", href: "/passengers", icon: Users },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "API & Webhooks", href: "/api-keys", icon: Key },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Admin", href: "/admin", icon: Shield },
  { name: "Audit Trail", href: "/audit", icon: ClipboardList },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border shadow-sm z-50">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Tenant Portal</h2>
            <p className="text-xs text-muted-foreground">Enterprise Edition</p>
          </div>
        </div>

        <nav className="space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-6">
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">
              {navigation.find(item => item.href === location.pathname)?.name || "Dashboard"}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">admin@company.com</span>
            </div>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
