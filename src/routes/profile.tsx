import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile · EcoTrade" },
      { name: "description", content: "Manage your EcoTrade profile, avatar and contact details." },
    ],
  }),
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAddress(profile.address ?? "");
      setCompany(profile.company_name ?? "");
      setVehicle(profile.vehicle_info ?? "");
      setAvatarPath(profile.avatar_url ?? null);
    }
  }, [profile]);

  // Refresh signed URL whenever the stored avatar path changes
  useEffect(() => {
    let cancelled = false;
    async function loadSigned() {
      if (!avatarPath) { setAvatarUrl(null); return; }
      const { data } = await supabase.storage.from("avatars").createSignedUrl(avatarPath, 60 * 60);
      if (!cancelled) setAvatarUrl(data?.signedUrl ?? null);
    }
    loadSigned();
    return () => { cancelled = true; };
  }, [avatarPath]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please pick an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });

      if (upErr) {
        console.error("Avatar upload error:", upErr);
        throw new Error(`Upload failed: ${upErr.message}. Ensure the 'avatars' bucket exists.`);
      }

      // Delete previous avatar file (best effort)
      if (avatarPath && avatarPath !== path) {
        await supabase.storage.from("avatars").remove([avatarPath]).catch(() => {});
      }

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      setAvatarPath(path);
      toast.success("Profile picture updated");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!user || !avatarPath) return;
    setUploading(true);
    try {
      await supabase.storage.from("avatars").remove([avatarPath]).catch(() => {});
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (error) throw error;
      setAvatarPath(null);
      toast.success("Profile picture removed");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          address: address || null,
          company_name: role === "vendor" ? (company || null) : null,
          vehicle_info: role === "vendor" ? (vehicle || null) : null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile saved");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  const initials = (fullName || user?.email || "?")
    .split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <AppShell requireAuth>
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-black">Profile</h1>
          {role && <Badge className="capitalize bg-eco-gradient">{role}</Badge>}
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 ring-2 ring-border">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || "Avatar"} />}
                  <AvatarFallback className="bg-eco-gradient text-white text-lg font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {uploading && (
                  <div className="absolute inset-0 grid place-items-center rounded-full bg-background/70">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{fullName || "Your name"}</div>
                <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFile}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    <Camera className="h-4 w-4 mr-1.5" />
                    {avatarPath ? "Change photo" : "Upload photo"}
                  </Button>
                  {avatarPath && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={removeAvatar}
                      disabled={uploading}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
