// Simple in-memory database for development
if (!(globalThis as any).__memoryDb) {
  (globalThis as any).__memoryDb = {
    users: [] as any[],
    sessions: [] as any[],
    services: [] as any[],
    appointments: [] as any[],
    availability: [] as any[],
  };
  console.log("Initialized memory database");
}
const memoryDb = (globalThis as any).__memoryDb;

// Ensure appointments array exists
if (!memoryDb.appointments) {
  memoryDb.appointments = [];
  console.log("Initialized appointments array");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received appointment request:", body);
    
    const { userId, nurseId, serviceId, serviceName, date, time, mode, total, status, patientName, patientPhone, patientAddress, patientNotes, uploadedFiles } = body;

    if (!userId || !serviceId || !date || !time || !mode || !total) {
      console.log("Missing required fields:", { userId, serviceId, date, time, mode, total });
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create appointment with safe parsing
    const newAppointment = {
      id: Date.now(),
      userId: typeof userId === 'number' ? userId : parseInt(userId) || 0,
      nurseId: nurseId ? (typeof nurseId === 'number' ? nurseId : parseInt(nurseId)) : 1,
      serviceId: typeof serviceId === 'number' ? serviceId : parseInt(serviceId) || 0,
      serviceName: serviceName || "Service",
      date,
      time,
      mode,
      status: status || "pending",
      totalAmount: typeof total === 'number' ? total : parseInt(total) || 0,
      paymentStatus: "paid",
      patientName: patientName || "",
      patientPhone: patientPhone || "",
      patientAddress: patientAddress || "",
      patientNotes: patientNotes || "",
      uploadedFiles: uploadedFiles || [],
      consultationReport: "",
      createdAt: new Date().toISOString(),
    };
    
    console.log("Creating appointment:", newAppointment);
    
    if (!memoryDb.appointments) {
      memoryDb.appointments = [];
    }
    
    memoryDb.appointments.push(newAppointment);
    console.log(`Appointment created. Total appointments: ${memoryDb.appointments.length}`);

    return Response.json(
      { appointment: newAppointment, message: "Appointment created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating appointment:", error);
    return Response.json(
      { error: "Failed to create appointment: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const nurseId = searchParams.get("nurseId");

    let appointments = memoryDb.appointments || [];

    if (userId) {
      appointments = appointments.filter((a: any) => a.userId === parseInt(userId));
    }

    if (nurseId) {
      // Filter appointments for nurse
      appointments = appointments.filter((a: any) => a.nurseId === parseInt(nurseId));
    }

    return Response.json({ appointments });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return Response.json(
      { error: "Failed to fetch appointments: " + (error as Error).message },
      { status: 500 }
    );
  }
}
