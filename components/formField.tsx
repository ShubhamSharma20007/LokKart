import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

export function Field({
  label, name, error, hint, className, children,
}: {
  label: string; name: string; error?: string; hint?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending} className="h-10 bg-primary px-5 text-sm">
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? "Please wait..." : children}
    </Button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

export function SuccessCard({
  title, body, reference, actions,
}: {
  title: string; body: string; reference?: string; actions: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div role="status" className="rounded-xl border bg-card p-8 text-center shadow-sm">
      <CheckCircle2 className="mx-auto size-12 text-primary" aria-hidden />
      <h2 className="font-heading mt-4 text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">{body}</p>
      {reference && (
        <p className="mt-4 inline-block rounded-md bg-muted px-3 py-1.5 font-mono text-sm">Reference {reference}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className={cn(buttonVariants({ variant: a.primary ? "default" : "outline", size: "lg" }), "h-10 px-4")}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}