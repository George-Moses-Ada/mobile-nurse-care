import { getDb } from "../../../../db";
import { users, sessions } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { hash, compare } from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    
    // Find user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      return Response.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = userResult[0];

    // Verify password
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      return Response.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create session token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Save session
    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt,
    });

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
