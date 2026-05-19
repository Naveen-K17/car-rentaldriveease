// Vehicles: browse + search/filter + admin CRUD.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Pencil, Trash2, Search, Users, Calendar as CalendarIcon, Car as CarIcon } from "lucide-react";
import { StatusBadge } from "./app.index";
import { toast } from "sonner";
import { format, differenceInCalendarDays, isBefore, startOfDay } from "date-fns";

export const Route = createFileRoute("/app/vehicles")({ component: VehiclesPage });

type Vehicle = {
  id: string; name: string; brand: string; model: string; type: string;
  registration_no: string; year: number; seats: number; price_per_day: number;
  image_url: string | null; status: string; description: string | null;
};

function VehiclesPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [adding, setAdding] = useState(false);
  const [booking, setBooking] = useState<Vehicle | null>(null);

  const vehicles = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Vehicle[];
    },
  });

  const filtered = useMemo(() => {
    return (vehicles.data ?? []).filter((v) => {
      if (q && !`${v.name} ${v.brand} ${v.model}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (type !== "all" && v.type !== type) return false;
      if (status !== "all" && v.status !== status) return false;
      if (maxPrice && Number(v.price_per_day) > Number(maxPrice)) return false;
      return true;
    });
  }, [vehicles.data, q, type, status, maxPrice]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Vehicle deleted"); qc.invalidateQueries({ queryKey: ["vehicles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">{filtered.length} of {vehicles.data?.length ?? 0} vehicles</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAdding(true)}><Plus className="mr-2 h-4 w-4" /> Add vehicle</Button>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search brand, model…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="car">Car</SelectItem>
              <SelectItem value="bike">Bike</SelectItem>
              <SelectItem value="suv">SUV</SelectItem>
              <SelectItem value="truck">Truck</SelectItem>
              <SelectItem value="van">Van</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Max price / day" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {vehicles.isLoading && Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden"><div className="h-44 animate-pulse bg-muted" /><CardContent className="p-4 space-y-2"><div className="h-4 w-1/2 animate-pulse rounded bg-muted" /><div className="h-3 w-3/4 animate-pulse rounded bg-muted" /></CardContent></Card>
        ))}
        {filtered.map((v) => (
          <Card key={v.id} className="overflow-hidden transition hover:shadow-lg">
            <div className="relative aspect-[4/3] bg-muted">
              {v.image_url ? (
                <img src={v.image_url} alt={`${v.brand} ${v.name}`} className="h-full w-full object-cover" loading="lazy" />
              ) : <div className="grid h-full place-items-center text-muted-foreground"><CarIcon className="h-10 w-10" /></div>}
              <div className="absolute right-2 top-2"><StatusBadge status={v.status} /></div>
            </div>
            <CardContent className="space-y-3 p-4">
              <div>
                <div className="font-semibold">{v.brand} {v.name}</div>
                <div className="text-xs text-muted-foreground">{v.model} · {v.year} · <Users className="inline h-3 w-3" /> {v.seats}</div>
              </div>
              <div className="flex items-end justify-between">
                <div><span className="text-xl font-bold">₹{Number(v.price_per_day).toLocaleString()}</span><span className="text-xs text-muted-foreground"> /day</span></div>
                <div className="flex gap-1">
                  {isAdmin && (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(v)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this vehicle?")) del.mutate(v.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </>
                  )}
                  {!isAdmin && v.status === "available" && (
                    <Button size="sm" onClick={() => setBooking(v)}><CalendarIcon className="mr-1 h-3 w-3" /> Book</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!vehicles.isLoading && filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">No vehicles match your filters.</p>
        )}
      </div>

      <VehicleFormDialog open={adding || !!editing} onClose={() => { setAdding(false); setEditing(null); }} vehicle={editing} />
      <BookingDialog vehicle={booking} onClose={() => setBooking(null)} userId={user?.id ?? null} />
    </div>
  );
}

function VehicleFormDialog({ open, onClose, vehicle }: { open: boolean; onClose: () => void; vehicle: Vehicle | null }) {
  const qc = useQueryClient();
  const isEdit = !!vehicle;
  const [form, setForm] = useState<Partial<Vehicle>>({});

  // sync form with current vehicle each time dialog opens
  useMemo(() => {
    setForm(vehicle ?? { type: "car", status: "available", seats: 4, year: new Date().getFullYear() });
  }, [vehicle, open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name!, brand: form.brand!, model: form.model!, type: form.type as any,
        registration_no: form.registration_no!, year: Number(form.year), seats: Number(form.seats),
        price_per_day: Number(form.price_per_day), image_url: form.image_url ?? null,
        description: form.description ?? null, status: (form.status as any) ?? "available",
      };
      if (isEdit) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", vehicle!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vehicles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Vehicle updated" : "Vehicle added");
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit vehicle" : "Add vehicle"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Brand"><Input value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
          <Field label="Model"><Input value={form.model ?? ""} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
          <Field label="Registration No"><Input value={form.registration_no ?? ""} onChange={(e) => setForm({ ...form, registration_no: e.target.value })} /></Field>
          <Field label="Type">
            <Select value={form.type as string} onValueChange={(v) => setForm({ ...form, type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["car","bike","suv","truck","van"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status as string} onValueChange={(v) => setForm({ ...form, status: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["available","booked","maintenance"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Year"><Input type="number" value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></Field>
          <Field label="Seats"><Input type="number" value={form.seats ?? ""} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} /></Field>
          <Field label="Price / day (₹)"><Input type="number" value={form.price_per_day ?? ""} onChange={(e) => setForm({ ...form, price_per_day: Number(e.target.value) })} /></Field>
          <Field label="Image URL"><Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Description"><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{isEdit ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block text-xs font-medium">{label}</Label>{children}</div>;
}

function BookingDialog({ vehicle, onClose, userId }: { vehicle: Vehicle | null; onClose: () => void; userId: string | null }) {
  const qc = useQueryClient();
  const [start, setStart] = useState<Date | undefined>();
  const [end, setEnd] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");

  const days = start && end ? Math.max(1, differenceInCalendarDays(end, start) + 1) : 0;
  const cost = vehicle && days ? days * Number(vehicle.price_per_day) : 0;

  const create = useMutation({
    mutationFn: async () => {
      if (!vehicle || !userId || !start || !end) throw new Error("Pick start and end dates");
      if (isBefore(start, startOfDay(new Date()))) throw new Error("Start date can't be in the past");
      const { data: booking, error } = await supabase.from("bookings").insert({
        customer_id: userId, vehicle_id: vehicle.id,
        start_date: format(start, "yyyy-MM-dd"),
        end_date: format(end, "yyyy-MM-dd"),
        total_days: days, total_cost: cost, status: "pending", notes,
      }).select().single();
      if (error) throw error;
      // create a pending payment record automatically
      await supabase.from("payments").insert({
        booking_id: booking.id, amount: cost, status: "pending", method: "card",
      });
    },
    onSuccess: () => {
      toast.success("Booking created — head to Payments to pay.");
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onClose();
      setStart(undefined); setEnd(undefined); setNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={!!vehicle} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Book {vehicle?.brand} {vehicle?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DatePopover label="Start date" value={start} onChange={setStart} />
            <DatePopover label="End date" value={end} onChange={setEnd} min={start} />
          </div>
          <Field label="Notes (optional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests…" />
          </Field>
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
            <div className="text-sm">
              <div className="text-muted-foreground">{days || 0} day{days === 1 ? "" : "s"} × ₹{vehicle ? Number(vehicle.price_per_day).toLocaleString() : 0}</div>
              <div className="text-xs text-muted-foreground">Total cost</div>
            </div>
            <div className="text-2xl font-bold">₹{cost.toLocaleString()}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !start || !end}>Confirm booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DatePopover({ label, value, onChange, min }: { label: string; value?: Date; onChange: (d?: Date) => void; min?: Date }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} disabled={(d) => isBefore(d, startOfDay(min ?? new Date()))} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
