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

// Initialize Resend only if API key is available
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

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
      // Don't reveal if user exists or not for security
      return Response.json({ 
        message: "If an account exists with this email, a password reset code has been sent" 
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Update user with reset code
    user.verificationCode = resetCode;
    user.verificationCodeExpiresAt = expiresAt;

    console.log(`Password reset code for ${email}: ${resetCode}`);

    // Send email using Resend if available
    if (resend) {
      try {
        await resend.emails.send({
          from: "Mobile Nurse Care <onboarding@resend.dev>",
          to: email,
          subject: "Reset your password",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0a7768;">Reset your password</h2>
              <p>We received a request to reset your password for your Mobile Nurse Care account. Please use the following verification code to reset your password:</p>
              <div style="background: #eaf7f2; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #0a7768; letter-spacing: 4px;">${resetCode}</span>
              </div>
              <p>This code will expire in 15 minutes.</p>
              <p>If you didn't request this password reset, please ignore this email.</p>
              <p>Best regards,<br>Mobile Nurse Care Team</p>
            </div>
          `,
        });
        console.log(`Password reset email sent to ${email}`);
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // Continue even if email fails
      }
    }

    return Response.json({ 
      message: "If an account exists with this email, a password reset code has been sent"
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return Response.json(
      { error: "Failed to send password reset code" },
      { status: 500 }
    );
  }
}
