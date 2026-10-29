/**
 * Bachatnix Email Templates
 * Responsive, clean HTML templates with inline styles for high email client compatibility.
 */

export type OrderEmailData = {
  ref: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  paymentMethod: "COD" | "UPI";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  total: number;
  subtotal: number;
  codCharge: number;
  items: {
    title: string;
    qty: number;
    price: number;
  }[];
  awb?: string | null;
  courierName?: string | null;
  trackingUrl?: string | null;
  appUrl?: string;
};

const formatINR = (val: number) => `₹${val.toLocaleString("en-IN")}`;

// ─── Base Layout ─────────────────────────────────────────────────────────────
function baseLayout({
  title,
  previewText,
  content,
  appUrl = "http://localhost:3000",
}: {
  title: string;
  previewText: string;
  content: string;
  appUrl?: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    a { color: #059669; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f4f6f8;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0px; overflow: hidden;">${previewText}</div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Header / Brand -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; text-align: center;">
              <a href="${appUrl}" style="text-decoration: none;">
                <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Bachat<span style="color: #fcc618;">nix</span></span>
              </a>
              <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px;">Smart Savings &middot; Fast Delivery</div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 28px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">Need help with your order? Reply to this email or visit <a href="${appUrl}/orders" style="color: #fcc618; font-weight: 600;">My Orders</a></p>
              <p style="margin: 0; color: #94a3b8;">&copy; ${new Date().getFullYear()} Bachatnix &middot; Alwar, Rajasthan 301001</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── 1. Order Placed Template ────────────────────────────────────────────────
export function renderOrderPlacedEmail(data: OrderEmailData): { subject: string; html: string; text: string } {
  const isCod = data.paymentMethod === "COD";
  const appUrl = data.appUrl || "http://localhost:3000";

  const itemsHtml = data.items
    .map(
      (it) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
        <div style="font-weight: 600; font-size: 14px; color: #0f172a;">${it.title}</div>
        <div style="font-size: 12px; color: #64748b;">Qty: ${it.qty}</div>
      </td>
      <td align="right" style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; font-size: 14px; color: #0f172a;">
        ${formatINR(it.price * it.qty)}
      </td>
    </tr>`
    )
    .join("");

  const content = `
    <!-- Hero Status Banner -->
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: #d1fae5; color: #059669; font-size: 28px; margin-bottom: 12px;">✓</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a;">Order Placed Successfully!</h1>
      <p style="margin: 6px 0 0 0; color: #64748b; font-size: 14px;">Hi ${data.name}, thank you for your order.</p>
    </div>

    <!-- Order Meta Box -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td>
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Order Reference</div>
            <div style="font-size: 16px; font-weight: 700; color: #0f172a; font-family: monospace;">${data.ref}</div>
          </td>
          <td align="right">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Payment Method</div>
            <div style="font-size: 13px; font-weight: 600; color: ${isCod ? "#b45309" : "#059669"};">
              ${isCod ? "Cash on Delivery (Pending)" : "UPI &middot; Paid"}
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Items List -->
    <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Order Summary</h3>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      ${itemsHtml}
    </table>

    <!-- Pricing Breakdown -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
      <tr>
        <td style="padding: 4px 0;">Subtotal</td>
        <td align="right" style="padding: 4px 0; color: #0f172a; font-weight: 500;">${formatINR(data.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Shipping</td>
        <td align="right" style="padding: 4px 0; color: #059669; font-weight: 600;">FREE</td>
      </tr>
      ${
        isCod && data.codCharge > 0
          ? `<tr>
        <td style="padding: 4px 0;">COD Handling Fee</td>
        <td align="right" style="padding: 4px 0; color: #0f172a; font-weight: 500;">${formatINR(data.codCharge)}</td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding: 10px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0;">Total Amount</td>
        <td align="right" style="padding: 10px 0 0 0; font-size: 18px; font-weight: 800; color: #0f172a; border-top: 1px solid #e2e8f0;">${formatINR(data.total)}</td>
      </tr>
    </table>

    <!-- Delivery Address -->
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 28px; font-size: 13px; color: #334155;">
      <div style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">Delivery Address</div>
      <div>${data.name} &middot; ${data.phone}</div>
      <div>${data.address}, ${data.city}, ${data.state} - ${data.pincode}</div>
    </div>

    <!-- Action Button -->
    <div style="text-align: center;">
      <a href="${appUrl}/orders" style="display: inline-block; background-color: #fcc618; color: #0f172a; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">Track Order Status</a>
    </div>
  `;

  return {
    subject: `Order Confirmed: ${data.ref} - Bachatnix`,
    text: `Hi ${data.name},\n\nThank you for your order on Bachatnix!\nOrder Reference: ${data.ref}\nPayment: ${data.paymentMethod === "COD" ? "Cash on Delivery" : "UPI (Paid)"}\nTotal Amount: ${formatINR(data.total)}\nDelivery Address: ${data.address}, ${data.city}, ${data.state} - ${data.pincode}\n\nTrack your order anytime at: ${appUrl}/orders\n\nThank you for choosing Bachatnix!`,
    html: baseLayout({
      title: `Order Placed - ${data.ref}`,
      previewText: `Thank you for your order! Your reference is ${data.ref}. Total: ${formatINR(data.total)}.`,
      content,
      appUrl,
    }),
  };
}

// ─── 2. Order Shipped / Dispatched Template ──────────────────────────────────
export function renderOrderShippedEmail(data: OrderEmailData): { subject: string; html: string; text: string } {
  const appUrl = data.appUrl || "http://localhost:3000";
  const trackingUrl =
    data.trackingUrl ||
    (data.awb ? `https://ship.nimbuspost.com/shipping/tracking/${data.awb}` : `${appUrl}/orders`);

  const content = `
    <!-- Hero Status Banner -->
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: #e0e7ff; color: #4338ca; font-size: 26px; margin-bottom: 12px;">🚚</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a;">Your Order is On the Way!</h1>
      <p style="margin: 6px 0 0 0; color: #64748b; font-size: 14px;">Order <strong>${data.ref}</strong> has been handed over to our courier partner.</p>
    </div>

    <!-- Courier Tracking Card -->
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Courier Partner</div>
      <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 2px 0 12px 0;">${data.courierName || "Express Courier"}</div>

      ${
        data.awb
          ? `
      <div style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Tracking / AWB Number</div>
      <div style="font-size: 18px; font-weight: 700; color: #2563eb; font-family: monospace; letter-spacing: 1px; margin-top: 2px;">${data.awb}</div>
      `
          : ""
      }
    </div>

    <!-- Instructions / Delivery Notice -->
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #1e40af;">
      <strong>Delivery Notice:</strong> The courier delivery partner will contact you at <strong>${data.phone}</strong> before arrival.
      ${
        data.paymentMethod === "COD"
          ? `<br><span style="color: #b45309; font-weight: 600;">Please keep ${formatINR(data.total)} cash ready at the time of delivery.</span>`
          : "<br><span style=\"color: #059669; font-weight: 600;\">This is a prepaid order &mdash; no payment required at delivery.</span>"
      }
    </div>

    <!-- Action Buttons -->
    <div style="text-align: center; margin-top: 28px;">
      <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-right: 8px;">Track Shipment Live &rarr;</a>
    </div>
  `;

  return {
    subject: `Order Shipped! 🚚 Track ${data.ref} (${data.courierName || "Courier"}) - Bachatnix`,
    text: `Hi ${data.name},\n\nYour Bachatnix order ${data.ref} has been handed over to our courier partner (${data.courierName || "Courier"}).\nAWB Tracking Number: ${data.awb || "In transit"}\n\nTrack your shipment live at: ${trackingUrl}\n\nThank you for choosing Bachatnix!`,
    html: baseLayout({
      title: `Order Shipped - ${data.ref}`,
      previewText: `Your Bachatnix order ${data.ref} is on the way via ${data.courierName || "Courier"}! Track live.`,
      content,
      appUrl,
    }),
  };
}

// ─── 3. Order Delivered Template ─────────────────────────────────────────────
export function renderOrderDeliveredEmail(data: OrderEmailData): { subject: string; html: string; text: string } {
  const appUrl = data.appUrl || "http://localhost:3000";

  const content = `
    <!-- Hero Status Banner -->
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; border-radius: 50%; background-color: #dcfce7; color: #15803d; font-size: 32px; margin-bottom: 12px;">🎉</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a;">Your Order Has Been Delivered!</h1>
      <p style="margin: 6px 0 0 0; color: #64748b; font-size: 14px;">Order <strong>${data.ref}</strong> has been successfully delivered to you.</p>
    </div>

    <!-- Success Message Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">We hope you love your purchase! Thank you for choosing <strong>Bachatnix</strong>.</p>
      <div style="font-size: 12px; color: #64748b;">Delivered to: ${data.name}, ${data.city}</div>
    </div>

    <!-- Review / Explore More -->
    <div style="text-align: center; margin-top: 24px;">
      <a href="${appUrl}/products" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">Shop More on Bachatnix &rarr;</a>
    </div>
  `;

  return {
    subject: `Delivered! 🎉 Your Bachatnix Order ${data.ref} has arrived`,
    text: `Hi ${data.name},\n\nGreat news! Your Bachatnix order ${data.ref} has been delivered successfully.\n\nWe hope you love your purchase! Thank you for choosing Bachatnix.\nVisit our store anytime: ${appUrl}/products`,
    html: baseLayout({
      title: `Order Delivered - ${data.ref}`,
      previewText: `Your order ${data.ref} was delivered successfully. Thank you for shopping with Bachatnix!`,
      content,
      appUrl,
    }),
  };
}

