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

// Initialize default services if empty
if (!memoryDb.services || memoryDb.services.length === 0) {
  memoryDb.services = [
    { id: 1, name: "General consultation", description: "Professional health assessment, advice and care guidance.", duration: "30 mins", price: 12000, icon: "✦", modes: JSON.stringify(["Online", "Home visit"]), createdAt: new Date().toISOString() },
    { id: 2, name: "Home nursing care", description: "Skilled nursing support delivered in the comfort of your home.", duration: "60 mins", price: 25000, icon: "⌂", modes: JSON.stringify(["Home visit"]), createdAt: new Date().toISOString() },
    { id: 3, name: "Injection or medication", description: "Safe administration of prescribed injections and medicines.", duration: "30 mins", price: 15000, icon: "+", modes: JSON.stringify(["Home visit"]), createdAt: new Date().toISOString() },
    { id: 4, name: "Wound dressing", description: "Professional wound cleaning, dressing and recovery monitoring.", duration: "45 mins", price: 20000, icon: "✚", modes: JSON.stringify(["Home visit"]), createdAt: new Date().toISOString() },
    { id: 5, name: "Elderly care", description: "Compassionate check-ins, vital signs and everyday care support.", duration: "2 hours", price: 35000, icon: "♡", modes: JSON.stringify(["Home visit", "Online"]), createdAt: new Date().toISOString() },
    { id: 6, name: "Postnatal care", description: "Personal support for mother and baby after childbirth.", duration: "90 mins", price: 30000, icon: "◡", modes: JSON.stringify(["Home visit", "Online"]), createdAt: new Date().toISOString() },
  ];
  console.log("Services initialized:", memoryDb.services.length);
}

export async function GET() {
  try {
    console.log("Fetching services, current count:", memoryDb.services?.length || 0);
    
    // Return services with parsed modes
    const services = (memoryDb.services || []).map((s: any) => ({
      ...s,
      modes: JSON.parse(s.modes || "[]"),
    }));
    
    return Response.json({ services });
  } catch (error) {
    console.error("Error fetching services:", error);
    return Response.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}
