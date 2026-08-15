import { getDb } from "../../../../db";
import { users, sessions } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return Response.json(
        { error: "Token is required" },
        { status: 401 }
      );
    }

    const db = getDb();
    
    // Find session
    const sessionResult = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    if (sessionResult.length === 0) {
      return Response.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const session = sessionResult[0];

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      await db.delete(sessions).where(eq(sessions.token, token));
      return Response.json(
        { error: "Session expired" },
        { status: 401 }
      );
    }

    // Get user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (userResult.length === 0) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userResult[0];

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    return Response.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Auth check error:", error);
    return Response.json(
      { error: "Authentication check failed" },
      { status: 500 }
    );
  }
}
