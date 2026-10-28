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

export const SHIPPING_PRESETS = [
  {
    id: "tshirt",
    label: "T-Shirt / Shirt (Light)",
    short: "T-Shirt / Shirt",
    category: "Garments",
    weightG: 200,
    lengthCm: 25,
    widthCm: 20,
    heightCm: 3,
  },
  {
    id: "lower",
    label: "Lower / Track Pant / Shorts",
    short: "Lower / Shorts",
    category: "Garments",
    weightG: 250,
    lengthCm: 30,
    widthCm: 25,
    heightCm: 4,
  },
  {
    id: "heavy_garment",
    label: "Jogger / Jeans / Hoodie (Heavy)",
    short: "Jeans / Hoodie",
    category: "Garments",
    weightG: 400,
    lengthCm: 32,
    widthCm: 25,
    heightCm: 5,
  },
  {
    id: "tools",
    label: "Accessories / Spanner / Small Tool",
    short: "Accessories / Tool",
    category: "Industrial parts",
    weightG: 150,
    lengthCm: 15,
    widthCm: 10,
    heightCm: 3,
  },
  {
    id: "bada_box",
    label: "Bada Box / Shoes / Electronics",
    short: "Bada Box / Shoes",
    category: "Footwear",
    weightG: 800,
    lengthCm: 30,
    widthCm: 20,
    heightCm: 12,
  },
] as const;

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
  const [category, setCategory] = useState<string | null>(product?.category ?? "Garments");
  const [weightG, setWeightG] = useState(product ? String(product.weightG) : "200");
  const [lengthCm, setLengthCm] = useState(product ? String(product.lengthCm) : "25");
  const [widthCm, setWidthCm] = useState(product ? String(product.widthCm) : "20");
  const [heightCm, setHeightCm] = useState(product ? String(product.heightCm) : "3");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(product ? null : "tshirt");
  const handled = useRef<FormState | null>(null);

  const volG = Math.round((Number(lengthCm || 0) * Number(widthCm || 0) * Number(heightCm || 0)) / 5);
  const billableG = Math.max(Number(weightG || 0), volG);

  const applyPreset = (p: (typeof SHIPPING_PRESETS)[number]) => {
    setSelectedPreset(p.id);
    setWeightG(String(p.weightG));
    setLengthCm(String(p.lengthCm));
    setWidthCm(String(p.widthCm));
    setHeightCm(String(p.heightCm));
    if (!product && p.category && (categories as readonly string[]).includes(p.category)) {
      setCategory(p.category);
    }
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    if (!editing) {
      if (val === "Garments") {
        applyPreset(SHIPPING_PRESETS[0]);
      } else if (val === "Footwear" || val === "Electronics") {
        applyPreset(SHIPPING_PRESETS[4]);
      } else if (val === "Industrial parts") {
        applyPreset(SHIPPING_PRESETS[3]);
      }
    }
  };

  useEffect(() => {
    if (state.values.weightG) setWeightG(state.values.weightG);
    if (state.values.lengthCm) setLengthCm(state.values.lengthCm);
    if (state.values.widthCm) setWidthCm(state.values.widthCm);
    if (state.values.heightCm) setHeightCm(state.values.heightCm);
    if (state.values.category) setCategory(state.values.category);
  }, [state]);

  // Defaults come from the product being edited; after a failed submit, the submitted values win.
  const initial: Record<string, string> = product
    ? {
        title: product.title,
        category: product.category,
        description: product.description,
        imageUrl: product.imageUrl ?? "",
        imageUrlFileId: product.imageFileId ?? "",
        mrp: String(product.mrp),
        price: String(product.basePrice && product.basePrice > 0 ? product.basePrice : product.price),
        stock: String(product.stock),
        weightG: String(product.weightG),
        lengthCm: String(product.lengthCm),
        widthCm: String(product.widthCm),
        heightCm: String(product.heightCm),
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
        <Select name="category" value={category ?? "Garments"} onValueChange={handleCategoryChange}>
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
        <div className="space-y-1">
          {num("price", "Base price (₹)")}
          <p className="text-[11px] text-muted-foreground">
            {editing && product && product.shippingBuffer > 0
              ? `Current buffer: ₹${product.shippingBuffer} → Store price: ₹${product.price}`
              : "Courier buffer auto-calculates & adds to store price"}
          </p>
        </div>
        {num("stock", "Stock")}
      </div>

      <fieldset className="space-y-3 rounded-lg border p-4 bg-muted/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="px-1 text-sm font-semibold">Shipping size (one piece, packed)</legend>
          {billableG > 0 && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
              Billable: {billableG}g • Slab: {billableG <= 500 ? "< 500g (Minimum Courier Rate)" : `${(billableG / 1000).toFixed(1)}kg slab`}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Quick-select preset by item type, or customize dimensions manually:
        </p>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {SHIPPING_PRESETS.map((p) => {
            const active = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-input"
                }`}
              >
                {p.short} ({p.weightG}g, {p.lengthCm}×{p.widthCm}×{p.heightCm})
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-4 pt-1">
          <Field label="Weight (g)" name="weightG" error={errors.weightG}>
            <Input
              id="weightG"
              name="weightG"
              type="number"
              min={1}
              value={weightG}
              onChange={(e) => {
                setWeightG(e.target.value);
                setSelectedPreset(null);
              }}
              aria-invalid={!!errors.weightG}
            />
          </Field>
          <Field label="Length (cm)" name="lengthCm" error={errors.lengthCm}>
            <Input
              id="lengthCm"
              name="lengthCm"
              type="number"
              min={1}
              value={lengthCm}
              onChange={(e) => {
                setLengthCm(e.target.value);
                setSelectedPreset(null);
              }}
              aria-invalid={!!errors.lengthCm}
            />
          </Field>
          <Field label="Width (cm)" name="widthCm" error={errors.widthCm}>
            <Input
              id="widthCm"
              name="widthCm"
              type="number"
              min={1}
              value={widthCm}
              onChange={(e) => {
                setWidthCm(e.target.value);
                setSelectedPreset(null);
              }}
              aria-invalid={!!errors.widthCm}
            />
          </Field>
          <Field label="Height (cm)" name="heightCm" error={errors.heightCm}>
            <Input
              id="heightCm"
              name="heightCm"
              type="number"
              min={1}
              value={heightCm}
              onChange={(e) => {
                setHeightCm(e.target.value);
                setSelectedPreset(null);
              }}
              aria-invalid={!!errors.heightCm}
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SubmitButton pending={pending || uploading}>{editing ? "Save changes" : "Add product"}</SubmitButton>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}