// Auth page: combined sign in / sign up with Google OAuth.
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Loader2 } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: searchSchema,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/app" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! You're signed in.");
    navigate({ to: "/app" });
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/app`,
    });
    if (result.error) { setBusy(false); toast.error(result.error.message || "Google sign-in failed"); return; }
    if (result.redirected) return;
    navigate({ to: "/app" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-gradient-to-br from-primary via-primary to-accent/60 lg:block">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Car className="h-5 w-5" />
            </div>
            DriveEase
          </Link>
          <div>
            <h2 className="text-4xl font-bold leading-tight">
              The smartest way to manage vehicle rentals.
            </h2>
            <p className="mt-4 max-w-md opacity-90">
              Book, pay, and return — backed by a full SQL database with proper relationships and access control.
            </p>
          </div>
          <p className="text-sm opacity-70">© DriveEase</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="mb-6 text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2 font-bold">
              <Car className="h-5 w-5 text-primary" /> DriveEase
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">Sign in or create your account to continue.</p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email-s">Email</Label>
                  <Input id="email-s" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password-s">Password</Label>
                  <Input id="password-s" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.97h5.32c-.23 1.46-1.7 4.28-5.32 4.28-3.2 0-5.81-2.65-5.81-5.92s2.61-5.92 5.81-5.92c1.82 0 3.04.78 3.74 1.45l2.55-2.46C16.81 3.93 14.71 3 12.18 3 6.99 3 2.8 7.19 2.8 12.43s4.19 9.43 9.38 9.43c5.41 0 9-3.8 9-9.16 0-.61-.07-1.08-.17-1.6Z"/></svg>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our terms.
          </p>
        </Card>
      </div>
    </div>
  );
}
