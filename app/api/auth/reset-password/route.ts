import { hash } from "bcryptjs";

// Simple in-memory database for development
if (!(globalThis as any).__memoryDb) {
  (globalThis as any).__memoryDb = {
    users: [] as any[],
    sessions: [] as any[],
  };
}
const memoryDb = (globalThis as any).__memoryDb;

export async function POST(request: Request) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return Response.json(
        { error: "Email, code, and new password are required" },
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

    // Check if reset code matches and is not expired
    if (user.verificationCode !== code) {
      return Response.json(
        { error: "Invalid reset code" },
        { status: 400 }
      );
    }

    const expiresAt = new Date(user.verificationCodeExpiresAt);
    if (expiresAt < new Date()) {
      return Response.json(
        { error: "Reset code has expired" },
        { status: 400 }
      );
    }

    // Hash password (skip for development mock)
    const hashedPassword = typeof (globalThis as any).DB !== "undefined" 
      ? await hash(newPassword, 10) 
      : newPassword;

    // Update user password
    user.password = hashedPassword;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;

    console.log(`Password reset for ${email}`);

    return Response.json({ 
      message: "Password reset successfully" 
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return Response.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
