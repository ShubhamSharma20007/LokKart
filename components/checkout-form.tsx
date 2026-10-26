"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FormError } from "@/components/formField";
import { CheckoutSkeleton, EmptyCart } from "@/components/cart-states";
import { Spinner } from "@/components/ui/spinner";
import { auth } from "@/hooks/useFirebaseAuth";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { clearCart } from "@/lib/store/slices/cartSlice"; // ADJUST: your "empty cart" action name
import { useCodEstimate } from "@/lib/use-cod-estimate";
import { placeOrder } from "@/lib/order-actions";
import { formatINR } from "@/lib/products";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

type Payment = "COD" | "UPI";

export function CheckoutForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const mounted = useMounted();
  const items = useAppSelector((s) => s.cart.items);
  const hydrated = useAppSelector((s) => s.cart.hydrated);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [payment, setPayment] = useState<Payment>("COD");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const mrpTotal = items.reduce((sum, i) => sum + i.mrp * i.qty, 0);
  const qty = items.reduce((sum, i) => sum + i.qty, 0);

  const cod = useCodEstimate(form.pincode, subtotal, qty, payment === "COD");
  const codCharges = payment === "COD" && cod.status === "ok" ? cod.data.total : 0;
  const grandTotal = subtotal + codCharges;

  const codBlocked = payment === "COD" && cod.status !== "ok";

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    if (form.state.trim().length < 2) e.state = "Enter your state";
    if (!/^[1-9]\d{5}$/.test(form.pincode)) e.pincode = "Enter a valid 6-digit pincode";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e: React.FormEvent) => {
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
        payment,
        address: form,
        items: items.map((i) => ({ id: i.id, qty: i.qty })), // prices are NOT sent; server reads them from DB
      });

      if (!res.ok) {
        setFormError(res.message);
        if (res.errors) setErrors(res.errors);
        return;
      }

      dispatch(clearCart());
      toast.success("Order placed");
      router.push(`/orders?placed=${res.orderId}`);
    });
  };

  if (!mounted || !hydrated) return <CheckoutSkeleton />;
  if (items.length === 0) return <EmptyCart />;

  return (
    <form onSubmit={submit} noValidate className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        {/* Address */}
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="font-heading text-lg font-bold">Delivery address</h2>
          <FormError message={formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="name" error={errors.name}>
              <Input id="name" value={form.name} onChange={set("name")} aria-invalid={!!errors.name} autoComplete="name" />
            </Field>
            <Field label="Mobile number" name="phone" error={errors.phone}>
              <Input
                id="phone"
                value={form.phone}
                onChange={set("phone")}
                inputMode="numeric"
                maxLength={10}
                aria-invalid={!!errors.phone}
                autoComplete="tel"
              />
            </Field>
            <Field label="Address" name="address" error={errors.address} className="sm:col-span-2">
              <Textarea
                id="address"
                value={form.address}
                onChange={set("address")}
                aria-invalid={!!errors.address}
                autoComplete="street-address"
              />
            </Field>
            <Field label="City" name="city" error={errors.city}>
              <Input id="city" value={form.city} onChange={set("city")} aria-invalid={!!errors.city} />
            </Field>
            <Field label="State" name="state" error={errors.state}>
              <Input id="state" value={form.state} onChange={set("state")} aria-invalid={!!errors.state} />
            </Field>
            <Field label="Pincode" name="pincode" error={errors.pincode}>
              <Input
                id="pincode"
                value={form.pincode}
                onChange={set("pincode")}
                inputMode="numeric"
                maxLength={6}
                aria-invalid={!!errors.pincode}
                autoComplete="postal-code"
              />
            </Field>
          </div>
        </section>

        {/* Payment */}
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="font-heading text-lg font-bold">Payment method</h2>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
            {(
              [
                { id: "COD", title: "Cash on Delivery", hint: "Pay when the parcel arrives. Extra COD charges apply." },
                { id: "UPI", title: "UPI", hint: "Pay online. No COD charges." },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={payment === o.id}
                onClick={() => setPayment(o.id)}
                className={cn(
                  "rounded-lg border p-4 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  payment === o.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
                )}
              >
                <p className="font-medium">{o.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{o.hint}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="border-2">
          <CardContent className="space-y-4">
            <h2 className="font-heading text-lg font-bold">Order summary</h2>

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

              {payment === "COD" && (
                <div aria-live="polite" className="space-y-2">
                  {cod.status === "idle" && (
                    <p className="text-muted-foreground">Enter your pincode to see COD charges.</p>
                  )}
                  {cod.status === "loading" && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Spinner /> Checking COD charges...
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
                        <span>{formatINR(cod.data.shipping)}</span>
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
                <p className="flex justify-between">
                  <span>Shipping</span>
                  <span>Free</span>
                </p>
              )}
            </div>

            <Separator />

            <p className="flex items-center justify-between text-base font-bold">
              <span>Total</span>
              <span className="font-heading text-2xl">{formatINR(grandTotal)}</span>
            </p>

            <Button type="submit" size="lg" className="h-10 w-full" disabled={pending || codBlocked}>
              {pending && <Spinner />}
              {pending ? "Placing order..." : payment === "COD" ? "Place order (Cash on Delivery)" : "Place order"}
            </Button>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}