import { NextRequest } from 'next/server';

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

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { status, consultationReport } = body;

    if (!id) {
      return Response.json({ error: "Appointment ID required" }, { status: 400 });
    }

    const appointment = memoryDb.appointments?.find((a: any) => a.id === parseInt(id));
    if (!appointment) {
      return Response.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (status) {
      appointment.status = status;
    }

    if (consultationReport !== undefined) {
      appointment.consultationReport = consultationReport;
    }

    console.log(`Appointment ${id} updated to status: ${status}, consultation: ${consultationReport ? 'provided' : 'not provided'}`);

    return Response.json({ appointment });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return Response.json(
      { error: "Failed to update appointment: " + (error as Error).message },
      { status: 500 }
    );
  }
}
