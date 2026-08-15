import { getDb } from "../../../../db";
import { sessions } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return Response.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    
    // Delete session
    await db
      .delete(sessions)
      .where(eq(sessions.token, token));

    return Response.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return Response.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
