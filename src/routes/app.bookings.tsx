// Bookings: list with filters, change status, cancel.
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { StatusBadge } from "./app.index";
import { toast } from "sonner";

export const Route = createFileRoute("/app/bookings")({ component: BookingsPage });

function BookingsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const bookings = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, vehicles(name, brand, registration_no), profiles(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return (bookings.data ?? []).filter((b: any) => {
      if (status !== "all" && b.status !== status) return false;
      if (q && !`${b.vehicles?.brand} ${b.vehicles?.name} ${b.profiles?.email ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [bookings.data, q, status]);

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bookings").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking updated");
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground">{isAdmin ? "All bookings across customers" : "Your bookings"}</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by vehicle or customer…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  {isAdmin && <TableHead>Customer</TableHead>}
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-medium">{b.vehicles?.brand} {b.vehicles?.name}</div>
                      <div className="text-xs text-muted-foreground">{b.vehicles?.registration_no}</div>
                    </TableCell>
                    {isAdmin && <TableCell><div className="text-sm">{b.profiles?.full_name || "—"}</div><div className="text-xs text-muted-foreground">{b.profiles?.email}</div></TableCell>}
                    <TableCell className="text-sm">{b.start_date} → {b.end_date}</TableCell>
                    <TableCell>{b.total_days}</TableCell>
                    <TableCell className="font-medium">₹{Number(b.total_cost).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                    <TableCell className="text-right">
                      {isAdmin && b.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => update.mutate({ id: b.id, status: "active" })}>Activate</Button>
                      )}
                      {!isAdmin && b.status === "pending" && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => update.mutate({ id: b.id, status: "cancelled" })}>Cancel</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={isAdmin ? 7 : 6} className="py-10 text-center text-muted-foreground">No bookings found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
