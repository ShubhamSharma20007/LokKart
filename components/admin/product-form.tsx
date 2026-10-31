"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Field, FormError, SubmitButton } from "@/components/formField";
import { MultiImageUpload } from "@/components/multi-image-upload";
import { auth } from "@/hooks/useFirebaseAuth";
import { createProduct, updateProduct } from "@/lib/actions";
import { initialState, type FormState } from "@/lib/forms";
import { categories } from "@/lib/products";
import type { AdminProduct } from "@/lib/admin-actions";

export const SHIPPING_PRESETS = [
  {
    id: "tshirt",
    label: "T-Shirt / Top / Light Garment",
    short: "T-Shirt / Top",
    category: "T-Shirts",
    weightG: 200,
    lengthCm: 25,
    widthCm: 20,
    heightCm: 3,
  },
  {
    id: "lower",
    label: "Lower / Track Pant / Shorts",
    short: "Lower / Shorts",
    category: "Track Pants & Lowers",
    weightG: 250,
    lengthCm: 30,
    widthCm: 25,
    heightCm: 4,
  },
  {
    id: "heavy_garment",
    label: "Jeans / Hoodie / Heavy Jacket",
    short: "Jeans / Hoodie",
    category: "Jeans",
    weightG: 450,
    lengthCm: 32,
    widthCm: 25,
    heightCm: 5,
  },
  {
    id: "ethnic",
    label: "Saree / Kurti / Ethnic Wear",
    short: "Saree / Ethnic",
    category: "Sarees & Ethnic",
    weightG: 350,
    lengthCm: 30,
    widthCm: 22,
    heightCm: 4,
  },
  {
    id: "box_pack",
    label: "Box Pack / Footwear / Bulk Order",
    short: "Box / Footwear",
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
  
  const initialCategory = product?.category ?? "T-Shirts";
  const [isCustomCategory, setIsCustomCategory] = useState(
    !!product?.category && !categories.includes(product.category)
  );
  const [category, setCategory] = useState<string | null>(initialCategory);

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
    if (!product && p.category) {
      setIsCustomCategory(!categories.includes(p.category));
      setCategory(p.category);
    }
  };

  const handleCategoryChange = (val: string | null) => {
    if (!val) return;
    setCategory(val);
    if (!editing) {
      if (val === "T-Shirts" || val === "Shirts") {
        applyPreset(SHIPPING_PRESETS[0]);
      } else if (val === "Track Pants & Lowers" || val === "Shorts") {
        applyPreset(SHIPPING_PRESETS[1]);
      } else if (val === "Jeans" || val === "Hoodies & Jackets") {
        applyPreset(SHIPPING_PRESETS[2]);
      } else if (val === "Sarees & Ethnic" || val === "Kurtis") {
        applyPreset(SHIPPING_PRESETS[3]);
      }
    }
  };

  useEffect(() => {
    if (state.values.weightG) setWeightG(state.values.weightG);
    if (state.values.lengthCm) setLengthCm(state.values.lengthCm);
    if (state.values.widthCm) setWidthCm(state.values.widthCm);
    if (state.values.heightCm) setHeightCm(state.values.heightCm);
    if (state.values.category) {
      setCategory(state.values.category);
      if (!categories.includes(state.values.category)) {
        setIsCustomCategory(true);
      }
    }
  }, [state]);

  const defaultImages = useMemo(() => {
    if (product?.images && product.images.length > 0) return product.images;
    if (product?.imageUrl) return [product.imageUrl];
    return [];
  }, [product]);

  const defaultFileIds = useMemo(() => {
    if (product?.imageFileIds && product.imageFileIds.length > 0) return product.imageFileIds;
    if (product?.imageFileId) return [product.imageFileId];
    return [];
  }, [product]);

  const initialValues = useMemo(
    () =>
      product
        ? {
            title: product.title,
            category: product.category,
            description: product.description,
            price: product.basePrice ? String(product.basePrice) : String(product.price),
            mrp: String(product.mrp),
            stock: String(product.stock),
            weightG: String(product.weightG),
            lengthCm: String(product.lengthCm),
            widthCm: String(product.widthCm),
            heightCm: String(product.heightCm),
          }
        : {},
    [product],
  );

  useEffect(() => {
    if (!state.message || state === handled.current) return;
    handled.current = state;
    if (state.ok) {
      toast.success(editing ? "Product updated" : "Product added");
      onSaved();
    } else {
      toast.error(state.message);
    }
  }, [state, editing, onSaved]);

  const submit = async (fd: FormData) => {
    const token = await auth.currentUser?.getIdToken();
    if (token) fd.set("token", token);
    if (category) fd.set("category", category);
    startTransition(() => action(fd));
  };

  const v = (name: string) => state.values[name] ?? initialValues[name as keyof typeof initialValues] ?? "";
  const errors = state.errors ?? {};

  const num = (name: "price" | "mrp" | "stock", label: string) => (
    <Field key={name} label={label} name={name} error={errors[name]}>
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
        <div className="space-y-2">
          {!isCustomCategory ? (
            <div className="flex gap-2">
              <Select
                value={category && categories.includes(category) ? category : "T-Shirts"}
                onValueChange={(val) => {
                  if (val === "__custom__") {
                    setIsCustomCategory(true);
                    setCategory("");
                  } else {
                    handleCategoryChange(val);
                  }
                }}
              >
                <SelectTrigger id="category" className="w-full" aria-invalid={!!errors.category}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="__custom__" className="font-semibold text-primary">
                      + Enter Custom Category...
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => {
                  setIsCustomCategory(true);
                  setCategory("");
                }}
              >
                + New Category
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Input
                  id="category"
                  name="category"
                  value={category ?? ""}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Winter Wear, Footwear, Sarees, Kurti..."
                  autoFocus
                  aria-invalid={!!errors.category}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setIsCustomCategory(false);
                    setCategory(categories[0] || "T-Shirts");
                  }}
                >
                  Choose from list
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Type any category name. It will dynamically show up across your store as soon as products are added!
              </p>
            </div>
          )}
        </div>
      </Field>

      <Field label="Description" name="description" error={errors.description}>
        <Textarea id="description" name="description" defaultValue={v("description")} aria-invalid={!!errors.description} />
      </Field>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Product images (Up to 3)</p>
        <MultiImageUpload
          defaultImages={defaultImages}
          defaultFileIds={defaultFileIds}
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
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {p.short}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
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

      <div className="flex gap-2 pt-2">
        <SubmitButton pending={pending || uploading}>
          {editing ? "Save changes" : "Add product"}
        </SubmitButton>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
