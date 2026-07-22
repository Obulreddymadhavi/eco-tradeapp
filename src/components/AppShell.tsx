import { Link, useRouter } from "@tanstack/react-router";
import { Leaf, LogOut, User as UserIcon, Gift, Truck, ClipboardList, Home, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut, useAuth, type AppRole } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ReactNode } from "react";

export function AppShell({ children, requireAuth, requireRole }: { children: ReactNode; requireAuth?: boolean; requireRole?: AppRole }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  if (loading && requireAuth) {
    return <FullScreenSpinner />;
  }
  if (requireAuth && !user) {
    if (typeof window !== "undefined") router.navigate({ to: "/auth" });
    return <FullScreenSpinner />;
  }
  if (requireRole && role && role !== requireRole && role !== "admin") {
    if (typeof window !== "undefined") {
      router.navigate({ to: role === "vendor" ? "/vendor" : "/customer" });
    }
    return <FullScreenSpinner />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-eco-gradient grid place-items-center shadow-leaf">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">EcoTrade</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {user && role === "customer" && (
              <>
                <NavLink to="/customer" icon={<Home className="h-4 w-4" />}>Dashboard</NavLink>
                <NavLink to="/customer/new" icon={<ClipboardList className="h-4 w-4" />}>New</NavLink>
                <NavLink to="/rewards" icon={<Gift className="h-4 w-4" />}>Rewards</NavLink>
              </>
            )}
            {user && role === "vendor" && (
              <>
                <NavLink to="/vendor" icon={<Truck className="h-4 w-4" />}>Pickups</NavLink>
              </>
            )}
            {user && (
              <NavLink to="/assistant" icon={<Bot className="h-4 w-4" />}>EcoBot</NavLink>
            )}
            <ThemeToggle />
            {user ? (
              <>
                <NavLink to="/profile" icon={<UserIcon className="h-4 w-4" />}>Profile</NavLink>
                <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button asChild size="sm" className="bg-eco-gradient">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 mt-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
        <div>EcoTrade · Recycle smarter, earn greener</div>
        <div>
          <Link to="/tests" className="hover:underline text-leaf font-semibold">🔍 E2E Test Report & Summary</Link>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      activeProps={{ className: "text-primary bg-accent" }}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}

function FullScreenSpinner() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
    </div>
  );
}
