import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions | Bachatnix",
  description: "Read Bachatnix's Terms & Conditions for using our website and placing orders.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-10">
        <Link href="/" className="text-sm text-black/50 hover:text-black transition-colors">← Back to Home</Link>
      </div>

      <h1 className="font-heading text-4xl sm:text-5xl font-black text-black uppercase tracking-tight mb-4">
        Terms &amp; Conditions
      </h1>
      <p className="text-sm text-black/50 mb-12">Last updated: November 2026</p>

      <div className="space-y-10 text-black/70 text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-black mb-3">1. Acceptance of Terms</h2>
          <p>By accessing and using the Bachatnix website and placing orders, you agree to be bound by these Terms &amp; Conditions. If you do not agree, please discontinue use of our services.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">2. Products &amp; Pricing</h2>
          <p>All product prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes. We reserve the right to change prices at any time without prior notice. Product images are for illustrative purposes; actual product colour may vary slightly due to screen settings.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">3. Orders &amp; Payments</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Orders are confirmed only after successful payment processing.</li>
            <li>We accept UPI, Credit/Debit Cards, Net Banking, and Cash on Delivery (COD).</li>
            <li>COD orders may attract a nominal handling fee.</li>
            <li>Bachatnix reserves the right to cancel any order suspected of fraud.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">4. Shipping &amp; Delivery</h2>
          <p>We ship across India. Standard delivery takes 3–7 business days depending on your location. Delivery timelines may vary during peak seasons or due to courier delays beyond our control.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">5. Return &amp; Replacement Policy</h2>
          <p>Currently, we do not accept returns or issue refunds. Replacement is only provided if you receive a damaged, defective, or incorrect product, provided it is reported to our support team within 48 hours of delivery with proof.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">6. Promo Codes</h2>
          <p>Promotional codes (e.g., WELCOME20) are single-use per customer and cannot be combined with other offers. Bachatnix reserves the right to withdraw or modify promotional offers at any time.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">7. Intellectual Property</h2>
          <p>All content on the Bachatnix website — including logos, images, text, and design — is the property of Bachatnix and may not be reproduced or used without written permission.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">8. Contact</h2>
          <p>
            For any queries, reach us at{" "}
            <a href="mailto:bachatnix@gmail.com" className="text-black font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity">
              bachatnix@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}

