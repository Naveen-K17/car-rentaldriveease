// Authenticated app layout: sidebar + topbar. Redirects to /auth if not signed in.
import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Car, LayoutDashboard, CalendarRange, Wallet, RotateCcw,
  History as HistoryIcon, User, FileBarChart, LogOut, Moon, Sun,
  Menu, ShieldCheck, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/app")({ component: AppLayout });

type NavItem = { to: string; label: string; icon: typeof Car; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/vehicles", label: "Vehicles", icon: Car },
  { to: "/app/bookings", label: "Bookings", icon: CalendarRange },
  { to: "/app/payments", label: "Payments", icon: Wallet },
  { to: "/app/returns", label: "Returns", icon: RotateCcw },
  { to: "/app/history", label: "History", icon: HistoryIcon },
  { to: "/app/profile", label: "Profile", icon: User },
];

function AppLayout() {
  const { user, loading, role, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = (user.email ?? "U").slice(0, 2).toUpperCase();

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-2 border-b border-sidebar-border px-6 py-5 font-bold">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Car className="h-5 w-5" />
        </div>
        DriveEase
      </Link>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {role === "admin" && (
          <Link
            to="/app/reports"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              location.pathname.startsWith("/app/reports")
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <FileBarChart className="h-4 w-4" /> Reports
          </Link>
        )}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-sm">
            <div className="truncate font-medium">{user.email}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {role === "admin" && <ShieldCheck className="h-3 w-3 text-accent" />}
              {role ?? "..."}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-2 w-full justify-start text-muted-foreground"
          onClick={async () => { await signOut(); navigate({ to: "/" }); }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        {SidebarBody}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">{SidebarBody}</SheetContent>
            </Sheet>
            <h2 className="text-base font-semibold">
              {NAV.find((n) => location.pathname === n.to || (!n.exact && location.pathname.startsWith(n.to)))?.label ??
                (location.pathname.startsWith("/app/reports") ? "Reports" : "Dashboard")}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
