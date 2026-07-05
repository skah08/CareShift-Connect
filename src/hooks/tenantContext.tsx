import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { listMyMemberships, type TenantMembershipDTO } from "@/lib/tenants.functions";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "hospishift.active_tenant_id";

interface TenantContextValue {
  memberships: TenantMembershipDTO[];
  activeTenantId: string | null;
  activeTenant: TenantMembershipDTO | null;
  loading: boolean;
  setActiveTenantId: (id: string | null) => void;
  refresh: () => Promise<void>;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [memberships, setMemberships] = useState<TenantMembershipDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listMyMemberships();
      setMemberships(rows);
      setActiveTenantIdState((current) => {
        if (current && rows.some((r) => r.tenant_id === current)) return current;
        return rows[0]?.tenant_id ?? null;
      });
    } catch (err) {
      console.error("[Tenant] refresh failed", err);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setActiveTenantId = useCallback((id: string | null) => {
    setActiveTenantIdState(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<TenantContextValue>(
    () => ({
      memberships,
      activeTenantId,
      activeTenant:
        memberships.find((m) => m.tenant_id === activeTenantId) ?? null,
      loading,
      setActiveTenantId,
      refresh,
    }),
    [memberships, activeTenantId, loading, setActiveTenantId, refresh],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};
