import { NextResponse } from "next/server";
import { Resend } from "resend";
import { BRAND } from "@/lib/brand";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  try {
    const { name, email, message } = (await req.json()) as {
      name?: unknown;
      email?: unknown;
      message?: unknown;
    };

    if (
      typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !EMAIL_RE.test(email) ||
      typeof message !== "string" || !message.trim()
    ) {
      return NextResponse.json(
        { error: "Please provide your name, a valid email, and a message." },
        { status: 400 }
      );
    }

    const key = process.env.RESEND_API_KEY;
    const to = process.env.WAITLIST_TO;
    const from = process.env.WAITLIST_FROM || `${BRAND.business.name} <onboarding@resend.dev>`;

    if (!key || !to) {
      console.warn("[contact] not configured — message not emailed:", { name, email });
      return NextResponse.json({ ok: true, note: "received (email delivery not configured)" });
    }

    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to,
      reply_to: email,
      subject: `${BRAND.business.name} enquiry from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}\n\nReceived: ${new Date().toISOString()}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
