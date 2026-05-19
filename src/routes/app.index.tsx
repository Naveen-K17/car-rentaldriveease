// Dashboard: overview stats + recent activity + chart.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, CalendarRange, Wallet, TrendingUp, CheckCircle2 } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";

  const stats = useQuery({
    queryKey: ["dashboard-stats", user?.id, role],
    enabled: !!user && !!role,
    queryFn: async () => {
      // Vehicles
      const { data: vehicles } = await supabase.from("vehicles").select("status, type, price_per_day");
      // Bookings (scoped automatically by RLS)
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status, total_cost, total_days, created_at, start_date, end_date, vehicles(name, brand)")
        .order("created_at", { ascending: false })
        .limit(50);
      const { data: payments } = await supabase
        .from("payments").select("amount, status, created_at");

      const revenue = (payments ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
      const active = (bookings ?? []).filter((b) => b.status === "active").length;
      const available = (vehicles ?? []).filter((v) => v.status === "available").length;

      // Bookings per status for pie
      const byStatus = ["pending", "active", "completed", "cancelled"].map((s) => ({
        name: s, value: (bookings ?? []).filter((b) => b.status === s).length,
      }));
      // Revenue last 7 days
      const last7: { day: string; revenue: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const sum = (payments ?? [])
          .filter((p) => p.status === "paid" && p.created_at?.startsWith(key))
          .reduce((s, p) => s + Number(p.amount), 0);
        last7.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), revenue: sum });
      }

      return {
        totalVehicles: vehicles?.length ?? 0,
        available,
        totalBookings: bookings?.length ?? 0,
        active,
        revenue,
        byStatus,
        last7,
        recent: (bookings ?? []).slice(0, 6),
      };
    },
  });

  const s = stats.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isAdmin ? "Admin Dashboard" : "Welcome back"}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin ? "Overview of your fleet, bookings, and revenue." : "Your rental activity at a glance."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Car} label={isAdmin ? "Total Vehicles" : "Available Vehicles"} value={isAdmin ? s?.totalVehicles : s?.available} sub={isAdmin ? `${s?.available ?? 0} available` : "ready to book"} />
        <StatCard icon={CalendarRange} label={isAdmin ? "All Bookings" : "Your Bookings"} value={s?.totalBookings} sub={`${s?.active ?? 0} active`} />
        <StatCard icon={Wallet} label={isAdmin ? "Total Revenue" : "Total Spent"} value={s ? `₹${s.revenue.toLocaleString()}` : "—"} sub="paid" />
        <StatCard icon={CheckCircle2} label="Active Rentals" value={s?.active} sub="in progress" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Revenue — last 7 days</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={s?.last7 ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Bookings by status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={s?.byStatus ?? []} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                    {(s?.byStatus ?? []).map((_, i) => (
                      <Cell key={i} fill={["var(--color-chart-1)","var(--color-chart-2)","var(--color-chart-3)","var(--color-chart-4)"][i % 4]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Recent bookings</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {(s?.recent ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No bookings yet.</p>}
          {(s?.recent ?? []).map((b: any) => (
            <div key={b.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{b.vehicles?.brand} {b.vehicles?.name}</div>
                <div className="text-xs text-muted-foreground">{b.start_date} → {b.end_date} · {b.total_days}d</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">₹{Number(b.total_cost).toLocaleString()}</span>
                <StatusBadge status={b.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: any; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold">{value ?? "—"}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    cancelled: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    refunded: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    failed: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    available: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    booked: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    maintenance: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  };
  return <Badge className={`${map[status] ?? "bg-muted"} border-0 capitalize`}>{status}</Badge>;
}
