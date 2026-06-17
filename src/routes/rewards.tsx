import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRewards, getPointsBalance, redeemReward } from "@/lib/api/rewards";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Gift } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/rewards")({
  head: () => ({ meta: [{ title: "Eco Rewards · EcoTrade" }] }),
  component: RewardsPage,
});

interface Reward { id: string; title: string; description: string | null; cost_points: number; category: string; }

function RewardsPage() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [balance, setBalance] = useState(0);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    getRewards().then((data) => setRewards((data as Reward[]) ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const { balance } = await getPointsBalance();
        setBalance(balance);
      } catch (err) {
        console.error("Failed to load points balance:", err);
      }
    }
    load();
    const ch = supabase.channel(`points-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "eco_points", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  async function redeem(r: Reward) {
    if (!user) return;
    if (balance < r.cost_points) { toast.error("Not enough Eco Points"); return; }
    setWorking(r.id);
    try {
      await redeemReward({ data: { rewardId: r.id } });
      toast.success(`Redeemed ${r.title}! We'll contact you.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to redeem reward");
    } finally {
      setWorking(null);
    }
  }

  return (
    <AppShell requireAuth requireRole="customer">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-black">Eco Rewards</h1>
            <p className="text-muted-foreground text-sm">Redeem your points for real-world goodies</p>
          </div>
          <Card className="bg-eco-gradient border-0 text-leaf-foreground shadow-leaf">
            <CardContent className="py-3 px-5 flex items-center gap-3">
              <Coins className="h-6 w-6" />
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold opacity-80">Balance</div>
                <div className="text-2xl font-black leading-none">{balance.toLocaleString()} pts</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((r) => {
            const can = balance >= r.cost_points;
            return (
              <Card key={r.id} className={can ? "hover:shadow-leaf transition-shadow" : "opacity-70"}>
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-eco-gradient grid place-items-center shadow-leaf mb-2">
                    <Gift className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{r.title}</CardTitle>
                  <Badge variant="secondary" className="w-fit capitalize">{r.category.replace(/_/g, " ")}</Badge>
                </CardHeader>
                <CardContent>
                  {r.description && <p className="text-sm text-muted-foreground mb-3">{r.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{r.cost_points} pts</span>
                    <Button size="sm" disabled={!can || working === r.id} onClick={() => redeem(r)} className="bg-eco-gradient">
                      {working === r.id ? "…" : can ? "Redeem" : "Locked"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
