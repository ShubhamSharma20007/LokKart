"use client";

import { startTransition, useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormError, SubmitButton, SuccessCard } from "@/components/formField";
import { ImageUpload } from "@/components/image-upload";
import { auth } from "@/hooks/useFirebaseAuth";
import { createProduct } from "@/lib/actions";
import { initialState } from "@/lib/forms";
import { categories } from "@/lib/products";

export default function NewProductPage() {
  const [state, action, pending] = useActionState(createProduct, initialState);
  const [uploading, setUploading] = useState(false);
  const [dismissed, setDismissed] = useState<typeof state | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Show the card until "Add another" is clicked. The next submit returns a
  // new state object, so the card can appear again for the next product.
  const showSuccess = state.ok && dismissed !== state;

  // After a successful save, the form starts blank.
  const values: Record<string, string> = state.ok ? {} : state.values;
  const errors: Record<string, string> = state.ok ? {} : state.errors;
  const message = state.ok ? undefined : state.message;

  const addAnother = () => {
    setDismissed(state);
    setFormKey((k) => k + 1); // remounts the form, image upload and select
  };

  // The server checks the admin role from the Firebase token.
  const submit = async (fd: FormData) => {
    const token = await auth.currentUser?.getIdToken();
    if (token) fd.set("token", token);
    startTransition(() => action(fd));
  };

  if (showSuccess) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <SuccessCard
          title="Product added"
          body="The product is saved and will show in the store."
          reference={state.ref}
          actions={[
            { label: "Add another", onClick: addAnother, primary: true },
            { label: "View store", href: "/products" },
          ]}
        />
      </main>
    );
  }

  const num = (name: string, label: string) => (
    <Field label={label} name={name} error={errors[name]}>
      <Input id={name} name={name} type="number" min={1} defaultValue={values[name]} aria-invalid={!!errors[name]} />
    </Field>
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Add a product</h1>
      <form key={formKey} action={submit} noValidate className="mt-6 space-y-4 rounded-xl border bg-card p-5">
        <FormError message={message} />

        <Field label="Title" name="title" error={errors.title}>
          <Input id="title" name="title" defaultValue={values.title} aria-invalid={!!errors.title} />
        </Field>

        <Field label="Category" name="category" error={errors.category}>
          <Select name="category" defaultValue={values.category || null}>
            <SelectTrigger id="category" className="w-full" aria-invalid={!!errors.category}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Description" name="description" error={errors.description}>
          <Textarea id="description" name="description" defaultValue={values.description} aria-invalid={!!errors.description} />
        </Field>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Product image</p>
          <ImageUpload
            name="imageUrl"
            defaultValue={values.imageUrl}
            defaultFileId={values.imageUrlFileId}
            error={errors.imageUrl}
            onBusyChange={setUploading}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {num("mrp", "MRP (₹)")}
          {num("price", "Price (₹)")}
          {num("stock", "Stock")}
        </div>

        <SubmitButton pending={pending || uploading}>Add product</SubmitButton>
      </form>
    </main>
  );
}