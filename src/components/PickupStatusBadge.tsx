import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PickupStatus =
  | "pending" | "accepted" | "on_the_way" | "arrived"
  | "collected" | "cash_paid" | "completed" | "rejected" | "cancelled";

const STYLES: Record<PickupStatus, { label: string; cls: string }> = {
  pending:    { label: "Pending",        cls: "bg-muted text-muted-foreground" },
  accepted:   { label: "Accepted",       cls: "bg-accent text-accent-foreground" },
  on_the_way: { label: "On The Way",     cls: "bg-sun text-sun-foreground" },
  arrived:    { label: "Arrived",        cls: "bg-sun text-sun-foreground" },
  collected:  { label: "Collected",      cls: "bg-leaf/80 text-leaf-foreground" },
  cash_paid:  { label: "Cash Paid",      cls: "bg-leaf text-leaf-foreground" },
  completed:  { label: "Completed",      cls: "bg-leaf text-leaf-foreground" },
  rejected:   { label: "Rejected",       cls: "bg-destructive text-destructive-foreground" },
  cancelled:  { label: "Cancelled",      cls: "bg-destructive/80 text-destructive-foreground" },
};

export function PickupStatusBadge({ status }: { status: PickupStatus }) {
  const s = STYLES[status];
  return <Badge className={cn("rounded-full font-semibold", s.cls)}>{s.label}</Badge>;
}

export const STATUS_FLOW: PickupStatus[] = [
  "pending", "accepted", "on_the_way", "arrived", "collected", "cash_paid", "completed",
];
