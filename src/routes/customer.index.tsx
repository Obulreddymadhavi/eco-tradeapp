import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPickups } from "@/lib/api/pickups";
import { getPointsBalance } from "@/lib/api/rewards";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PickupStatusBadge, type PickupStatus } from "@/components/PickupStatusBadge";
import { PickupChat } from "@/components/PickupChat";
import { Plus, Coins, Calendar, MapPin, Phone, Truck, Banknote } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/customer/")({
  head: () => ({ meta: [{ title: "My Pickups · EcoTrade" }] }),
  component: CustomerDashboard,
});

interface Pickup {
  id: string;
  category: string;
  estimated_weight_kg: number;
  final_weight_kg: number | null;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  status: PickupStatus;
  vendor_id: string | null;
  vendor_snapshot: { full_name?: string; phone?: string; company_name?: string } | null;
  final_amount: number | null;
  estimated_amount: number | null;
  created_at: string;
}

function CustomerDashboard() {
  const { user } = useAuth();
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [p, pts] = await Promise.all([
          getPickups(),
          getPointsBalance(),
        ]);
        if (cancelled) return;
        setPickups((p as unknown as Pickup[]) ?? []);
        setPoints(pts.balance);
      } catch (err) {
        console.error("Failed to load customer dashboard data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    const channel = supabase
      .channel(`customer-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "pickups", filter: `customer_id=eq.${user.id}` },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "eco_points", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);

  return (
    <AppShell requireAuth requireRole="customer">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:flex sm:items-center sm:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-black truncate">My Pickups</h1>
            <p className="text-muted-foreground text-sm mt-1">Track your scheduled waste collections</p>
          </div>
          <Button asChild className="bg-eco-gradient shadow-leaf shrink-0">
            <Link to="/customer/new"><Plus className="h-4 w-4 mr-1" /> New pickup</Link>
          </Button>
        </div>

        <Card className="mb-3 bg-eco-gradient text-leaf-foreground border-0 shadow-leaf">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-leaf-foreground/80 text-sm font-semibold uppercase tracking-wider">
                <Coins className="h-4 w-4" /> Eco Points
              </div>
              <div className="text-4xl font-black mt-1">{points.toLocaleString()}</div>
            </div>
            <Button asChild variant="secondary" className="bg-leaf-foreground text-foreground hover:bg-leaf-foreground/90">
              <Link to="/rewards">Redeem</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="mb-6 flex items-center gap-2 rounded-xl border border-leaf/30 bg-leaf/10 px-3 py-2 text-sm text-foreground">
          <Banknote className="h-4 w-4 text-leaf shrink-0" />
          <span><b>Cash only.</b> Vendors pay you in cash at the time of pickup. No online payments.</span>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Loading…</div>
        ) : pickups.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="pt-12 pb-12 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold mb-1">No pickups yet</p>
              <p className="text-sm text-muted-foreground mb-4">Schedule your first waste collection.</p>
              <Button asChild className="bg-eco-gradient"><Link to="/customer/new">Schedule pickup</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pickups.map((p) => <PickupCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function PickupCard({ p }: { p: Pickup }) {
  return (
    <Card className="hover:shadow-leaf transition-shadow">
      <CardHeader className="pb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <CardTitle className="capitalize truncate">{p.category.replace(/_/g, " ")} · {p.final_weight_kg ?? p.estimated_weight_kg} kg</CardTitle>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {format(new Date(p.scheduled_date), "MMM d, yyyy")} at {p.scheduled_time}
            </div>
          </div>
          <PickupStatusBadge status={p.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{p.address}</span>
        </div>
        {p.vendor_snapshot && (
          <div className="flex items-center justify-between rounded-lg bg-accent p-3 mt-3 gap-2">
            <div className="min-w-0">
              <div className="font-semibold truncate">{p.vendor_snapshot.full_name}</div>
              {p.vendor_snapshot.company_name && (
                <div className="text-xs text-muted-foreground truncate">{p.vendor_snapshot.company_name}</div>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {p.vendor_id && (
                <PickupChat pickupId={p.id} peerName={p.vendor_snapshot.full_name ?? "Vendor"} />
              )}
              {p.vendor_snapshot.phone && (
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:${p.vendor_snapshot.phone}`}><Phone className="h-4 w-4 mr-1" /> Call</a>
                </Button>
              )}
            </div>
          </div>
        )}
        {p.final_amount != null && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-muted-foreground">Paid in cash</span>
            <span className="font-bold text-leaf">₹{p.final_amount}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
