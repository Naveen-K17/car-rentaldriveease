// Reports (admin): aggregated revenue, top vehicles, CSV export.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

function ReportsPage() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && role && role !== "admin") navigate({ to: "/app" }); }, [role, loading, navigate]);

  const data = useQuery({
    queryKey: ["report-data"],
    enabled: role === "admin",
    queryFn: async () => {
      const [{ data: bookings }, { data: payments }, { data: vehicles }] = await Promise.all([
        supabase.from("bookings").select("id, vehicle_id, total_cost, status, created_at, vehicles(brand, name)"),
        supabase.from("payments").select("amount, status, created_at"),
        supabase.from("vehicles").select("id, brand, name, type, status"),
      ]);
      const revenue = (payments ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
      // Top vehicles by booking count
      const counts: Record<string, { name: string; count: number; revenue: number }> = {};
      (bookings ?? []).forEach((b: any) => {
        const key = b.vehicle_id;
        const name = `${b.vehicles?.brand ?? ""} ${b.vehicles?.name ?? ""}`.trim();
        counts[key] = counts[key] ?? { name, count: 0, revenue: 0 };
        counts[key].count += 1;
        counts[key].revenue += Number(b.total_cost);
      });
      const top = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
      const fleetByStatus = ["available", "booked", "maintenance"].map((s) => ({
        status: s, count: (vehicles ?? []).filter((v) => v.status === s).length,
      }));
      return { revenue, totalBookings: bookings?.length ?? 0, totalVehicles: vehicles?.length ?? 0, top, fleetByStatus, bookings: bookings ?? [] };
    },
  });

  function downloadCsv() {
    const rows = data.data?.bookings ?? [];
    const csv = [
      ["Booking ID", "Vehicle", "Total Cost", "Status", "Created At"].join(","),
      ...rows.map((b: any) => [b.id, `"${(b.vehicles?.brand ?? "") + " " + (b.vehicles?.name ?? "")}"`, b.total_cost, b.status, b.created_at].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bookings-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (role !== "admin") {
    return (
      <Card><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><ShieldAlert className="h-4 w-4" /> Admins only.</CardContent></Card>
    );
  }

  const s = data.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Business overview and exports.</p>
        </div>
        <Button onClick={downloadCsv} variant="outline"><Download className="mr-2 h-4 w-4" /> Export bookings CSV</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground">Total Revenue</div><div className="mt-2 text-2xl font-bold">₹{(s?.revenue ?? 0).toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground">Total Bookings</div><div className="mt-2 text-2xl font-bold">{s?.totalBookings ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground">Fleet size</div><div className="mt-2 text-2xl font-bold">{s?.totalVehicles ?? 0}</div></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top vehicles by bookings</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Bookings</TableHead><TableHead>Revenue</TableHead></TableRow></TableHeader>
              <TableBody>
                {(s?.top ?? []).map((t, i) => (
                  <TableRow key={i}><TableCell className="font-medium">{t.name}</TableCell><TableCell>{t.count}</TableCell><TableCell>₹{t.revenue.toLocaleString()}</TableCell></TableRow>
                ))}
                {(s?.top ?? []).length === 0 && <TableRow><TableCell colSpan={3} className="py-6 text-center text-muted-foreground">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Fleet by status</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Vehicles</TableHead></TableRow></TableHeader>
              <TableBody>
                {(s?.fleetByStatus ?? []).map((f) => (
                  <TableRow key={f.status}><TableCell className="capitalize">{f.status}</TableCell><TableCell>{f.count}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
