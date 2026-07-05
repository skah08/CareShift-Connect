import { useTenant } from "@/hooks/useTenant";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@tanstack/react-router";

export const TenantSwitcher = () => {
  const { memberships, activeTenantId, setActiveTenantId, loading } = useTenant();

  if (loading) {
    return (
      <div className="h-8 rounded-md bg-muted/40 animate-pulse" aria-hidden />
    );
  }

  if (memberships.length === 0) {
    return (
      <Link
        to="/onboarding"
        className="block text-xs text-primary underline underline-offset-2"
      >
        Create organization
      </Link>
    );
  }

  return (
    <Select
      value={activeTenantId ?? undefined}
      onValueChange={(v) => setActiveTenantId(v)}
    >
      <SelectTrigger className="h-8 min-h-11 md:min-h-8 text-xs">
        <SelectValue placeholder="Select org" />
      </SelectTrigger>
      <SelectContent>
        {memberships.map((m) => (
          <SelectItem key={m.tenant_id} value={m.tenant_id}>
            <span className="truncate">{m.tenant_name}</span>
            <span className="ml-2 text-[10px] uppercase text-muted-foreground">
              {m.role}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};