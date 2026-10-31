"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/components/auth-provider";
import { ProductForm } from "@/components/admin/product-form";
import { auth } from "@/hooks/useFirebaseAuth";
import { deleteProduct } from "@/lib/actions";
import { listAdminProducts, type AdminProduct } from "@/lib/admin-actions";
import { imageSrc } from "@/lib/product-image";
import { formatINR } from "@/lib/products";

export default function AdminProductsPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [fetching, setFetching] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);

  const [deleting, setDeleting] = useState<AdminProduct | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function fetchProducts() {
      setFetching(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("no token");
        const res = await listAdminProducts(token, page, pageSize, debouncedQuery);
        if (cancelled) return;
        if (res.ok) {
          setProducts(res.products);
          setTotal(res.total);
          setTotalPages(res.totalPages);
          setPage(res.page); // the server clamps the page
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
  }, [isAdmin, page, pageSize, debouncedQuery, reloadKey]);

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

  // Helper to generate page buttons (e.g. [1, 2, 3, 4, 5])
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-muted-foreground">Only admins can manage products.</p>
      </main>
    );
  }

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Products Management</h1>
          {products && (
            <p className="mt-1 text-sm text-muted-foreground">
              Total {total} {total === 1 ? "product" : "products"} in catalog
            </p>
          )}
        </div>
        <Button
          className="h-10 gap-1.5 px-4 font-semibold shadow-xs"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden /> Add product
        </Button>
      </div>

      {/* Search & Action Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or category..."
            className="h-9 pl-9 pr-8 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Page size picker */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="mt-3 rounded-xl border bg-card shadow-xs">
        {error ? (
          <div role="alert" className="p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : products === null ? (
          <div className="grid h-48 place-items-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading products" />
              <p className="text-xs text-muted-foreground">Loading products...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-base">
              {debouncedQuery ? "No matching products found." : "No products yet."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {debouncedQuery
                ? "Try searching with a different keyword."
                : "Click “Add product” to create the first one."}
            </p>
            {debouncedQuery && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="relative overflow-x-auto">
              {fetching && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                  <Loader2 className="size-5 animate-spin text-primary" />
                </div>
              )}
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
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <span className="font-semibold text-primary">{formatINR(p.price)}</span>{" "}
                          <span className="text-xs text-muted-foreground line-through">{formatINR(p.mrp)}</span>
                        </div>
                        {p.shippingBuffer > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            Base {formatINR(p.basePrice > 0 ? p.basePrice : p.price - p.shippingBuffer)} + Ship {formatINR(p.shippingBuffer)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.stock < 1 ? (
                          <Badge variant="destructive">Out of stock</Badge>
                        ) : (
                          p.stock.toLocaleString("en-IN")
                        )}
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
                            <Pencil className="size-3.5 mr-1" aria-hidden /> Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleting(p)}
                            aria-label={`Delete ${p.title}`}
                          >
                            <Trash2 className="size-3.5 mr-1" aria-hidden /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 bg-muted/5">
              <p className="text-xs sm:text-sm text-muted-foreground" aria-live="polite">
                Showing <span className="font-medium text-foreground">{startRecord}</span>–<span className="font-medium text-foreground">{endRecord}</span> of <span className="font-medium text-foreground">{total}</span>
              </p>

              <div className="flex items-center gap-1.5">
                {/* First Page */}
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page <= 1 || fetching}
                  onClick={() => setPage(1)}
                  title="First page"
                >
                  <ChevronsLeft className="size-4" />
                </Button>

                {/* Previous Page */}
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page <= 1 || fetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                {/* Numbered Page Buttons */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((num) => (
                    <Button
                      key={num}
                      variant={page === num ? "default" : "outline"}
                      size="sm"
                      className="size-8 p-0 text-xs font-medium"
                      disabled={fetching}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </Button>
                  ))}
                </div>

                {/* Next Page */}
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page >= totalPages || fetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>

                {/* Last Page */}
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page >= totalPages || fetching}
                  onClick={() => setPage(totalPages)}
                  title="Last page"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Popup Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => (!open ? closeForm() : setFormOpen(true))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update pricing, shipping dimensions, and images."
                : "Add a new product to your catalog."}
            </DialogDescription>
          </DialogHeader>
          <ProductForm product={editing} onSaved={onSaved} onCancel={closeForm} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.title}?</DialogTitle>
            <DialogDescription>
              This will permanently remove the product from your store and delete its photos from ImageKit. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletePending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletePending}>
              {deletePending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {deletePending ? "Deleting..." : "Delete product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
