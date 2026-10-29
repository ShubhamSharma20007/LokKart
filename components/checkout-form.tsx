"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Banknote, Check, ChevronDown, MapPin, Package, Search, ShieldAlert, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckoutSkeleton, EmptyCart } from "@/components/cart-states";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/hooks/useFirebaseAuth";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { clearCart } from "@/lib/store/slices/cartSlice";import { useCodEstimate } from "@/lib/use-cod-estimate";
import { placeOrder } from "@/lib/order-actions";
import { formatINR } from "@/lib/products";import { useMounted } from "@/lib/use-mounted";
import { usePincodeLookup } from "@/lib/use-pincode-lookup";
import { cn } from "@/lib/utils";



const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
];

function normalizeState(name?: string): string {
  if (!name) return "";
  const clean = name.trim().toLowerCase();
  const match = STATES.find((s) => s.toLowerCase() === clean);
  return match ?? name.trim();
}

type Payment = "COD" | "UPI";
export type PincodeHit = { name: string; district: string; state: string; pincode: string };

const inputClass = "h-10";

function PincodeFinder({ onPick, className }: { onPick: (hit: PincodeHit) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PincodeHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || q.trim().length < 3) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pincode/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const json = await res.json();
        setHits(json.results ?? []);
      } catch {
        if (!ctrl.signal.aborted) setHits([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, open]);

  const show = q.trim().length >= 3;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Search className="size-3" aria-hidden />
        Don&apos;t know your pincode? Search area
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="mt-3 space-y-2 rounded-xl border bg-muted/40 p-3 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search area or city, e.g. Alwar, Gurgaon, Andheri"
              aria-label="Search area or city"
              className={cn(inputClass, "pl-9 bg-background")}
              autoFocus
            />
          </div>
          {show && loading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner className="size-3.5" /> Searching areas...
            </p>
          )}
          {show && !loading && hits.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No areas found. Check spelling or enter pincode manually.
            </p>
          )}
          {show && hits.length > 0 && (
            <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border bg-card">
              {hits.map((h, idx) => (
                <li key={`${h.pincode}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(h);
                      setOpen(false);
                      setQ("");
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs outline-none hover:bg-muted focus-visible:bg-muted"
                  >
                    <span className="truncate">
                      <strong className="font-medium text-foreground">{h.name}</strong>, {h.district}, {h.state}
                    </span>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                      {h.pincode}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const mounted = useMounted();
  const items = useAppSelector((s) => s.cart.items);
  const hydrated = useAppSelector((s) => s.cart.hydrated);
  const [upiLoading, setUpiLoading] = useState(false);

 
  const { user, signingIn, signIn } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [payment, setPayment] = useState<Payment>("UPI");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const mrpTotal = items.reduce((sum, i) => sum + i.mrp * i.qty, 0);


  const cartLines = items.map((i) => ({ id: i.id, qty: i.qty }));
  const cod = useCodEstimate(form.pincode, cartLines, payment === "COD");
  const codCharges = payment === "COD" && cod.status === "ok" ? cod.data.total : 0;
  const grandTotal = subtotal + codCharges;
  const codBlocked = payment === "COD" && cod.status !== "ok";

  const lookup = usePincodeLookup(form.pincode);

  useEffect(() => {
    if (lookup.status === "found") {
      const resolvedState = normalizeState(lookup.state);
      setForm((f) => ({
        ...f,
        city: lookup.district || f.city,
        state: resolvedState || lookup.state || f.state,
      }));
      setErrors((er) => ({ ...er, city: "", state: "" }));
    }
  }, [lookup]);

  const stateOptions = !form.state || STATES.includes(form.state) ? STATES : [form.state, ...STATES];
  const stateItems = stateOptions.map((s) => ({ value: s, label: s }));

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = k === "pincode" || k === "phone" ? e.target.value.replace(/\D/g, "") : e.target.value;
      setForm((f) => ({ ...f, [k]: value }));
      setErrors((er) => ({ ...er, [k]: "" }));
    };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name";
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter a valid 10-digit mobile number";
    if (form.address.trim().length < 10) e.address = "Enter your full address";
    if (form.city.trim().length < 2) e.city = "Enter your city";
    if (form.state.trim().length < 2) e.state = "Select your state";
    if (!/^[1-9]\d{5}$/.test(form.pincode)) e.pincode = "Enter a valid 6-digit pincode";
    // Note: UPI validation removed — Cashfree handles payment
    setErrors(e);
    return Object.keys(e).length === 0;
  };


  const handleCODSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(undefined);
    if (!validate()) return;

    startTransition(async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setFormError("Please sign in to place your order.");
        return;
      }

      const res = await placeOrder({
        token,
        payment: "COD",
        address: form,
        items: items.map((i) => ({ id: i.id, qty: i.qty })),
      });

      if (!res.ok) {
        setFormError(res.message);
        if (res.errors) setErrors(res.errors);
        return;
      }

      dispatch(clearCart());
      toast.success("Order placed!");
      router.push(`/orders?placed=${res.orderId}`);
    });
  };

  const handleUPISubmit = async () => {
    setFormError(undefined);
    // Validate address only (no UTR needed)
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name";
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter a valid 10-digit mobile number";
    if (form.address.trim().length < 10) e.address = "Enter your full address";
    if (form.city.trim().length < 2) e.city = "Enter your city";
    if (form.state.trim().length < 2) e.state = "Select your state";
    if (!/^[1-9]\d{5}$/.test(form.pincode)) e.pincode = "Enter a valid 6-digit pincode";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      setFormError("Please sign in to place your order.");
      return;
    }

    setUpiLoading(true);
    try {
      // 1. Create order on server + get Cashfree session
      const res = await fetch("/api/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          address: form,
          items: items.map((i) => ({ id: i.id, qty: i.qty })),
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        message?: string;
        paymentSessionId?: string;
        orderRef?: string;
      };

      if (!data.ok || !data.paymentSessionId || !data.orderRef) {
        setFormError(data.message ?? "Could not initiate payment. Please try again.");
        return;
      }

      // 2. Load Cashfree SDK dynamically and open checkout
      const { load } = await import("@cashfreepayments/cashfree-js");
      const cashfree = await load({
        mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      });

      const result = await cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        returnUrl: `${window.location.origin}/orders/payment-result?orderId=${data.orderRef}`,
        redirectTarget: "_modal",
      });

      if (result?.error) {
        console.warn("[Cashfree Checkout Modal] User cancelled or error:", result.error);
        toast.error("Payment was cancelled or failed. You can try again.");
      } else {
        dispatch(clearCart());
        router.push(`/orders/payment-result?orderId=${data.orderRef}`);
      }
    } catch (err) {
      console.error("[Cashfree Checkout]", err);
      setFormError("Payment failed to open. Please try again.");
    } finally {
      setUpiLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    if (payment === "COD") {
      handleCODSubmit(e);
    } else {
      e.preventDefault();
      void handleUPISubmit();
    }
  };

    if (!mounted || !hydrated) return <CheckoutSkeleton />;
  if (items.length === 0) return <EmptyCart />;

  return (
    <form onSubmit={submit} noValidate className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        {/* Address Card */}
        <Card className="rounded-2xl border shadow-xs">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="size-4" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-base font-semibold">Delivery address</CardTitle>
                <CardDescription className="text-xs">Where should we deliver your order?</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {formError && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="size-4" />
                <AlertDescription className="text-xs">{formError}</AlertDescription>
              </Alert>
            )}

            {/* Full Name & Mobile Number */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium">Full name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={set("name")}
                  aria-invalid={!!errors.name}
                  autoComplete="name"
                  placeholder="Shubham Sharma"
                  className={inputClass}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">Mobile number</Label>
                <div
                  className={cn(
                    "flex h-10 w-full items-center overflow-hidden rounded-lg border border-input bg-transparent text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                    errors.phone && "border-destructive ring-destructive/20",
                  )}
                >
                  <span className="flex h-full items-center border-r border-input bg-muted/40 px-3 font-medium text-muted-foreground select-none">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={set("phone")}
                    inputMode="numeric"
                    maxLength={10}
                    aria-invalid={!!errors.phone}
                    autoComplete="tel"
                    placeholder="10-digit number"
                    className="h-full w-full bg-transparent px-3 outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
            </div>

            {/* Row 2: Pincode, City, State */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pincode" className="text-xs font-medium">Pincode</Label>
                  {lookup.status === "found" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="size-3" /> Auto-filled
                    </span>
                  )}
                  {lookup.status === "loading" && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Spinner className="size-3" /> Checking...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="pincode"
                    value={form.pincode}
                    onChange={set("pincode")}
                    inputMode="numeric"
                    maxLength={6}
                    aria-invalid={!!errors.pincode}
                    autoComplete="postal-code"
                    placeholder="6-digit PIN"
                    className={cn(inputClass, "pr-8")}
                  />
                  {lookup.status === "loading" && (
                    <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground">
                      <Spinner className="size-4" />
                    </span>
                  )}
                  {lookup.status === "found" && (
                    <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-emerald-500">
                      <Check className="size-4" />
                    </span>
                  )}
                </div>
                {errors.pincode ? (
                  <p className="text-xs text-destructive">{errors.pincode}</p>
                ) : lookup.status === "notfound" ? (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">Unverified PIN, fill manually</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-medium">City / District</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={set("city")}
                  aria-invalid={!!errors.city}
                  autoComplete="address-level2"
                  placeholder="e.g. Alwar"
                  className={inputClass}
                />
                {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs font-medium">State</Label>
                <Select
                  items={stateItems}
                  value={form.state || null}
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, state: v ?? "" }));
                    setErrors((er) => ({ ...er, state: "" }));
                  }}
                >
                  <SelectTrigger
                    id="state"
                    className={cn(inputClass, "w-full justify-between")}
                    aria-invalid={!!errors.state}
                  >
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectGroup>
                      {stateOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
              </div>
            </div>

            {/* Pincode Finder Search Dropdown */}
            <PincodeFinder
              onPick={(hit) => {
                const resolvedState = normalizeState(hit.state);
                setForm((f) => ({
                  ...f,
                  pincode: hit.pincode,
                  city: hit.district || f.city,
                  state: resolvedState || hit.state || f.state,
                }));
                setErrors((er) => ({ ...er, pincode: "", city: "", state: "" }));
              }}
            />

            {/* Row 3: Full Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-medium">Full address</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={set("address")}
                aria-invalid={!!errors.address}
                autoComplete="street-address"
                placeholder="House no., building name, street, locality, landmark"
                className="min-h-20 resize-y text-sm"
              />
              {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Payment Card */}
        <Card className="rounded-2xl border shadow-xs">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="size-4" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-base font-semibold">Payment method</CardTitle>
                <CardDescription className="text-xs">Choose how you want to pay</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <RadioGroup
              value={payment}
              onValueChange={(v) => setPayment(v as Payment)}
              className="grid gap-3 sm:grid-cols-2"
            >
              <Label
                htmlFor="payment-upi"
                className={cn(
                  "relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all select-none",
                  payment === "UPI"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-input hover:bg-muted/50",
                )}
              >
                <RadioGroupItem value="UPI" id="payment-upi" className="mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="size-4 text-primary" />
                    <span className="font-semibold text-sm">UPI</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      ₹0 COD Fee
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-normal leading-relaxed">
                    Pay instantly via GPay / PhonePe / Paytm. Zero COD fee.
                  </p>
                </div>
              </Label>

              <Label
                htmlFor="payment-cod"
                className={cn(
                  "relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all select-none",
                  payment === "COD"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-input hover:bg-muted/50",
                )}
              >
                <RadioGroupItem value="COD" id="payment-cod" className="mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="size-4 text-primary" />
                    <span className="font-semibold text-sm">Cash on Delivery</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Free Shipping
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-normal leading-relaxed">
                    Free shipping on all orders. Nominal COD handling fee applies.
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="rounded-2xl border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <ul className="space-y-1.5 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span className="line-clamp-1">
                    {i.title} <span className="text-muted-foreground">× {i.qty}</span>
                  </span>
                  <span className="shrink-0">{formatINR(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>

            <Separator />

            <div className="space-y-2 text-sm">
              <p className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </p>
              {mrpTotal > subtotal && (
                <p className="flex justify-between text-primary">
                  <span>You save</span>
                  <span>{formatINR(mrpTotal - subtotal)}</span>
                </p>
              )}

              {/* Free delivery badge */}
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Package className="size-3.5 shrink-0" />
                All items include <strong>FREE Delivery</strong>
              </div>

              {payment === "COD" && (
                <div aria-live="polite" className="space-y-2">
                  {cod.status === "idle" && (
                    <p className="text-muted-foreground">Enter your pincode to check delivery.</p>
                  )}
                  {cod.status === "loading" && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Spinner /> Checking delivery...
                    </p>
                  )}
                  {cod.status === "unserviceable" && (
                    <p className="text-destructive">COD is not available for this pincode. Please choose UPI.</p>
                  )}
                  {cod.status === "error" && <p className="text-destructive">{cod.message}</p>}
                  {cod.status === "ok" && (
                    <>
                      <p className="flex justify-between">
                        <span>Shipping</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">FREE</span>
                      </p>
                      <p className="flex justify-between">
                        <span>COD fee</span>
                        <span>{formatINR(cod.data.codCharge)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Delivery in about {cod.data.etaDays} days</p>
                    </>
                  )}
                </div>
              )}
             {payment === "UPI" && (
                <div className="space-y-2">
                  <p className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">FREE</span>
                  </p>
                  <p className="flex justify-between">
                    <span>COD fee</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹0</span>
                  </p>
                  <div className="mt-4 rounded-xl border bg-muted/30 p-4">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="grid size-10 place-items-center rounded-full bg-primary/10">
                        <ShieldCheck className="size-5 text-primary" />
                      </div>
                      <p className="text-sm font-medium">Secured by Cashfree Payments</p>
                      <p className="text-xs text-muted-foreground">
                        Pay via GPay, PhonePe, Paytm, UPI or any UPI-enabled app.
                        Amount: <strong>{formatINR(subtotal)}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <p className="flex items-center justify-between text-base font-bold">
              <span>Total</span>
              <span className="font-heading text-2xl">{formatINR(grandTotal)}</span>
            </p>

            {!user ? (
              <div className="space-y-3 pt-2">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <ShieldAlert className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-semibold">Sign in required to place order</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Please sign in with Google to prevent fake orders and track your delivery.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="h-10 w-full gap-2"
                  onClick={() => void signIn()}
                  disabled={signingIn}
                >
                  {signingIn && <Spinner />}
                  {signingIn ? "Signing in..." : "Sign in with Google to Order"}
                </Button>
              </div>
            ) : payment === "COD" ? (
              <Button type="submit" size="lg" className="h-10 w-full" disabled={pending || codBlocked}>
                {pending && <Spinner />}
                {pending ? "Placing order..." : "Place order (Cash on Delivery)"}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                className="h-10 w-full"
                disabled={upiLoading}
                onClick={() => void handleUPISubmit()}
              >
                {upiLoading && <Spinner />}
                {upiLoading ? "Opening payment..." : `Pay ${formatINR(subtotal)} securely`}
              </Button>
            )}
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

