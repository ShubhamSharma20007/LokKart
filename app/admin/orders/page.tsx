"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/hooks/useFirebaseAuth";
import { listAdminOrders, updateOrder, type AdminOrder } from "@/lib/admin-order-actions";
import { formatINR } from "@/lib/products";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Filter = "ALL" | "PENDING" | "PAID";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Payment pending" },
  { value: "PAID", label: "Paid" },
];
const STATUSES: AdminOrder["status"][] = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
const statusItems = STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }));
const PAGE_SIZE = 10;
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const payVariant = { PENDING: "signal", PAID: "default", FAILED: "destructive" } as const;

export default function AdminOrdersPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [fetching, setFetching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function fetchOrders() {
      setFetching(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("no token");
        const res = await listAdminOrders(token, page, filter, PAGE_SIZE);
        if (cancelled) return;
        if (res.ok) {
          setOrders(res.orders);
          setTotal(res.total);
          setTotalPages(res.totalPages);
          setPage(res.page);
          setError(null);
        } else {
          setError(res.message);
        }
      } catch {
        if (!cancelled) {
          setError("We could not load the orders. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    }

    void fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, page, filter, reloadKey]);

  const reload = useCallback(() => {
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const change = async (o: AdminOrder, c: { status?: AdminOrder["status"]; paymentStatus?: AdminOrder["paymentStatus"] }) => {
    setBusyId(o.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("no token");
      const res = await updateOrder(token, o.id, c);
      if (res.ok) {
        toast.success(`Order ${o.ref} updated`);
        reload();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("We could not update the order. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-10"><div className="h-64 animate-pulse rounded-xl bg-muted" /></main>;
  }
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-muted-foreground">Only admins can manage orders.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Orders</h1>
          {orders && <p className="mt-1 text-sm text-muted-foreground">{total} {total === 1 ? "order" : "orders"}</p>}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by payment">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Badge variant={filter === f.value ? "default" : "outline"} className="h-7 cursor-pointer px-3 text-sm">
                {f.label}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-card">
        {error ? (
          <div role="alert" className="p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : orders === null ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading orders" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">No orders here.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const locked = o.status === "CANCELLED";
                  const busy = busyId === o.id;
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="pl-4">
                        <p className="font-mono text-sm font-semibold">{o.ref}</p>
                        <p className="text-xs text-muted-foreground">{dateFmt.format(new Date(o.createdAt))}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{o.name}</p>
                        <p className="text-xs text-muted-foreground">{o.phone}</p>
                        <p className="max-w-56 truncate text-xs text-muted-foreground">
                          {o.address.city}, {o.address.state} {o.address.pincode}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-56 whitespace-normal text-xs">
                        {o.items.map((i) => (
                          <p key={i.id}>{i.title} × {i.qty}</p>
                        ))}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatINR(o.total)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{o.paymentMethod}</Badge>
                          <Badge variant={payVariant[o.paymentStatus]}>{o.paymentStatus}</Badge>
                        </div>
                        {o.upiTxnId && <p className="mt-1 font-mono text-xs">UTR {o.upiTxnId}</p>}
                        {o.paymentMethod === "UPI" && o.paymentStatus === "PENDING" && !locked && (
                          <div className="mt-2 flex gap-2">
                            <Button size="xs" disabled={busy} onClick={() => change(o, { paymentStatus: "PAID" })}>
                              <Check aria-hidden /> Mark paid
                            </Button>
                            <Button size="xs" variant="destructive" disabled={busy} onClick={() => change(o, { paymentStatus: "FAILED" })}>
                              <X aria-hidden /> Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="pr-4">
                        <Select
                          items={statusItems}
                          value={o.status}
                          disabled={locked || busy}
                          onValueChange={(v) => {
                            if (v && v !== o.status) change(o, { status: v as AdminOrder["status"] });
                          }}
                        >
                          <SelectTrigger className="h-8 w-36" aria-label={`Status for ${o.ref}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {statusItems.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                <p className="text-sm text-muted-foreground" aria-live="polite">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1 || fetching} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft aria-hidden /> Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages || fetching} onClick={() => setPage((p) => p + 1)}>
                    Next <ChevronRight aria-hidden />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}