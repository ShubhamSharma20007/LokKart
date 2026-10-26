import { CheckoutForm } from "@/components/checkout-form";

export default function CheckoutPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Checkout</h1>
      <CheckoutForm />
    </section>
  );
}