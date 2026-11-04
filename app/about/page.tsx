import Link from "next/link";

export const metadata = {
  title: "About Us | Bachatnix",
  description: "Learn about Bachatnix — affordable fashion for every Indian.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-10">
        <Link href="/" className="text-sm text-black/50 hover:text-black transition-colors">← Back to Home</Link>
      </div>

      <h1 className="font-heading text-4xl sm:text-5xl font-black text-black uppercase tracking-tight mb-4">
        About Us
      </h1>
      <p className="text-sm text-black/50 mb-12">Our Story</p>

      <div className="space-y-8 text-black/70 text-base leading-relaxed">
        <p>
          <strong className="text-black">Bachatnix</strong> is an Indian fashion brand on a mission to make trendy, high-quality clothing accessible to everyone — from college students to working professionals, from women to men.
        </p>
        <p>
          We believe fashion shouldn&apos;t be a luxury. That&apos;s why every piece in our collection is carefully sourced, quality-checked, and priced to fit Indian budgets — without ever compromising on style.
        </p>
        <p>
          From casual streetwear to office formals, from gym wear to festive outfits — Bachatnix has something for every occasion and every mood.
        </p>
        <p>
          Our journey started with a simple idea: <em>bachat</em> (savings) + fashion. We wanted Indians to feel confident in what they wear, without worrying about burning a hole in their pocket.
        </p>

        <div className="border-t border-black/10 pt-8">
          <h2 className="text-xl font-bold text-black mb-4">Why Bachatnix?</h2>
          <ul className="space-y-3">
            {[
              "✅ Affordable prices without compromising quality",
              "✅ Pan-India delivery — from metro cities to tier-3 towns",
              "✅ Quick replacement for damaged or defective items",
              "✅ Cash on Delivery available",
              "✅ Exclusive deals and promo codes for new customers",
            ].map((point) => (
              <li key={point} className="text-black/70">{point}</li>
            ))}
          </ul>
        </div>

        <div className="border-t border-black/10 pt-8">
          <h2 className="text-xl font-bold text-black mb-3">Get in Touch</h2>
          <p>
            Have questions or feedback? We&apos;d love to hear from you at{" "}
            <a href="mailto:bachatnix@gmail.com" className="text-black font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity">
              bachatnix@gmail.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

