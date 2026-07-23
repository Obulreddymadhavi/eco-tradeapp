import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getUserProfile } from "@/lib/api/profile";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Leaf, Truck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.preprocess(
    (val) => (typeof val === "string" ? val.replace(/\.+$/, "") : val),
    z.enum(["signin", "signup"])
  ).optional().default("signin"),
  role: z.preprocess(
    (val) => (typeof val === "string" ? val.replace(/\.+$/, "") : val),
    z.enum(["customer", "vendor"])
  ).optional().default("customer"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Sign in · EcoTrade" }, { name: "description", content: "Sign in or create an EcoTrade account as a customer or vendor." }] }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode);
  const [role, setRole] = useState<"customer" | "vendor">(search.role);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              phone,
              address,
              role,
              company_name: role === "vendor" ? companyName : null,
              vehicle_info: role === "vendor" ? vehicleInfo : null,
            },
          },
        });
        if (error) throw error;
        
        if (data?.session) {
          toast.success("Welcome to EcoTrade!");
          // Wait briefly for role to be available, then redirect by role
          setTimeout(async () => {
            try {
              const { role } = await getUserProfile();
              navigate({ to: role === "vendor" ? "/vendor" : "/customer" });
            } catch (err) {
              console.error("Failed to load user profile:", err);
              navigate({ to: "/customer" });
            }
          }, 500);
        } else {
          toast.success("Verification email sent! Please check your inbox and verify your email to log in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        
        // Wait briefly for role to be available, then redirect by role
        setTimeout(async () => {
          try {
            const { role } = await getUserProfile();
            navigate({ to: role === "vendor" ? "/vendor" : "/customer" });
          } catch (err) {
            console.error("Failed to load user profile:", err);
            navigate({ to: "/customer" });
          }
        }, 500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg.includes("already") ? "Account already exists. Try signing in." : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-10">
        <Card className="border-2 shadow-leaf">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-eco-gradient grid place-items-center mb-2 shadow-leaf">
              <Leaf className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">Welcome to EcoTrade</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-2">
                  <RoleButton active={role === "customer"} onClick={() => setRole("customer")} icon={<UserIcon className="h-5 w-5" />} label="Customer" />
                  <RoleButton active={role === "vendor"} onClick={() => setRole("vendor")} icon={<Truck className="h-5 w-5" />} label="Vendor" />
                </div>
                {mode === "signup" && (
                  <>
                    <Field id="full_name" label="Full name" value={fullName} onChange={setFullName} required />
                    <Field id="phone" label="Phone" value={phone} onChange={setPhone} required type="tel" />
                    <Field id="address" label="Address" value={address} onChange={setAddress} required />
                    {role === "vendor" && (
                      <>
                        <Field id="company" label="Company name" value={companyName} onChange={setCompanyName} />
                        <Field id="vehicle" label="Vehicle info (e.g. Tata Ace · KA 01 AB 1234)" value={vehicleInfo} onChange={setVehicleInfo} />
                      </>
                    )}
                  </>
                )}
                <Field id="email" label="Email" type="email" value={email} onChange={setEmail} required />
                <Field id="password" label="Password" type="password" value={password} onChange={setPassword} required minLength={6} />
                <Button id="login-button" type="submit" className="w-full bg-eco-gradient shadow-leaf" size="lg" disabled={loading}>
                  {loading ? "Please wait…" : mode === "signup" ? `Sign up as ${role.charAt(0).toUpperCase() + role.slice(1)}` : `Sign in as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                </Button>
              </form>

              <TabsContent value="signin" />
              <TabsContent value="signup" />
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Field({ id, label, value, onChange, type = "text", required, minLength }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} minLength={minLength} />
    </div>
  );
}

function RoleButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${active ? "border-primary bg-accent shadow-leaf" : "border-border hover:border-primary/50"}`}
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
