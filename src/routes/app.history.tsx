// History: completed/cancelled bookings, read-only.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./app.index";

export const Route = createFileRoute("/app/history")({ component: HistoryPage });

function HistoryPage() {
  const data = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, vehicles(name, brand), returns(return_date, late_fee, damage_fee)")
        .in("status", ["completed", "cancelled"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Booking History</h1>
        <p className="text-muted-foreground">Past completed and cancelled rentals.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead><TableHead>Dates</TableHead><TableHead>Days</TableHead>
                  <TableHead>Cost</TableHead><TableHead>Extras</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.data ?? []).map((b: any) => {
                  const ret = Array.isArray(b.returns) ? b.returns[0] : b.returns;
                  const extras = (Number(ret?.late_fee ?? 0) + Number(ret?.damage_fee ?? 0));
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.vehicles?.brand} {b.vehicles?.name}</TableCell>
                      <TableCell className="text-sm">{b.start_date} → {b.end_date}</TableCell>
                      <TableCell>{b.total_days}</TableCell>
                      <TableCell>₹{Number(b.total_cost).toLocaleString()}</TableCell>
                      <TableCell>{extras > 0 ? `₹${extras.toLocaleString()}` : "—"}</TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                    </TableRow>
                  );
                })}
                {(data.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No history yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
