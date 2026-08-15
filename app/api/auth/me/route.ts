// Simple in-memory database for development
if (!(globalThis as any).__memoryDb) {
  (globalThis as any).__memoryDb = {
    users: [] as any[],
    sessions: [] as any[],
  };
}
const memoryDb = (globalThis as any).__memoryDb;

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return Response.json(
        { error: "Token is required" },
        { status: 401 }
      );
    }

    // Find session
    const session = memoryDb.sessions.find((s: any) => s.token === token);
    console.log(`Auth check: Looking for session with token, found: ${!!session}`);

    if (!session) {
      return Response.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      memoryDb.sessions = memoryDb.sessions.filter((s: any) => s.token !== token);
      return Response.json(
        { error: "Session expired" },
        { status: 401 }
      );
    }

    // Get user
    const user = memoryDb.users.find((u: any) => u.id === session.userId);
    console.log(`Auth check: Looking for user with id ${session.userId}, found: ${!!user}`);

    if (!user) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

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
