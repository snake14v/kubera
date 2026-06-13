import { NextResponse } from "next/server";
import { Resend } from "resend";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: unknown };

    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const key = process.env.RESEND_API_KEY;
    const to = process.env.WAITLIST_TO;
    const from = process.env.WAITLIST_FROM || "Orbéan Waitlist <onboarding@resend.dev>";

    // Not configured yet — accept gracefully so the UX works in dev/preview.
    if (!key || !to) {
      console.warn(
        "[waitlist] RESEND_API_KEY / WAITLIST_TO not set — signup not emailed:",
        email
      );
      return NextResponse.json({ ok: true, note: "captured (email delivery not configured)" });
    }

    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to,
      subject: "New Orbéan waitlist signup",
      text: `New waitlist signup: ${email}\nReceived: ${new Date().toISOString()}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[waitlist] error", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
