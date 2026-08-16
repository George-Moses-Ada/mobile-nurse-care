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
    const { email, code } = await request.json();

    if (!email || !code) {
      return Response.json(
        { error: "Email and verification code are required" },
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

    // Check if already verified
    if (user.emailVerified === 1) {
      return Response.json(
        { message: "Email already verified" },
        { status: 200 }
      );
    }

    // Check verification code
    if (!user.verificationCode || user.verificationCode !== code) {
      return Response.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Check if code expired
    if (user.verificationCodeExpiresAt && new Date(user.verificationCodeExpiresAt) < new Date()) {
      return Response.json(
        { error: "Verification code expired" },
        { status: 400 }
      );
    }

    // Mark email as verified
    user.emailVerified = 1;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;

    console.log(`Email verified for ${email}`);
    
    return Response.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email error:", error);
    return Response.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}
