import { randomBytes } from "crypto";

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

    console.log(`Verification code sent to ${email}: ${verificationCode}`);
    
    // In production, you would send an email here
    // For now, we'll return the code in the response for development
    return Response.json({ 
      message: "Verification code sent",
      code: verificationCode // Remove this in production
    });
  } catch (error) {
    console.error("Send verification error:", error);
    return Response.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
