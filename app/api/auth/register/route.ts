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
    const { email, password, name, role = "patient" } = await request.json();

    if (!email || !password || !name) {
      return Response.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = memoryDb.users.find((u: any) => u.email === email);
    if (existingUser) {
      return Response.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password (skip for development mock)
    const hashedPassword = typeof (globalThis as any).DB !== "undefined" 
      ? await hash(password, 10) 
      : password;

    // Create user
    const newUser = {
      id: Date.now(),
      email,
      password: hashedPassword,
      name,
      role,
      createdAt: new Date().toISOString(),
    };
    memoryDb.users.push(newUser);
    console.log(`User registered: ${email}, total users: ${memoryDb.users.length}`);

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    
    return Response.json(
      { user: userWithoutPassword, message: "Registration successful" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return Response.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
