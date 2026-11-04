import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Bachatnix",
  description: "Read Bachatnix's Privacy Policy to understand how we collect, use, and protect your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-10">
        <Link href="/" className="text-sm text-black/50 hover:text-black transition-colors">← Back to Home</Link>
      </div>

      <h1 className="font-heading text-4xl sm:text-5xl font-black text-black uppercase tracking-tight mb-4">
        Privacy Policy
      </h1>
      <p className="text-sm text-black/50 mb-12">Last updated: November 2026</p>

      <div className="space-y-10 text-black/70 text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-black mb-3">1. Information We Collect</h2>
          <p>When you create an account or place an order on Bachatnix, we collect personal information such as your name, email address, phone number, shipping address, and payment details. We may also collect browsing data, device information, and cookies to improve your experience.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>To process and fulfil your orders</li>
            <li>To send order confirmation and shipping updates via email/SMS</li>
            <li>To improve our website, products, and services</li>
            <li>To send promotional offers (only with your consent)</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">3. Sharing of Information</h2>
          <p>We do not sell or rent your personal data to third parties. We share your information only with trusted partners who help us operate our business — such as payment processors (Cashfree), logistics providers (eKart, Shiprocket), and email/SMS services — strictly for order fulfilment purposes.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">4. Data Security</h2>
          <p>We implement industry-standard SSL encryption and secure data storage practices to protect your personal information. Payment details are processed via PCI-DSS compliant payment gateways and are never stored on our servers.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">5. Cookies</h2>
          <p>Bachatnix uses cookies to remember your cart, preferences, and session. You can disable cookies in your browser settings, though some features may not work correctly without them.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">6. Your Rights</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Access and review the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Opt out of marketing communications at any time</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-3">7. Contact Us</h2>
          <p>
            For any privacy-related queries, write to us at{" "}
            <a href="mailto:bachatnix@gmail.com" className="text-black font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity">
              bachatnix@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}

