"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp,
  Truck,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/hooks/useFirebaseAuth";
import { listAdminOrders, updateOrder, dispatchOrderViaNimbus, type AdminOrder } from "@/lib/admin-order-actions";
import { formatINR } from "@/lib/products";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Filter = "ALL" | "PENDING" | "PAID";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All Orders" },
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Payment Pending (COD)" },
];

const STATUSES: AdminOrder["status"][] = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
const statusItems = STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }));
const PAGE_SIZE = 10;
const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const payVariant = { PENDING: "signal", PAID: "default", FAILED: "destructive" } as const;

export default function AdminOrdersPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [fetching, setFetching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
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

  const change = async (
    o: AdminOrder,
    c: { status?: AdminOrder["status"]; paymentStatus?: AdminOrder["paymentStatus"] }
  ) => {
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
      toast.error("Could not update the order");
    } finally {
      setBusyId(null);
    }
  };

  const handleDispatch = async (o: AdminOrder) => {
    setDispatchingId(o.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("no token");
      const res = await dispatchOrderViaNimbus(token, o.id);
      if (res.ok) {
        toast.success(`Courier booked! AWB: ${res.awb} (${res.courierName})`);
        reload();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to book courier");
    } finally {
      setDispatchingId(null);
    }
  };

  // KPI Metrics calculation
  const metrics = useMemo(() => {
    if (!orders) return { revenue: 0, toDispatch: 0, delivered: 0, pending: 0 };
    const nonCancelled = orders.filter((o) => o.status !== "CANCELLED");
    const revenue = nonCancelled.reduce((acc, cur) => acc + cur.total, 0);
    const toDispatch = orders.filter((o) => o.status === "PLACED" || (o.status === "CONFIRMED" && !o.awb)).length;
    const delivered = orders.filter((o) => o.status === "DELIVERED").length;
    const pending = orders.filter((o) => o.paymentStatus === "PENDING").length;
    return { revenue, toDispatch, delivered, pending };
  }, [orders]);

  // Client-side search filtering
  const displayOrders = useMemo(() => {
    if (!orders) return null;
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.ref.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        o.awb?.toLowerCase().includes(q) ||
        o.items.some((it) => it.title.toLowerCase().includes(q))
    );
  }, [orders, search]);

  if (loading) {
    return (
      <main className="mx-auto grid h-96 max-w-xl place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Loading..." />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive mb-3">
          <X className="size-6" />
        </div>
        <h1 className="text-xl font-bold">Access Restricted</h1>
        <p className="mt-1 text-sm text-muted-foreground">Only store administrators can view this dashboard.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary underline">
          Back to Store
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-brand px-2 py-0.5 text-xs font-semibold text-brand-foreground">
              Admin Portal
            </span>
            <span className="text-xs text-muted-foreground">Bachatnix Store Manager</span>
          </div>
          <h1 className="font-heading mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Orders Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={reload} disabled={fetching} className="h-9 gap-1.5">
            <RefreshCw className={`size-3.5 ${fetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link href="/admin/products/new">
            <Button size="sm" className="h-9 gap-1.5">
              <Plus className="size-4" />
              Add Product
            </Button>
          </Link>

          <Link href="/">
            <Button variant="ghost" size="sm" className="h-9 gap-1">
              View Store
              <ExternalLink className="size-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Orders */}
        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
              <p className="font-heading mt-1 text-2xl font-bold">{total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">All customer orders</p>
            </div>
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Page Revenue */}
        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Page Revenue</p>
              <p className="font-heading mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(metrics.revenue)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Active orders total</p>
            </div>
            <div className="grid size-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* To Dispatch */}
        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">To Dispatch</p>
              <p className="font-heading mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {metrics.toDispatch}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting courier booking</p>
            </div>
            <div className="grid size-10 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Package className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Delivered */}
        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Delivered</p>
              <p className="font-heading mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {metrics.delivered}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Completed deliveries</p>
            </div>
            <div className="grid size-10 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter orders">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => {
                setFilter(f.value);
                setPage(1);
              }}
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Badge
                variant={filter === f.value ? "default" : "outline"}
                className="h-8 cursor-pointer px-3.5 text-xs font-medium"
              >
                {f.label}
              </Badge>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search ref, customer, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        {error ? (
          <div role="alert" className="p-10 text-center space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : orders === null ? (
          <div className="grid h-48 place-items-center">
            <Loader2 className="size-7 animate-spin text-primary" aria-label="Loading orders..." />
          </div>
        ) : displayOrders && displayOrders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="mx-auto size-8 text-muted-foreground/60" />
            <p className="font-semibold text-base">No orders found</p>
            <p className="text-xs text-muted-foreground">
              {search ? `No orders match "${search}". Try clearing search.` : "New orders will appear here automatically."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="pl-4 font-semibold text-xs">Order & Courier</TableHead>
                    <TableHead className="font-semibold text-xs">Customer Details</TableHead>
                    <TableHead className="font-semibold text-xs">Items</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Total</TableHead>
                    <TableHead className="font-semibold text-xs">Payment</TableHead>
                    <TableHead className="pr-4 font-semibold text-xs">Order Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayOrders?.map((o) => {
                    const locked = o.status === "CANCELLED";
                    const busy = busyId === o.id;
                    return (
                      <TableRow key={o.id} className="hover:bg-muted/30">
                        {/* Order & Courier */}
                        <TableCell className="pl-4 align-top py-3.5">
                          <p className="font-mono text-sm font-bold text-primary">{o.ref}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {dateFmt.format(new Date(o.createdAt))}
                          </p>
                          {o.awb ? (
                            <div className="mt-2 space-y-1">
                              <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                                <Truck className="size-3" />
                                {o.courierName || "Courier"}: {o.awb}
                              </span>
                              <div className="flex items-center gap-2 text-xs">
                                {o.labelUrl && (
                                  <a
                                    href={o.labelUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
                                  >
                                    Print Label
                                  </a>
                                )}
                                {o.trackingUrl && (
                                  <a
                                    href={o.trackingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
                                  >
                                    Live Track &rarr;
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            !locked && (
                              <div className="mt-2">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  disabled={busy || dispatchingId === o.id}
                                  onClick={() => handleDispatch(o)}
                                  className="h-7 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                                >
                                  {dispatchingId === o.id ? (
                                    <>
                                      <Loader2 className="mr-1 size-3 animate-spin" /> Dispatching...
                                    </>
                                  ) : (
                                    "📦 Book Courier"
                                  )}
                                </Button>
                              </div>
                            )
                          )}
                        </TableCell>

                        {/* Customer */}
                        <TableCell className="align-top py-3.5">
                          <p className="font-medium text-sm">{o.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{o.phone}</p>
                          <p className="max-w-52 truncate text-xs text-muted-foreground mt-0.5">
                            {o.address.address ? `${o.address.address}, ` : ""}
                            {o.address.city}, {o.address.state} - {o.address.pincode}
                          </p>
                        </TableCell>

                        {/* Items */}
                        <TableCell className="align-top py-3.5 max-w-56 whitespace-normal text-xs">
                          {o.items.map((i) => (
                            <p key={i.id} className="leading-snug">
                              <span className="font-medium">{i.title}</span>{" "}
                              <span className="text-muted-foreground">× {i.qty}</span>
                            </p>
                          ))}
                        </TableCell>

                        {/* Total */}
                        <TableCell className="align-top py-3.5 text-right font-bold text-sm">
                          {formatINR(o.total)}
                        </TableCell>

                        {/* Payment */}
                        <TableCell className="align-top py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className="text-[11px]">
                              {o.paymentMethod}
                            </Badge>
                            <Badge variant={payVariant[o.paymentStatus]} className="text-[11px]">
                              {o.paymentStatus}
                            </Badge>
                          </div>
                          {o.upiTxnId && (
                            <p className="mt-1 font-mono text-[11px] text-muted-foreground truncate max-w-32">
                              Txn: {o.upiTxnId}
                            </p>
                          )}
                          {o.paymentMethod === "UPI" && o.paymentStatus === "PENDING" && !locked && (
                            <div className="mt-2 flex gap-1.5">
                              <Button
                                size="xs"
                                disabled={busy}
                                onClick={() => change(o, { paymentStatus: "PAID" })}
                                className="h-6 text-[10px]"
                              >
                                <Check className="size-3 mr-0.5" /> Confirm
                              </Button>
                              <Button
                                size="xs"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => change(o, { paymentStatus: "FAILED" })}
                                className="h-6 text-[10px]"
                              >
                                <X className="size-3 mr-0.5" /> Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* Order Status Select */}
                        <TableCell className="align-top py-3.5 pr-4">
                          <Select
                            items={statusItems}
                            value={o.status}
                            disabled={locked || busy}
                            onValueChange={(v) => {
                              if (v && v !== o.status) change(o, { status: v as AdminOrder["status"] });
                            }}
                          >
                            <SelectTrigger className="h-8 w-36 text-xs" aria-label={`Status for ${o.ref}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {statusItems.map((s) => (
                                  <SelectItem key={s.value} value={s.value} className="text-xs">
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
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total orders)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || fetching}
                    onClick={() => setPage((p) => p - 1)}
                    className="h-8 text-xs"
                  >
                    <ChevronLeft className="size-3.5 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || fetching}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 text-xs"
                  >
                    Next <ChevronRight className="size-3.5 ml-1" />
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
