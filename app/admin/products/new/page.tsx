"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/components/auth-provider";
import { ProductForm } from "@/components/admin/product-form";
import { auth } from "@/hooks/useFirebaseAuth";
import { deleteProduct } from "@/lib/actions";
import { listAdminProducts, type AdminProduct } from "@/lib/admin-actions";
import { imageSrc } from "@/lib/product-image";
import { formatINR } from "@/lib/products";

const PAGE_SIZE = 10;

export default function AdminProductsPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [fetching, setFetching] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);

  const [deleting, setDeleting] = useState<AdminProduct | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function fetchProducts() {
      setFetching(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("no token");
        const res = await listAdminProducts(token, page, PAGE_SIZE);
        if (cancelled) return;
        if (res.ok) {
          setProducts(res.products);
          setTotal(res.total);
          setTotalPages(res.totalPages);
          setPage(res.page); // the server clamps the page, e.g. after deleting the last row of the last page
          setError(null);
        } else {
          setError(res.message);
        }
      } catch {
        if (!cancelled) {
          setError("We could not load the products. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    }

    void fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, page, reloadKey]);

  const reload = useCallback(() => {
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  const onSaved = useCallback(() => {
    const wasEditing = !!editing;
    closeForm();
    if (wasEditing || page === 1) {
      reload();
    } else {
      setPage(1);
    }
  }, [editing, page, closeForm, reload]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("no token");
      const res = await deleteProduct(token, deleting.id);
      if (res.ok) {
        toast.success("Product deleted");
        setDeleting(null);
        setProducts((prev) => prev?.filter((p) => p.id !== deleting.id) ?? prev);
        reload();
      } else {
        toast.error(res.message);
        setDeleting(null);
      }
    } catch {
      toast.error("We could not delete the product. Please try again.");
    } finally {
      setDeletePending(false);
    }
  };

  if (loading) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-10"><div className="h-64 animate-pulse rounded-xl bg-muted" /></main>;
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-muted-foreground">Only admins can manage products.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Products</h1>
            {products && (
            <p className="mt-1 text-sm text-muted-foreground">
              {total} {total === 1 ? "product" : "products"}
            </p>
          )}
        </div>
        <Button
          className="h-10 gap-1.5 px-4"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus aria-hidden /> Add product
        </Button>
      </div>

      <div className="mt-6 rounded-xl border bg-card">
        {error ? (
          <div role="alert" className="p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : products === null ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading products" />
          </div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">No products yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Click “Add product” to create the first one.</p>
          </div>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 pl-4">Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-4">
                    <span className="grid size-12 place-items-center overflow-hidden rounded-md bg-muted text-primary/60">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageSrc(p.imageUrl, 96)} alt={p.title} className="size-full object-cover" />
                      ) : (
                        <Package className="size-5" aria-hidden />
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-64 truncate font-medium">{p.title}</TableCell>
                  <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">{formatINR(p.price)}</span>{" "}
                    <span className="text-xs text-muted-foreground line-through">{formatINR(p.mrp)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.stock < 1 ? <Badge variant="destructive">Out of stock</Badge> : p.stock.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                        aria-label={`Edit ${p.title}`}
                      >
                        <Pencil aria-hidden /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleting(p)}
                        aria-label={`Delete ${p.title}`}
                      >
                        <Trash2 aria-hidden /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || fetching}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft aria-hidden /> Previous
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || fetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight aria-hidden />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / edit popup */}
      <Dialog open={formOpen} onOpenChange={(o) => (o ? setFormOpen(true) : closeForm())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg">{editing ? "Edit product" : "Add a product"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the details and save." : "Fill in the details. The product shows in the store once saved."}
            </DialogDescription>
          </DialogHeader>
          <ProductForm key={editing?.id ?? "new"} product={editing} onSaved={onSaved} onCancel={closeForm} />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(o) => { if (!o && !deletePending) setDeleting(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg">Delete this product?</DialogTitle>
            <DialogDescription>
              “{deleting?.title}” and its image will be permanently removed. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletePending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletePending}>
              {deletePending && <Loader2 className="animate-spin" aria-hidden />}
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}