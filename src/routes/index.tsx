import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, Truck, Coins, MapPin, Camera, Recycle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoTrade — Waste Collection & Recycling Rewards" },
      { name: "description", content: "Schedule waste pickups, earn Eco Points, and connect with recycling vendors in your neighbourhood." },
      { property: "og:title", content: "EcoTrade — Recycle smarter, earn greener" },
      { property: "og:description", content: "Schedule waste pickups, get paid in cash on collection, and turn recycling into rewards." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <AppShell>
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 pt-12 pb-20 sm:pt-20 sm:pb-28 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground mb-5">
              <Leaf className="h-3.5 w-3.5" /> Cash on Collection · Eco Points
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05]">
              Turn your <span className="text-primary">trash</span> into{" "}
              <span className="bg-eco-gradient bg-clip-text text-transparent">treasure</span>.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Book a doorstep pickup for plastic, paper, metal, e-waste and more. Verified vendors
              come to you, weigh your waste, pay in cash, and you earn Eco Points to redeem on
              vouchers, saplings, and eco-friendly products.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-eco-gradient shadow-leaf">
                <Link to="/auth" search={{ mode: "signup", role: "customer" }}>I'm a Customer</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth" search={{ mode: "signup", role: "vendor" }}>I'm a Vendor</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-leaf" /> No online payments</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-leaf" /> Live tracking</div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl bg-eco-gradient shadow-leaf p-8 grid place-items-center">
              <div className="grid grid-cols-2 gap-4 w-full">
                <StatCard icon={<Recycle className="h-6 w-6" />} value="8" label="Waste types" />
                <StatCard icon={<Truck className="h-6 w-6" />} value="24/7" label="Booking" />
                <StatCard icon={<Coins className="h-6 w-6" />} value="₹0" label="Service fee" />
                <StatCard icon={<Leaf className="h-6 w-6" />} value="500+" label="Eco rewards" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-16 grid sm:grid-cols-3 gap-6">
          <Step n={1} icon={<Camera className="h-5 w-5" />} title="Snap & schedule">
            Pick a waste category, add a photo and weight estimate, choose a pickup slot.
          </Step>
          <Step n={2} icon={<Truck className="h-5 w-5" />} title="Vendor arrives">
            A nearby vendor accepts. You see their name, phone, and live status updates.
          </Step>
          <Step n={3} icon={<Coins className="h-5 w-5" />} title="Cash in hand + points">
            They weigh your waste, pay you in cash on the spot, and you bank Eco Points.
          </Step>
        </div>
      </section>
    </AppShell>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-leaf-foreground/95 p-5 text-foreground">
      <div className="h-10 w-10 rounded-xl bg-eco-gradient grid place-items-center mb-3">{icon}</div>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-1">{label}</div>
    </div>
  );
}

function Step({ n, icon, title, children }: { n: number; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-2 border-border/60">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-eco-gradient grid place-items-center">{icon}</div>
          <span className="text-xs font-bold text-muted-foreground">STEP {n}</span>
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">{children}</p>
      </CardContent>
    </Card>
  );
}
