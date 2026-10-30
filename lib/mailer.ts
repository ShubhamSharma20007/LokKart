import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import {
  renderOrderPlacedEmail,
  renderOrderShippedEmail,
  renderOrderDeliveredEmail,
  type OrderEmailData,
} from "@/lib/email-templates";

// Create reusable transporter using Gmail SMTP
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  if (!user || !pass) {
    console.warn("[Mailer] GMAIL_USER or GMAIL_APP_PASSWORD is not set in environment.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
    host: "smtp.gmail.com",
    port: 465,
    secure: true,

  });
}

/**
 * Helper to fetch order with items and user data for emailing.
 */
async function getOrderEmailData(orderIdentifier: string): Promise<OrderEmailData | null> {
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: orderIdentifier }, { ref: orderIdentifier }],
    },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
      items: {
        select: {
          title: true,
          qty: true,
          price: true,
        },
      },
    },
  });

  if (!order || !order.user?.email) {
    return null;
  }

  return {
    ref: order.ref,
    name: order.name || order.user.name || "Customer",
    email: order.user.email,
    phone: order.phone,
    address: order.address,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: order.total,
    subtotal: order.subtotal,
    codCharge: order.codCharge,
    items: order.items,
    awb: order.awb,
    courierName: order.courierName,
    trackingUrl: order.trackingUrl,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };
}

/**
 * 1. Send Order Placed Email (COD placed or UPI paid)
 */
export async function sendOrderPlacedNotification(orderIdentifier: string): Promise<boolean> {
  try {
    const transporter = getTransporter();
    if (!transporter) return false;

    const data = await getOrderEmailData(orderIdentifier);
    if (!data) {
      console.warn(`[Mailer] Order ${orderIdentifier} not found or missing user email.`);
      return false;
    }

    const { subject, html, text } = renderOrderPlacedEmail(data);

    const fromAddress = `"Bachatnix Orders" <${process.env.GMAIL_USER}>`;
    const adminEmail = process.env.GMAIL_USER;

    await transporter.sendMail({
      from: fromAddress,
      to: data.email,
      ...(adminEmail && adminEmail !== data.email ? { bcc: adminEmail } : {}),
      subject,
      text,
      html,
    });

    console.log(`[Mailer] Order Placed email sent to ${data.email} for ${data.ref}`);
    return true;
  } catch (err) {
    console.error(`[Mailer] Failed to send Order Placed email for ${orderIdentifier}:`, err);
    return false;
  }
}

/**
 * 2. Send Order Shipped / Dispatched Email
 */
export async function sendOrderShippedNotification(orderIdentifier: string): Promise<boolean> {
  try {
    const transporter = getTransporter();
    if (!transporter) return false;

    const data = await getOrderEmailData(orderIdentifier);
    if (!data) {
      console.warn(`[Mailer] Order ${orderIdentifier} not found or missing user email.`);
      return false;
    }

    const { subject, html, text } = renderOrderShippedEmail(data);

    const fromAddress = `"Bachatnix Orders" <${process.env.GMAIL_USER}>`;
    const adminEmail = process.env.GMAIL_USER;

    await transporter.sendMail({
      from: fromAddress,
      to: data.email,
      ...(adminEmail && adminEmail !== data.email ? { bcc: adminEmail } : {}),
      subject,
      text,
      html,
    });

    console.log(`[Mailer] Order Shipped email sent to ${data.email} for ${data.ref}`);
    return true;
  } catch (err) {
    console.error(`[Mailer] Failed to send Order Shipped email for ${orderIdentifier}:`, err);
    return false;
  }
}

/**
 * 3. Send Order Delivered Email
 */
export async function sendOrderDeliveredNotification(orderIdentifier: string): Promise<boolean> {
  try {
    const transporter = getTransporter();
    if (!transporter) return false;

    const data = await getOrderEmailData(orderIdentifier);
    if (!data) {
      console.warn(`[Mailer] Order ${orderIdentifier} not found or missing user email.`);
      return false;
    }

    const { subject, html, text } = renderOrderDeliveredEmail(data);

    const fromAddress = `"Bachatnix Orders" <${process.env.GMAIL_USER}>`;
    const adminEmail = process.env.GMAIL_USER;

    await transporter.sendMail({
      from: fromAddress,
      to: data.email,
      ...(adminEmail && adminEmail !== data.email ? { bcc: adminEmail } : {}),
      subject,
      text,
      html,
    });

    console.log(`[Mailer] Order Delivered email sent to ${data.email} for ${data.ref}`);
    return true;
  } catch (err) {
    console.error(`[Mailer] Failed to send Order Delivered email for ${orderIdentifier}:`, err);
    return false;
  }
}

