import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createPickup } from "@/lib/api/pickups";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/new")({
  head: () => ({ meta: [{ title: "New Pickup · EcoTrade" }] }),
  component: NewPickupPage,
});

const CATEGORIES = [
  { value: "plastic", label: "Plastic" },
  { value: "paper", label: "Paper / Cardboard" },
  { value: "metal", label: "Metal" },
  { value: "glass", label: "Glass" },
  { value: "e_waste", label: "E-Waste" },
  { value: "organic", label: "Organic" },
  { value: "mixed", label: "Mixed" },
  { value: "other", label: "Other" },
];

function NewPickupPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [category, setCategory] = useState("plastic");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("");
  const [scheduledDate, setScheduledDate] = useState(today);
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  function shareLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location shared");
        setLocating(false);
      },
      () => { toast.error("Could not get location"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function uploadPhotos(): Promise<string[]> {
    if (!user || files.length === 0) return [];
    const urls: string[] = [];
    for (const file of files) {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("waste-photos").upload(path, file);
      if (error) throw error;
      urls.push(path);
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    setSubmitting(true);
    try {
      const photo_urls = await uploadPhotos();
      await createPickup({
        data: {
          category,
          description: description || null,
          estimatedWeightKg: Number(weight),
          photoUrls: photo_urls,
          scheduledDate,
          scheduledTime,
          address,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          customerSnapshot: {
            fullName: profile.full_name,
            phone: profile.phone ?? null,
            address: profile.address ?? null,
          },
        }
      });
      toast.success("Pickup scheduled! Vendors will see it now.");
      navigate({ to: "/customer" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell requireAuth requireRole="customer">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">Schedule a pickup</h1>
        <p className="text-muted-foreground mb-6">A vendor will accept and come to your address.</p>

        <Card className="border-2">
          <CardHeader><CardTitle>Waste details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="weight">Estimated weight (kg)</Label>
                  <Input id="weight" type="number" min="0.1" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" placeholder="e.g. 3 bags of plastic bottles and old newspapers" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="photos">Waste photos</Label>
                <label htmlFor="photos" className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary transition-colors">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {files.length > 0 ? `${files.length} photo(s) selected` : "Tap to add photos"}
                  </span>
                </label>
                <input id="photos" type="file" accept="image/*" multiple capture="environment" className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="date">Pickup date</Label>
                  <Input id="date" type="date" min={today} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time">Pickup time</Label>
                  <Input id="time" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="addr">Pickup address</Label>
                <Textarea id="addr" value={address} onChange={(e) => setAddress(e.target.value)} required rows={2} maxLength={300} />
                <Button type="button" variant="outline" size="sm" onClick={shareLocation} disabled={locating} className="mt-2">
                  {locating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MapPin className="h-4 w-4 mr-1" />}
                  {coords ? "Location shared ✓" : "Share GPS location"}
                </Button>
              </div>

              <Button type="submit" className="w-full bg-eco-gradient shadow-leaf" size="lg" disabled={submitting}>
                {submitting ? "Scheduling…" : "Schedule pickup"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
