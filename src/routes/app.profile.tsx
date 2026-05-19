// Profile management — edit customer details.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", license_no: "" });

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile.data) {
      setForm({
        full_name: profile.data.full_name ?? "",
        phone: profile.data.phone ?? "",
        address: profile.data.address ?? "",
        license_no: profile.data.license_no ?? "",
      });
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your personal details.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div><Label className="mb-1.5 block text-xs">Email</Label><Input value={user?.email ?? ""} disabled /></div>
            <div><Label className="mb-1.5 block text-xs">Role</Label><Input value={role ?? ""} disabled className="capitalize" /></div>
          </div>
          {profile.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <>
              <div><Label className="mb-1.5 block text-xs">Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="mb-1.5 block text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label className="mb-1.5 block text-xs">License number</Label><Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} /></div>
              </div>
              <div><Label className="mb-1.5 block text-xs">Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>Save changes</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
