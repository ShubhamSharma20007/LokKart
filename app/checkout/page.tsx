"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { CheckoutSkeleton, EmptyCart } from "@/components/cart-states";
import { Field, FormError, SubmitButton, SuccessCard } from "@/components/formField";
import { placeOrder } from "@/lib/actions";
import { initialState } from "@/lib/forms";
import { formatINR } from "@/lib/products";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { clearCart, selectHydrated, selectSubtotal } from "@/lib/store/slices/cartSlice";
import { cn } from "@/lib/utils";
import { auth } from "@/hooks/useFirebaseAuth";
import { useMounted } from "@/lib/use-mounted";
import Link from "next/link";
type Method = "COD" | "UPI";

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const hydrated = useAppSelector(selectHydrated);
  const total = useAppSelector(selectSubtotal);
  const mounted = useMounted();
  const isReady = mounted && hydrated;
  const [state, action, pending] = useActionState(placeOrder, initialState);
  const [method, setMethod] = useState<Method>("COD");
  const submit = async (fd: FormData) => {
    const token = await auth.currentUser?.getIdToken();
    if (token) fd.set("token", token);
    startTransition(() => action(fd));
  };

  useEffect(() => {
    if (state.ok) {
      dispatch(clearCart());
      toast.success("Order placed", { id: state.ref, description: `Reference ${state.ref}` });
    } else if (state.message) {
      toast.error(state.message, { id: "checkout-error" });
    }
  }, [state, dispatch]);

  const upiId = process.env.NEXT_PUBLIC_UPI_ID ?? "";
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Bachatnix&am=${total.toFixed(2)}&cu=INR&tn=Bachatnix%20order`;

  const text = (name: string, label: string, props: React.ComponentProps<"input"> = {}, className?: string) => (
    <Field label={label} name={name} error={state.errors[name]} className={className}>
      <Input id={name} name={name} defaultValue={state.values[name]} aria-invalid={!!state.errors[name]} {...props} />
    </Field>
  );

  if (state.ok) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <SuccessCard
          title="Order placed"
          body={
            state.values.method === "UPI"
              ? "We will confirm your UPI payment and then ship your order."
              : "Keep the cash ready. You pay when the order arrives."
          }
          reference={state.ref}
          actions={[
            { href: "/orders", label: "View my orders", primary: true },
            { href: "/products", label: "Continue shopping" },
          ]}
        />
      </main>
    );
  }

  if (!isReady) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Checkout</h1>
        <CheckoutSkeleton />
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Checkout</h1>
        <EmptyCart />
      </main>
    );
  }

  const savings = items.reduce((n, i) => n + (i.mrp - i.price) * i.qty, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Checkout</h1>

      <form action={submit} noValidate className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ id: i.id, qty: i.qty })))} />

        <div className="space-y-6">
          <FormError message={state.message} />

          <section className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="font-heading text-lg font-bold">Delivery address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("name", "Full name", { autoComplete: "name" })}
              {text("phone", "Mobile number", { type: "tel", autoComplete: "tel" })}
              {text("address", "Address", { autoComplete: "street-address" }, "sm:col-span-2")}
              {text("city", "City", { autoComplete: "address-level2" })}
              {text("state", "State", { autoComplete: "address-level1" })}
              {text("pincode", "Pincode", { inputMode: "numeric", maxLength: 6, autoComplete: "postal-code" })}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="font-heading text-lg font-bold">Payment method</h2>
            <div role="radiogroup" aria-label="Payment method" className="grid gap-3 sm:grid-cols-2">
              {([
                ["COD", "Cash on Delivery", "Pay in cash when the order arrives."],
                ["UPI", "UPI", "Scan the QR or open your UPI app."],
              ] as const).map(([value, title, hint]) => (
                <label
                  key={value}
                  className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/30 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                >
                  <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} className="sr-only" />
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-muted-foreground">{hint}</span>
                </label>
              ))}
            </div>
            {state.errors.method && <p className="text-sm text-destructive">{state.errors.method}</p>}

            {method === "UPI" && (
              <div className="space-y-4 rounded-lg bg-muted/60 p-4">
                {upiId ? (
                  <div className="flex flex-wrap items-center gap-5">
                    <div className="rounded-lg bg-white p-3">
                      <QRCodeSVG value={upiLink} size={150} 
                      
                      />
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>Pay <strong>{formatINR(total)}</strong> to <span className="font-mono">{upiId}</span></p>
                      <Link href={upiLink} className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3 sm:hidden")}>
                        Open UPI app
                      </Link>
                      <p className="text-muted-foreground">After paying, enter the 12-digit UTR from your UPI app below.</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">UPI is not set up yet. Add NEXT_PUBLIC_UPI_ID to your .env file.</p>
                )}
                {text("utr", "UTR / transaction ID", { inputMode: "numeric", maxLength: 12, placeholder: "12-digit number" })}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="border-2">
            <CardContent className="space-y-4">
              <h2 className="font-heading text-lg font-bold">Order summary</h2>
              <ul className="space-y-2 text-sm">
                {items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{i.title} × {i.qty}</span>
                    <span className="font-medium">{formatINR(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              {savings > 0 && <p className="text-sm font-medium text-primary">You save {formatINR(savings)} vs MRP</p>}
              <div className="flex justify-between border-t pt-4">
                <span className="font-medium">Total</span>
                <span className="font-heading text-2xl font-bold">{formatINR(total)}</span>
              </div>
              <SubmitButton pending={pending}>{method === "COD" ? "Place order" : "Confirm payment and order"}</SubmitButton>
            </CardContent>
          </Card>
        </aside>
      </form>
    </main>
  );
}