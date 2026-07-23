import { Link, useRouter } from "@tanstack/react-router";
import { Leaf, LogOut, User as UserIcon, Gift, Truck, ClipboardList, Home, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut, useAuth, type AppRole } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChatNotifications } from "@/components/ChatNotifications";
import type { ReactNode } from "react";

export function AppShell({ children, requireAuth, requireRole }: { children: ReactNode; requireAuth?: boolean; requireRole?: AppRole }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  if (loading && requireAuth) {
    return <FullScreenSpinner />;
  }
  if (requireAuth && !user) {
    if (typeof window !== "undefined") router.navigate({ to: "/auth", search: { mode: "signin", role: "customer" } });
    return <FullScreenSpinner />;
  }
  if (requireAuth && user && !user.email_confirmed_at) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4 p-6 border-2 rounded-2xl shadow-leaf">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 grid place-items-center font-bold text-lg">!</div>
          <h2 className="text-xl font-bold">Please verify your email</h2>
          <p className="text-muted-foreground text-sm">
            We've sent a verification link to <strong>{user.email}</strong>. Please check your inbox and verify your email before accessing the dashboard.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => window.location.reload()} className="w-full bg-eco-gradient shadow-leaf">
              I've verified my email
            </Button>
            <Button variant="outline" onClick={() => signOut()} className="w-full">
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (requireRole && role && role !== requireRole && role !== "admin") {
    if (typeof window !== "undefined") {
      router.navigate({ to: role === "vendor" ? "/vendor" : "/customer" });
    }
    return <FullScreenSpinner />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {user && <ChatNotifications />}
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
                <Link to="/auth" search={{ mode: "signin", role: "customer" }}>Sign in</Link>
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
