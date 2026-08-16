import { compare } from "bcryptjs";
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
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    
    // Find user
    const user = memoryDb.users.find((u: any) => u.email === email);
    console.log(`Login: Looking for user with email ${email}, found: ${!!user}`);

    if (!user) {
      return Response.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await compare(password, user.password);
    console.log(`Login: Password valid: ${isValidPassword}`);
    
    if (!isValidPassword) {
      return Response.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (user.emailVerified === 0) {
      return Response.json(
        { error: "Please verify your email before signing in" },
        { status: 403 }
      );
    }

    // Create session token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Save session
    const newSession = {
      id: Date.now(),
      userId: user.id,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    memoryDb.sessions.push(newSession);
    console.log(`Login: Session created. Total sessions: ${memoryDb.sessions.length}`);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    return Response.json({
      user: userWithoutPassword,
      token,
      message: "Login successful"
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
