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
    const { token } = await request.json();

    if (!token) {
      return Response.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }
    
    // Delete session
    memoryDb.sessions = memoryDb.sessions.filter((s: any) => s.token !== token);
    console.log(`Logout: Session removed. Total sessions: ${memoryDb.sessions.length}`);

    return Response.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return Response.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
