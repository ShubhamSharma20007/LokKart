"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError, SubmitButton, SuccessCard, selectClass } from "@/components/formField";
import { createProduct } from "@/lib/actions";
import { initialState } from "@/lib/forms";
import { categories } from "@/lib/products";

export default function NewProductPage() {
  const [state, action, pending] = useActionState(createProduct, initialState);

  if (state.ok) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <SuccessCard
          title="Product added"
          body="The product is saved and will show in the store."
          reference={state.ref}
          actions={[
            { href: "/admin/products/new", label: "Add another", primary: true },
            { href: "/products", label: "View store" },
          ]}
        />
      </main>
    );
  }

  const num = (name: string, label: string) => (
    <Field label={label} name={name} error={state.errors[name]}>
      <Input id={name} name={name} type="number" min={1} defaultValue={state.values[name]} aria-invalid={!!state.errors[name]} />
    </Field>
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Add a product</h1>
      <form action={action} noValidate className="mt-6 space-y-4 rounded-xl border bg-card p-5">
        <FormError message={state.message} />
        <Field label="Title" name="title" error={state.errors.title}>
          <Input id="title" name="title" defaultValue={state.values.title} aria-invalid={!!state.errors.title} />
        </Field>
        <Field label="Category" name="category" error={state.errors.category}>
          <select id="category" name="category" defaultValue={state.values.category ?? ""} className={selectClass} aria-invalid={!!state.errors.category}>
            <option value="" disabled>Select a category</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Description" name="description" error={state.errors.description}>
          <Textarea id="description" name="description" defaultValue={state.values.description} aria-invalid={!!state.errors.description} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          {num("mrp", "MRP (₹)")}
          {num("price", "Price (₹)")}
          {num("stock", "Stock")}
        </div>
        <SubmitButton pending={pending}>Add product</SubmitButton>
      </form>
    </main>
  );
}