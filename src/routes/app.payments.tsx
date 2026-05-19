// Payments: list and pay pending invoices.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { StatusBadge } from "./app.index";
import { toast } from "sonner";

export const Route = createFileRoute("/app/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();

  const payments = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, bookings(id, total_cost, start_date, end_date, status, vehicles(name, brand), profiles(full_name, email))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [methods, setMethods] = useState<Record<string, string>>({});

  const pay = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: string }) => {
      // Mark payment paid + activate booking (mock — no real gateway)
      const { data: p, error } = await supabase
        .from("payments")
        .update({ status: "paid", method: method as any, paid_at: new Date().toISOString(), transaction_id: `TXN${Date.now()}` })
        .eq("id", id).select("booking_id").single();
      if (error) throw error;
      const { error: bErr } = await supabase.from("bookings").update({ status: "active" }).eq("id", p.booking_id);
      if (bErr) throw bErr;
    },
    onSuccess: () => {
      toast.success("Payment successful");
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">{role === "admin" ? "All payment transactions" : "Your invoices"}</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  {role === "admin" && <TableHead>Customer</TableHead>}
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments.data ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.bookings?.vehicles?.brand} {p.bookings?.vehicles?.name}</div>
                      <div className="text-xs text-muted-foreground">{p.bookings?.start_date} → {p.bookings?.end_date}</div>
                    </TableCell>
                    {role === "admin" && <TableCell className="text-sm">{p.bookings?.profiles?.full_name || p.bookings?.profiles?.email}</TableCell>}
                    <TableCell className="font-medium">₹{Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{p.method}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="font-mono text-xs">{p.transaction_id ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {p.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <Select value={methods[p.id] ?? "card"} onValueChange={(v) => setMethods({ ...methods, [p.id]: v })}>
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="netbanking">Net Banking</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => pay.mutate({ id: p.id, method: methods[p.id] ?? "card" })}>Pay now</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(payments.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={role === "admin" ? 7 : 6} className="py-10 text-center text-muted-foreground">No payments yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
