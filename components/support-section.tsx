import Link from "next/link";
import { Mail, Clock, ShieldCheck, Headphones, ArrowRight, PackageSearch } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SupportSection({ email }: { email?: string }) {
  const supportEmail = email || "bachatnix@gmail.com";

  return (
    <section className="border-t bg-muted/30 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12 lg:gap-12">
            
            {/* Left Column: Heading & Description */}
            <div className="flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  <Headphones className="size-3.5" />
                  24/7 Customer Helpdesk
                </div>
                <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
                  We&apos;re here to help you.
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed sm:text-base">
                  Have a question about an order, delivery status, or product details?
                  Our friendly support team is always ready to assist you.
                </p>
              </div>

              {/* Guarantees */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 rounded-xl border bg-background p-3 text-xs">
                  <Clock className="size-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">Quick response within <strong>24 hours</strong></span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border bg-background p-3 text-xs">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-muted-foreground">100% Buyer Protection &amp; Support</span>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Cards */}
            <div className="flex flex-col justify-center gap-4">
              {/* Primary Email Card */}
              <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-background to-muted/50 p-6 shadow-xs">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <Mail className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Email Support
                    </p>
                    <a
                      href={`mailto:${supportEmail}?subject=Support%20Inquiry%20-%20Bachatnix`}
                      className="block truncate font-heading text-lg font-bold text-foreground hover:text-primary transition-colors sm:text-xl"
                    >
                      {supportEmail}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      Reply to your order confirmation or mail us directly anytime.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${supportEmail}?subject=Support%20Inquiry%20-%20Bachatnix`}
                    className={cn(buttonVariants({ size: "sm" }), "h-9 gap-1.5 px-4 font-semibold")}
                  >
                    <Mail className="size-3.5" />
                    Write to us
                  </a>
                  <Link
                    href="/orders"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 gap-1.5 px-4 text-xs font-medium")}
                  >
                    <PackageSearch className="size-3.5" />
                    Track an Order
                    <ArrowRight className="size-3 opacity-60" />
                  </Link>
                </div>
              </div>

              {/* Office / Operational Info */}
              <p className="text-center text-xs text-muted-foreground md:text-left">
                Operating Hours: <strong>Mon &ndash; Sat: 9:00 AM &ndash; 7:00 PM IST</strong> &middot; Closed on Public Holidays
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

