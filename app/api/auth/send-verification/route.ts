import { randomBytes } from "crypto";
import { Resend } from "resend";

// Simple in-memory database for development
if (!(globalThis as any).__memoryDb) {
  (globalThis as any).__memoryDb = {
    users: [] as any[],
    sessions: [] as any[],
  };
}
const memoryDb = (globalThis as any).__memoryDb;

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    // Find user
    const user = memoryDb.users.find((u: any) => u.email === email);

    if (!user) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Update user with verification code
    user.verificationCode = verificationCode;
    user.verificationCodeExpiresAt = expiresAt;

    console.log(`Verification code for ${email}: ${verificationCode}`);

    // Send email using Resend
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: "Mobile Nurse Care <onboarding@resend.dev>",
          to: email,
          subject: "Verify your email address",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0a7768;">Verify your email address</h2>
              <p>Thank you for signing up for Mobile Nurse Care. Please use the following verification code to verify your email address:</p>
              <div style="background: #eaf7f2; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #0a7768; letter-spacing: 4px;">${verificationCode}</span>
              </div>
              <p>This code will expire in 15 minutes.</p>
              <p>If you didn't request this verification code, please ignore this email.</p>
              <p>Best regards,<br>Mobile Nurse Care Team</p>
            </div>
          `,
        });
        console.log(`Email sent to ${email}`);
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // Continue even if email fails - user can still use the code if they have it
      }
    }
    
    return Response.json({ 
      message: "Verification code sent to your email",
      // Only return code in development if no API key is set
      ...(process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY && { code: verificationCode })
    });
  } catch (error) {
    console.error("Send verification error:", error);
    return Response.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
