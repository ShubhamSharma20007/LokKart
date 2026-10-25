"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Field, FormError, SubmitButton } from "@/components/formField";
import { ImageUpload } from "@/components/image-upload";
import { auth } from "@/hooks/useFirebaseAuth";
import { createProduct, updateProduct } from "@/lib/actions";
import { initialState, type FormState } from "@/lib/forms";
import { categories } from "@/lib/products";
import type { AdminProduct } from "@/lib/admin-actions";

export function ProductForm({
  product,
  onSaved,
  onCancel,
}: {
  product: AdminProduct | null; // null = add, otherwise edit
  onSaved: () => void;
  onCancel: () => void;
}) {
  const editing = !!product;
  const [state, action, pending] = useActionState(editing ? updateProduct : createProduct, initialState);
  const [uploading, setUploading] = useState(false);
  const handled = useRef<FormState | null>(null);

  // Defaults come from the product being edited; after a failed submit, the submitted values win.
  const initial: Record<string, string> = product
    ? {
        title: product.title,
        category: product.category,
        description: product.description,
        imageUrl: product.imageUrl ?? "",
        imageUrlFileId: product.imageFileId ?? "",
        mrp: String(product.mrp),
        price: String(product.price),
        stock: String(product.stock),
      }
    : {};
  const v = (k: string) => state.values[k] ?? initial[k] ?? "";
  const errors = state.errors;

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state;
      toast.success(editing ? "Product updated" : "Product added");
      onSaved();
    }
  }, [state, editing, onSaved]);

  const submit = async (fd: FormData) => {
    const token = await auth.currentUser?.getIdToken();
    if (token) fd.set("token", token);
    startTransition(() => action(fd));
  };

  const num = (name: string, label: string) => (
    <Field label={label} name={name} error={errors[name]}>
      <Input
        id={name}
        name={name}
        type="number"
        min={name === "stock" && editing ? 0 : 1}
        defaultValue={v(name)}
        aria-invalid={!!errors[name]}
      />
    </Field>
  );

  return (
    <form action={submit} noValidate className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <FormError message={state.ok ? undefined : state.message} />

      <Field label="Title" name="title" error={errors.title}>
        <Input id="title" name="title" defaultValue={v("title")} aria-invalid={!!errors.title} />
      </Field>

      <Field label="Category" name="category" error={errors.category}>
        <Select name="category" defaultValue={v("category") || null}>
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
        <Textarea id="description" name="description" defaultValue={v("description")} aria-invalid={!!errors.description} />
      </Field>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Product image</p>
        <ImageUpload
          name="imageUrl"
          defaultValue={v("imageUrl")}
          defaultFileId={v("imageUrlFileId")}
          error={errors.imageUrl}
          onBusyChange={setUploading}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {num("mrp", "MRP (₹)")}
        {num("price", "Price (₹)")}
        {num("stock", "Stock")}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SubmitButton pending={pending || uploading}>{editing ? "Save changes" : "Add product"}</SubmitButton>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}