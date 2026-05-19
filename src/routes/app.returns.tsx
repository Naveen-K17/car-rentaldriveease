// Returns: process vehicle return for active bookings, with late/damage fees.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { differenceInCalendarDays, parseISO } from "date-fns";

export const Route = createFileRoute("/app/returns")({ component: ReturnsPage });

function ReturnsPage() {
  const qc = useQueryClient();
  const [returning, setReturning] = useState<any | null>(null);
  const [condition, setCondition] = useState("good");
  const [damageFee, setDamageFee] = useState("0");
  const [notes, setNotes] = useState("");

  const active = useQuery({
    queryKey: ["active-bookings-for-return"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, vehicles(name, brand, registration_no, price_per_day)")
        .eq("status", "active")
        .order("end_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const returns = useQuery({
    queryKey: ["returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("returns")
        .select("*, bookings(vehicles(name, brand, registration_no))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!returning) throw new Error("Pick a booking");
      const today = new Date();
      const end = parseISO(returning.end_date);
      const daysLate = Math.max(0, differenceInCalendarDays(today, end));
      const lateFee = daysLate * Number(returning.vehicles.price_per_day);
      const { error } = await supabase.from("returns").insert({
        booking_id: returning.id, vehicle_condition: condition,
        late_fee: lateFee, damage_fee: Number(damageFee) || 0, notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle returned successfully");
      qc.invalidateQueries({ queryKey: ["active-bookings-for-return"] });
      qc.invalidateQueries({ queryKey: ["returns"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setReturning(null); setCondition("good"); setDamageFee("0"); setNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Returns</h1>
        <p className="text-muted-foreground">Close out an active rental and record condition.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3 text-sm font-semibold">Active rentals</div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Vehicle</TableHead><TableHead>Dates</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {(active.data ?? []).map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-medium">{b.vehicles?.brand} {b.vehicles?.name}</div>
                      <div className="text-xs text-muted-foreground">{b.vehicles?.registration_no}</div>
                    </TableCell>
                    <TableCell className="text-sm">{b.start_date} → {b.end_date}</TableCell>
                    <TableCell className="text-sm">
                      {differenceInCalendarDays(new Date(), parseISO(b.end_date)) > 0
                        ? <span className="text-destructive font-medium">{differenceInCalendarDays(new Date(), parseISO(b.end_date))} day(s) late</span>
                        : <span className="text-muted-foreground">on time</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => setReturning(b)}><RotateCcw className="mr-1 h-3 w-3" /> Return</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(active.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No active rentals.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3 text-sm font-semibold">Past returns</div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Vehicle</TableHead><TableHead>Return date</TableHead><TableHead>Condition</TableHead><TableHead>Late fee</TableHead><TableHead>Damage fee</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {(returns.data ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.bookings?.vehicles?.brand} {r.bookings?.vehicles?.name}</TableCell>
                    <TableCell>{r.return_date}</TableCell>
                    <TableCell className="capitalize">{r.vehicle_condition}</TableCell>
                    <TableCell>₹{Number(r.late_fee).toLocaleString()}</TableCell>
                    <TableCell>₹{Number(r.damage_fee).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {(returns.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No returns yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!returning} onOpenChange={(v) => !v && setReturning(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return {returning?.vehicles?.brand} {returning?.vehicles?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs">Vehicle condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Damage fee (₹)</Label>
              <Input type="number" value={damageFee} onChange={(e) => setDamageFee(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any observations…" />
            </div>
            <p className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              Late fees are calculated automatically based on days past the end date.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReturning(null)}>Cancel</Button>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>Confirm return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
