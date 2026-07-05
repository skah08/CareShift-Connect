import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Pencil, Search, ListFilter, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/useTenant";
import { listEmployees, upsertEmployee } from "@/lib/employees.functions";

type EmployeeRow = Awaited<ReturnType<typeof listEmployees>>[number];

const PRIMARY_ROLES = [
  "Physician_Attending",
  "Physician_Resident",
  "Nurse_Manager",
  "Nurse_RN",
  "Nurse_Aide",
  "Midwife",
] as const;

const CONTRACT_TYPES = [
  "Full_Time",
  "Part_Time",
  "Freelancer_Locum",
  "External_Consultant",
] as const;

type PrimaryRole = (typeof PRIMARY_ROLES)[number];
type ContractType = (typeof CONTRACT_TYPES)[number];

interface FormState {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  primary_role: PrimaryRole;
  contract_type: ContractType;
  fte_factor: number;
}

const emptyForm: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  primary_role: "Nurse_RN",
  contract_type: "Full_Time",
  fte_factor: 1,
};

type SortKey = "name" | "role" | "contract" | "fte";

export const StaffPage = () => {
  const { t } = useTranslation();
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filterOpen, setFilterOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [contractFilter, setContractFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const query = useQuery({
    queryKey: ["employees", activeTenantId, search, roleFilter, contractFilter, sortKey, sortDir],
    queryFn: () =>
      listEmployees({
        data: {
          tenant_id: activeTenantId!,
          search,
          role_filter: roleFilter.length > 0 ? roleFilter : undefined,
          contract_filter: contractFilter.length > 0 ? contractFilter : undefined,
          sort_key: sortKey,
          sort_dir: sortDir,
        },
      }),
    enabled: !!activeTenantId,
  });

  const mutation = useMutation({
    mutationFn: async (payload: FormState) => {
      if (!activeTenantId) throw new Error("No active tenant");
      return upsertEmployee({
        data: {
          tenant_id: activeTenantId,
          id: payload.id,
          first_name: payload.first_name,
          last_name: payload.last_name,
          email: payload.email,
          primary_role: payload.primary_role,
          contract_type: payload.contract_type,
          fte_factor: payload.fte_factor,
        },
      });
    },
    onSuccess: () => {
      toast.success(t("common.save"));
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["employees", activeTenantId] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30" />;
    return sortDir === "asc"
      ? <ArrowUp className="size-3" />
      : <ArrowDown className="size-3" />;
  };

  const activeFilterCount = roleFilter.length + contractFilter.length;

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (e: EmployeeRow) => {
    setForm({
      id: e.id,
      first_name: e.first_name,
      last_name: e.last_name,
      email: e.email,
      primary_role: e.primary_role as PrimaryRole,
      contract_type: (e.contract_type ?? "Full_Time") as ContractType,
      fte_factor: Number(e.fte_factor ?? 1),
    });
    setOpen(true);
  };

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">{t("staff.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("staff.subtitle")}</p>
        </div>
        <Button onClick={openNew} className="min-h-11 md:min-h-9">
          <Plus className="size-4 mr-2" /> {t("staff.add")}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-48 flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input autoComplete="off"
            className="pl-8"
            placeholder={t("staff.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 min-h-11 md:min-h-9 min-w-11 md:min-w-9">
              <ListFilter className="size-4" />
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] md:w-64" align="start">
            <div className="space-y-4">
              <fieldset>
                <legend className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  {t("staff.filterRole")}
                </legend>
                <div className="space-y-1.5">
                  {PRIMARY_ROLES.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={roleFilter.includes(r)}
                        onCheckedChange={() =>
                          setRoleFilter((prev) =>
                            prev.includes(r) ? prev.filter((v) => v !== r) : [...prev, r],
                          )
                        }
                      />
                      {t(`staff.roles.${r}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Separator />
              <fieldset>
                <legend className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  {t("staff.filterContract")}
                </legend>
                <div className="space-y-1.5">
                  {CONTRACT_TYPES.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={contractFilter.includes(c)}
                        onCheckedChange={() =>
                          setContractFilter((prev) =>
                            prev.includes(c) ? prev.filter((v) => v !== c) : [...prev, c],
                          )
                        }
                      />
                      {c.replace(/_/g, " ")}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <GlassPanel className="p-4 md:p-6">
        {query.isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (query.data?.length ?? 0) === 0 ? (
          <p className="text-muted-foreground">{t("staff.empty")}</p>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => handleSort("name")}>
                      <span className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                        {t("staff.firstName")} / {t("staff.lastName")}
                        <SortIcon col="name" />
                      </span>
                    </th>
                    <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => handleSort("role")}>
                      <span className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                        {t("staff.role")}
                        <SortIcon col="role" />
                      </span>
                    </th>
                    <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => handleSort("contract")}>
                      <span className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                        {t("staff.contract")}
                        <SortIcon col="contract" />
                      </span>
                    </th>
                    <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => handleSort("fte")}>
                      <span className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                        {t("staff.fte")}
                        <SortIcon col="fte" />
                      </span>
                    </th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {query.data!.map((e) => (
                    <tr key={e.id}>
                      <td className="py-3 pr-3 font-medium">
                        {e.first_name} {e.last_name}
                        <div className="text-xs text-muted-foreground font-normal">{e.email}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant="secondary">{t(`staff.roles.${e.primary_role}`)}</Badge>
                      </td>
                      <td className="py-3 pr-3">{(e.contract_type ?? "").replace(/_/g, " ")}</td>
                      <td className="py-3 pr-3">{Number(e.fte_factor ?? 1).toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                          <Pencil className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile: cards */}
            <div className="md:hidden flex flex-col gap-3">
              {query.data!.map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-border/40 bg-background/40 p-4 flex items-center justify-between gap-3 cursor-pointer active:bg-background/60 transition-colors min-h-[60px]"
                  onClick={() => openEdit(e)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {e.first_name} {e.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{e.email}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="secondary" className="text-[10px] leading-none px-1.5 py-0.5">
                        {t(`staff.roles.${e.primary_role}`)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground self-center">
                        {(e.contract_type ?? "").replace(/_/g, " ")} · {Number(e.fte_factor ?? 1).toFixed(2)} FTE
                      </span>
                    </div>
                  </div>
                  <Pencil className="size-4 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
          </>
        )}
      </GlassPanel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? t("staff.edit") : t("staff.add")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fn">{t("staff.firstName")}</Label>
                <Input autoComplete="off"
                  id="fn"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ln">{t("staff.lastName")}</Label>
                <Input autoComplete="off"
                  id="ln"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="em">Email</Label>
              <Input autoComplete="off"
                id="em"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("staff.role")}</Label>
                <Select
                  value={form.primary_role}
                  onValueChange={(v) => setForm({ ...form, primary_role: v as PrimaryRole })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIMARY_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("staff.contract")}</Label>
                <Select
                  value={form.contract_type}
                  onValueChange={(v) => setForm({ ...form, contract_type: v as ContractType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((r) => (
                      <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fte">{t("staff.fte")}</Label>
              <Input autoComplete="off"
                id="fte"
                type="number"
                min={0.1}
                max={1}
                step={0.05}
                value={form.fte_factor}
                onChange={(e) => setForm({ ...form, fte_factor: Number(e.target.value) })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="min-h-11 md:min-h-9">
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="min-h-11 md:min-h-9">
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};