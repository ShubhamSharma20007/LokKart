// scripts/calc-shipping-buffer.ts
import { prisma } from "@/lib/prisma";
import { getCodEstimate } from "@/lib/shipping";

const APPLY = process.argv.includes("--apply");
const MAX_BUFFER_RATIO = 0.3; // buffer base price ke 30% se zyada ho to review

// w = approximate % of your orders. The code normalizes, so the sum doesn't need to be exactly 100.
const SAMPLE = [
  // North
  { city: "Delhi", pin: "110001", w: 9 },
  { city: "Gurgaon (HR)", pin: "122001", w: 4 },
  { city: "Jaipur (RJ)", pin: "302001", w: 4 },
  { city: "Lucknow (UP)", pin: "226001", w: 5 },
  { city: "Noida (UP)", pin: "201301", w: 3 },
  { city: "Ludhiana (PB)", pin: "141001", w: 3 },
  { city: "Chandigarh", pin: "160017", w: 1 },
  { city: "Shimla (HP)", pin: "171001", w: 1 },
  { city: "Jammu (J&K)", pin: "180001", w: 1 },
  { city: "Srinagar (J&K)", pin: "190001", w: 1 },
  { city: "Leh (Ladakh)", pin: "194101", w: 0.2 },
  { city: "Dehradun (UK)", pin: "248001", w: 1.5 },

  // West
  { city: "Ahmedabad (GJ)", pin: "380001", w: 6 },
  { city: "Mumbai (MH)", pin: "400001", w: 7 },
  { city: "Pune (MH)", pin: "411001", w: 4 },
  { city: "Nagpur (MH)", pin: "440001", w: 1.5 },
  { city: "Panaji (Goa)", pin: "403001", w: 0.7 },
  { city: "Silvassa (DNH)", pin: "396230", w: 0.3 },
  { city: "Daman", pin: "396210", w: 0.2 },

  // Central
  { city: "Bhopal (MP)", pin: "462001", w: 2 },
  { city: "Indore (MP)", pin: "452001", w: 2 },
  { city: "Raipur (CG)", pin: "492001", w: 1.5 },

  // East
  { city: "Patna (BR)", pin: "800001", w: 4 },
  { city: "Ranchi (JH)", pin: "834001", w: 2 },
  { city: "Kolkata (WB)", pin: "700001", w: 5 },
  { city: "Bhubaneswar (OD)", pin: "751001", w: 2 },

  // North-East
  { city: "Guwahati (AS)", pin: "781001", w: 2 },
  { city: "Itanagar (AR)", pin: "791111", w: 0.3 },
  { city: "Kohima (NL)", pin: "797001", w: 0.3 },
  { city: "Imphal (MN)", pin: "795001", w: 0.4 },
  { city: "Aizawl (MZ)", pin: "796001", w: 0.3 },
  { city: "Agartala (TR)", pin: "799001", w: 0.4 },
  { city: "Shillong (ML)", pin: "793001", w: 0.4 },
  { city: "Gangtok (SK)", pin: "737101", w: 0.3 },

  // South
  { city: "Hyderabad (TS)", pin: "500001", w: 5 },
  { city: "Bangalore (KA)", pin: "560001", w: 6 },
  { city: "Chennai (TN)", pin: "600001", w: 5 },
  { city: "Coimbatore (TN)", pin: "641001", w: 1.5 },
  { city: "Visakhapatnam (AP)", pin: "530001", w: 1.5 },
  { city: "Vijayawada (AP)", pin: "520001", w: 1.5 },
  { city: "Thiruvananthapuram (KL)", pin: "695001", w: 1 },
  { city: "Kochi (KL)", pin: "682001", w: 1.5 },
  { city: "Puducherry", pin: "605001", w: 0.5 },

  // Islands (very expensive, tiny share)
  { city: "Port Blair (A&N)", pin: "744101", w: 0.2 },
  { city: "Kavaratti (LD)", pin: "682555", w: 0.1 },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// async function main() {
//   const products = await prisma.product.findMany({
//     select: { id: true, title: true, price: true, weightG: true, lengthCm: true, widthCm: true, heightCm: true },
//   });

//   for (const p of products) {
//     let weighted = 0;
//     let usedWeight = 0;
//     let max = 0;
//     const skipped: string[] = [];

//     for (const s of SAMPLE) {
//       try {
//         const est = await getCodEstimate({
//           deliveryPincode: s.pin,
//           orderValueRupees: p.price,
//           items: [{ qty: 1, weightG: p.weightG, lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm }],
//         });
//         if (!est.serviceable) {
//           skipped.push(s.city);
//           continue;
//         }
//         weighted += est.actualShippingExpense * s.w;
//         usedWeight += s.w;
//         max = Math.max(max, est.actualShippingExpense);
//       } catch {
//         skipped.push(s.city);
//       }
//       await sleep(250); // avoid hammering NimbusPost
//     }

//     if (usedWeight === 0) {
//       console.log(`${p.title}: no serviceable pincodes, skipped`);
//       continue;
//     }

//     const avg = weighted / usedWeight; // renormalized, so skipped pincodes don't skew it
//     const buffer = Math.ceil((avg * 1.1) / 5) * 5; // 10% margin, round up to ₹5

//     console.log(
//       `${p.title}: avg ₹${avg.toFixed(0)} | worst ₹${max} | buffer ₹${buffer} | new price ₹${p.price + buffer}` +
//         (skipped.length ? ` | skipped: ${skipped.join(", ")}` : "")
//     );
//   }
// }

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true, title: true, price: true, mrp: true, basePrice: true,
      weightG: true, lengthCm: true, widthCm: true, heightCm: true,
    },
  });

  for (const p of products) {
    // basePrice 0 hai to purana price hi base hai. Isse buffer double nahi hoga.
    const base = p.basePrice > 0 ? p.basePrice : p.price;

    let weighted = 0, usedWeight = 0, max = 0;
    const skipped: string[] = [];

    for (const s of SAMPLE) {
      try {
        const est = await getCodEstimate({
          deliveryPincode: s.pin,
          orderValueRupees: base,
          items: [{ qty: 1, weightG: p.weightG, lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm }],
        });
        if (!est.serviceable) { skipped.push(s.city); continue; }
        weighted += est.actualShippingExpense * s.w;
        usedWeight += s.w;
        max = Math.max(max, est.actualShippingExpense);
      } catch {
        skipped.push(s.city);
      }
      await sleep(250);
    }

    if (usedWeight === 0) { console.log(`${p.title}: no serviceable pincodes, skipped`); continue; }

    const avg = weighted / usedWeight;
    const buffer = Math.ceil((avg * 1.1) / 5) * 5;
    let newPrice = base + buffer;
    const notes: string[] = [];

    if (newPrice >= p.mrp) {
      newPrice = p.mrp - 1; // admin form bhi price < MRP maangta hai
      notes.push(`MRP cap (MRP ₹${p.mrp})`);
    }
    if (buffer / base > MAX_BUFFER_RATIO) notes.push(`REVIEW: buffer ${Math.round((buffer / base) * 100)}% of price`);

    console.log(
      `${p.title}: base ₹${base} | avg ₹${avg.toFixed(0)} | worst ₹${max.toFixed(0)} | buffer ₹${buffer} | new ₹${newPrice}` +
        (notes.length ? ` | ${notes.join(", ")}` : "") +
        (skipped.length ? ` | skipped: ${skipped.join(", ")}` : ""),
    );

    const needsReview = notes.some((n) => n.startsWith("REVIEW"));
    if (APPLY) {
      await prisma.product.update({
        where: { id: p.id },
        data: { basePrice: base, shippingBuffer: newPrice - base, price: newPrice },
      });
    }
  }
}

main().finally(() => prisma.$disconnect());