import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updateUserProfile } from "@/lib/api/profile";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile · EcoTrade" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, role, reload } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [company, setCompany] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAddress(profile.address ?? "");
      setCompany(profile.company_name ?? "");
      setVehicle(profile.vehicle_info ?? "");
    }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile({
        data: {
          fullName,
          phone: phone || null,
          address: address || null,
          companyName: role === "vendor" ? (company || null) : null,
          vehicleInfo: role === "vendor" ? (vehicle || null) : null,
        }
      });
      toast.success("Profile saved");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell requireAuth>
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-black">Profile</h1>
          {role && <Badge className="capitalize bg-eco-gradient">{role}</Badge>}
        </div>
        <Card>
          <CardHeader><CardTitle>Account details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <Field label="Full name" value={fullName} onChange={setFullName} required />
              <Field label="Email" value={user?.email ?? ""} onChange={() => {}} readOnly />
              <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
              <div className="space-y-1.5">
                <Label htmlFor="addr">Address</Label>
                <Textarea id="addr" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={300} />
              </div>
              {role === "vendor" && (
                <>
                  <Field label="Company name" value={company} onChange={setCompany} />
                  <Field label="Vehicle info" value={vehicle} onChange={setVehicle} />
                </>
              )}
              <Button type="submit" disabled={saving} className="w-full bg-eco-gradient shadow-leaf">
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange, type = "text", required, readOnly }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} readOnly={readOnly} />
    </div>
  );
}
