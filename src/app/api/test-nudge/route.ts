import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: "Opportunity Radar <onboarding@resend.dev>",
      to: [email],
      subject: "Test Nudge: Upcoming Deadline!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px;">
          <h2 style="color: #0F172A; margin-top: 0;">🔔 Test Nudge!</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.5;">
            Hello from Opportunity Radar! This is a test nudge to confirm that your email digest notifications are working correctly.
          </p>
          <div style="background-color: #F8FAFC; border-left: 4px solid #10B981; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <strong style="color: #0F172A;">Sample Opportunity:</strong>
            <br />
            Google Software Engineering Internship (closes in 3 days)
          </div>
          <p style="color: #64748B; font-size: 14px;">
            You can configure when you receive these digests in your app settings.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any   /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    console.error("Error sending test nudge:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
