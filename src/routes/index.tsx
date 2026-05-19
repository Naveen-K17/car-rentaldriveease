// Landing page — hero, features, and CTA. Public, marketing-style.
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import {
  Car, ShieldCheck, Sparkles, BarChart3, Wallet, RotateCcw,
  Sun, Moon, ArrowRight, Search,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Car className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">DriveEase</span>
          </Link>
          <nav className="hidden gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#fleet" className="hover:text-foreground">Fleet</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {user ? (
              <Button asChild><Link to="/app">Dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
                <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/0.15,transparent_60%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-accent" />
              Full-stack DBMS Mini Project
            </span>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Rent any vehicle.
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Anywhere, anytime.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              A modern vehicle rental management system with a real database backend —
              bookings, payments, returns, role-based admin and live availability.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={user ? "/app/vehicles" : "/auth"}>
                  Browse vehicles <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">Learn more</a>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-6 text-sm">
              <div><div className="text-2xl font-bold">8+</div><div className="text-muted-foreground">Vehicles</div></div>
              <div><div className="text-2xl font-bold">6</div><div className="text-muted-foreground">DB Tables</div></div>
              <div><div className="text-2xl font-bold">24/7</div><div className="text-muted-foreground">Booking</div></div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
            <img
              src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&q=80"
              alt="Modern car ready for rental"
              className="relative aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">A complete rental workflow powered by a normalized SQL schema with primary/foreign keys and RLS.</p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Car, title: "Vehicle Management", desc: "Admins add, edit, delete vehicles with status, type and price." },
              { icon: Search, title: "Search & Filter", desc: "Find vehicles by type, price range and availability." },
              { icon: Wallet, title: "Payments", desc: "Track payment status, method and transactions per booking." },
              { icon: RotateCcw, title: "Returns", desc: "Auto-update vehicle status; calculate late & damage fees." },
              { icon: BarChart3, title: "Analytics Dashboard", desc: "Live stats — revenue, bookings, fleet status." },
              { icon: ShieldCheck, title: "Role-based Security", desc: "Admin vs Customer enforced at the database layer." },
            ].map((f) => (
              <Card key={f.title} className="p-6 transition hover:shadow-lg">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-3">
            {[
              { n: "01", title: "Sign up", desc: "Create your customer account in seconds." },
              { n: "02", title: "Book a vehicle", desc: "Pick dates — cost is calculated automatically." },
              { n: "03", title: "Drive & return", desc: "Make payment, drive, then return to complete." },
            ].map((s) => (
              <div key={s.n}>
                <div className="text-5xl font-bold text-primary/30">{s.n}</div>
                <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        DriveEase © {new Date().getFullYear()} — Built as a DBMS mini project.
      </footer>
    </div>
  );
}
