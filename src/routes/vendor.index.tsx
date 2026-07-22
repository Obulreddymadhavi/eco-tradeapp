import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPickups, acceptPickup, updatePickupStatus, completePickup } from "@/lib/api/pickups";
import { useAuth, type Profile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PickupStatusBadge, type PickupStatus, STATUS_FLOW } from "@/components/PickupStatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, MapPin, Calendar, Truck, Weight, ImageIcon, IndianRupee, ExternalLink, Banknote } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PickupChat } from "@/components/PickupChat";

export const Route = createFileRoute("/vendor/")({
  head: () => ({ meta: [{ title: "Vendor Dashboard · EcoTrade" }] }),
  component: VendorDashboard,
});

interface Pickup {
  id: string;
  customer_id: string;
  vendor_id: string | null;
  category: string;
  description: string | null;
  estimated_weight_kg: number;
  final_weight_kg: number | null;
  photo_urls: string[];
  signedPhotoUrls?: string[];
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: PickupStatus;
  estimated_amount: number | null;
  final_amount: number | null;
  customer_snapshot: { full_name?: string; phone?: string; address?: string } | null;
}

function VendorDashboard() {
  const { user, profile } = useAuth();
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "mine">("open");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const p = await getPickups();
        if (!cancelled) {
          setPickups((p as unknown as Pickup[]) ?? []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load vendor pickups:", err);
      }
    }
    load();
    const channel = supabase
      .channel("vendor-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickups" }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);

  const open = pickups.filter((p) => p.status === "pending" && !p.vendor_id);
  const mine = pickups.filter((p) => p.vendor_id === user?.id);
  const visible = tab === "open" ? open : mine;

  return (
    <AppShell requireAuth requireRole="vendor">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-1">Vendor Dashboard</h1>
        <p className="text-muted-foreground mb-4">New requests appear here in real time.</p>

        <div className="mb-6 flex items-center gap-2 rounded-xl border border-leaf/30 bg-leaf/10 px-3 py-2 text-sm">
          <Banknote className="h-4 w-4 text-leaf shrink-0" />
          <span><b>Cash only.</b> Pay the customer in cash at the time of collection. No online transfers.</span>
        </div>

        <div className="inline-flex rounded-xl bg-muted p-1 mb-6">
          <TabBtn active={tab === "open"} onClick={() => setTab("open")}>Open requests · {open.length}</TabBtn>
          <TabBtn active={tab === "mine"} onClick={() => setTab("mine")}>My pickups · {mine.length}</TabBtn>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Loading…</div>
        ) : visible.length === 0 ? (
          <Card className="border-dashed border-2"><CardContent className="text-center py-12 text-muted-foreground">
            {tab === "open" ? "No open requests right now. New pickups appear live." : "You haven't accepted any pickups yet."}
          </CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {visible.map((p) => <VendorPickupCard key={p.id} p={p} vendorProfile={profile} userId={user!.id} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${active ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function VendorPickupCard({ p, vendorProfile, userId }: { p: Pickup; vendorProfile: Profile | null; userId: string }) {
  const signedPhotos = p.signedPhotoUrls ?? [];
  const [working, setWorking] = useState(false);
  const [finalWeight, setFinalWeight] = useState(p.final_weight_kg?.toString() ?? "");
  const [finalAmount, setFinalAmount] = useState(p.final_amount?.toString() ?? "");

  async function accept() {
    setWorking(true);
    try {
      await acceptPickup({
        data: {
          pickupId: p.id,
          vendorSnapshot: {
            fullName: vendorProfile?.full_name ?? "",
            phone: vendorProfile?.phone ?? null,
            companyName: vendorProfile?.company_name ?? null,
            vehicleInfo: vendorProfile?.vehicle_info ?? null,
          }
        }
      });
      toast.success("Pickup accepted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept pickup");
    } finally {
      setWorking(false);
    }
  }

  async function reject() {
    setWorking(true);
    try {
      await updatePickupStatus({
        data: {
          pickupId: p.id,
          status: "rejected",
        }
      });
      toast.success("Pickup rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject pickup");
    } finally {
      setWorking(false);
    }
  }

  async function setStatus(next: PickupStatus) {
    setWorking(true);
    try {
      await updatePickupStatus({
        data: {
          pickupId: p.id,
          status: next,
        }
      });
      toast.success(`Marked ${next.replace(/_/g, " ")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setWorking(false);
    }
  }

  async function handleComplete() {
    if (!finalWeight || !finalAmount) { toast.error("Enter weight and cash amount"); return; }
    setWorking(true);
    try {
      const weight = Number(finalWeight);
      const amount = Number(finalAmount);
      const result = await completePickup({
        data: {
          pickupId: p.id,
          finalWeightKg: weight,
          finalAmount: amount,
        }
      }) as { pointsAwarded?: number } | void;
      const pts = (result && typeof result === "object" && "pointsAwarded" in result) ? result.pointsAwarded : undefined;
      toast.success(pts ? `Completed! Customer earned ${pts} Eco Points` : "Pickup completed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete pickup");
    } finally {
      setWorking(false);
    }
  }

  const mapsLink = p.latitude && p.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`;

  const isOpen = p.status === "pending" && !p.vendor_id;
  const isMine = p.vendor_id === userId;
  const currentIdx = STATUS_FLOW.indexOf(p.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 2 ? STATUS_FLOW[currentIdx + 1] : null;

  return (
    <Card className="hover:shadow-leaf transition-shadow">
      <CardHeader className="pb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <CardTitle className="capitalize truncate">{p.category.replace(/_/g, " ")}</CardTitle>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />{format(new Date(p.scheduled_date), "MMM d")} · {p.scheduled_time}
            </div>
          </div>
          <PickupStatusBadge status={p.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {signedPhotos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {signedPhotos.map((u, i) => (
              <img key={i} src={u} alt="waste" className="h-20 w-20 rounded-lg object-cover border border-border shrink-0" />
            ))}
          </div>
        )}
        {signedPhotos.length === 0 && p.photo_urls.length > 0 && (
          <div className="h-20 rounded-lg bg-muted grid place-items-center text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>
        )}

        <div className="flex items-center gap-2"><Weight className="h-4 w-4 text-muted-foreground" /> {p.estimated_weight_kg} kg (est.)</div>
        {p.description && <p className="text-muted-foreground">{p.description}</p>}

        <div className="rounded-lg bg-accent p-3 space-y-1.5">
          <div className="font-semibold flex items-center gap-1.5"><Truck className="h-4 w-4" /> Customer</div>
          <div className="truncate">{p.customer_snapshot?.full_name ?? "—"}</div>
          <div className="flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{p.address}</span>
          </div>
          {isMine && (
            <div className="flex flex-wrap gap-2 pt-2">
              {p.customer_snapshot?.phone && (
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:${p.customer_snapshot.phone}`}><Phone className="h-3.5 w-3.5 mr-1" /> Call</a>
                </Button>
              )}
              <PickupChat pickupId={p.id} peerName={p.customer_snapshot?.full_name ?? "Customer"} />
              <Button asChild size="sm" variant="outline">
                <a href={mapsLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Navigate
                </a>
              </Button>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="flex gap-2 pt-2">
            <Button onClick={accept} disabled={working} className="flex-1 bg-eco-gradient">Accept</Button>
            <Button onClick={reject} disabled={working} variant="outline">Reject</Button>
          </div>
        )}

        {isMine && nextStatus && p.status !== "collected" && (
          <Button onClick={() => setStatus(nextStatus)} disabled={working} className="w-full bg-eco-gradient">
            Mark {nextStatus.replace(/_/g, " ")}
          </Button>
        )}

        {isMine && p.status === "collected" && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="font-semibold flex items-center gap-1.5"><IndianRupee className="h-4 w-4" /> Cash payment</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Final weight (kg)</Label>
                <Input type="number" step="0.1" value={finalWeight} onChange={(e) => setFinalWeight(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Cash paid (₹)</Label>
                <Input type="number" step="1" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} />
              </div>
            </div>
            <Button onClick={completePickup} disabled={working} className="w-full bg-eco-gradient">
              Confirm cash paid & complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
