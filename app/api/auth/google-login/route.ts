import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory database for development
if (!(globalThis as any).__memoryDb) {
  (globalThis as any).__memoryDb = {
    users: [] as any[],
    sessions: [] as any[],
    services: [] as any[],
    appointments: [] as any[],
    availability: [] as any[],
  };
}
const memoryDb = (globalThis as any).__memoryDb;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, google_id, picture } = body;

    console.log("Google login request:", { email, name, google_id });

    if (!email || !google_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user exists by email or google_id
    let user = memoryDb.users.find((u: any) => u.email === email || u.google_id === google_id);

    if (user) {
      // Update existing user with Google info
      if (!user.google_id) {
        user.google_id = google_id;
      }
      if (!user.picture && picture) {
        user.picture = picture;
      }
      if (!user.name && name) {
        user.name = name;
      }
    } else {
      // Create new user
      user = {
        id: Date.now(),
        email,
        name: name || email.split('@')[0],
        google_id,
        picture,
        role: "patient",
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };
      memoryDb.users.push(user);
    }

    // Generate a simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        picture: user.picture,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    return NextResponse.json(
      { error: "Failed to process Google login" },
      { status: 500 }
    );
  }
}
