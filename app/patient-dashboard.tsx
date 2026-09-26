"use client";
import { useState, useEffect } from "react";
import { useAuth } from "./auth-context";

type Appointment = {
  id: number;
  nurseName: string;
  serviceName: string;
  date: string;
  time: string;
  mode: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  nurseId: number;
  totalAmount: number;
  paymentStatus: string;
  patientNotes?: string;
  location?: string;
};

export default function PatientDashboard({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [videoCallRoom, setVideoCallRoom] = useState<string | null>(null);
  const [isInVideoCall, setIsInVideoCall] = useState(false);

  useEffect(() => {
    async function fetchAppointments() {
      if (!user) return;
      try {
        const response = await fetch(`/api/appointments?userId=${user.id}`);
        const data = await response.json();
        if (data.appointments) {
          setAppointments(data.appointments);
        }
      } catch (error) {
        console.error("Error fetching appointments:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAppointments();
  }, [user]);

  const filteredAppointments = appointments.filter(appointment => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming") {
      return ["pending", "confirmed", "in_progress"].includes(appointment.status);
    }
    if (activeTab === "past") {
      return ["completed", "cancelled"].includes(appointment.status);
    }
    return true;
  });

  const upcomingAppointments = appointments.filter(a => 
    ["pending", "confirmed", "in_progress"].includes(a.status)
  );

  const pastAppointments = appointments.filter(a => 
    ["completed", "cancelled"].includes(a.status)
  );

  const handleJoinVideoCall = (appointment: Appointment) => {
    // In production, this would integrate with a real video call service like Twilio, Agora, or WebRTC
    setVideoCallRoom(appointment.id.toString());
    setIsInVideoCall(true);
  };

  const handleEndVideoCall = () => {
    setVideoCallRoom(null);
    setIsInVideoCall(false);
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" })
      });

      if (response.ok) {
        setAppointments(appointments.map(a => 
          a.id === appointmentId ? { ...a, status: "cancelled" } : a
        ));
        alert("Appointment cancelled successfully");
      } else {
        alert("Failed to cancel appointment");
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert("Failed to cancel appointment");
    }
  };

  const handleRescheduleAppointment = (appointment: Appointment) => {
    // For demo purposes, just show an alert
    alert("Reschedule feature coming soon. Please contact support to reschedule.");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "#10b981";
      case "in_progress": return "#3b82f6";
      case "completed": return "#22c55e";
      case "cancelled": return "#ef4444";
      default: return "#f59e0b";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed": return "✓";
      case "in_progress": return "◷";
      case "completed": return "✓";
      case "cancelled": return "✕";
      default: return "◷";
    }
  };

  if (isInVideoCall) {
    return (
      <div className="video-call-container" style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#000",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          color: "#fff",
          textAlign: "center",
          padding: "20px"
        }}>
          <h2 style={{ marginBottom: "16px" }}>Video Call in Progress</h2>
          <p style={{ marginBottom: "24px", opacity: 0.8 }}>
            Room: {videoCallRoom}
          </p>
          <button 
            onClick={handleEndVideoCall}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer"
            }}
          >
            End Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="patient-dashboard shell">
      <div className="dash-head">
        <div>
          <span className="kicker">PATIENT DASHBOARD</span>
          <h1>Welcome back, {user?.name || "Patient"}</h1>
          <p>Manage your healthcare appointments and consultations.</p>
        </div>
        <button className="outline" onClick={onBack}>Back to booking</button>
      </div>

      <div className="dash-stats">
        <div><i>▦</i><span><small>Upcoming appointments</small><strong>{upcomingAppointments.length}</strong></span></div>
        <div><i>✓</i><span><small>Completed</small><strong>{pastAppointments.length}</strong></span></div>
        <div><i>💬</i><span><small>Video consultations</small><strong>{appointments.filter(a => a.mode === "Online").length}</strong></span></div>
        <div><i>◷</i><span><small>Next appointment</small><strong>{upcomingAppointments[0]?.time || "--:--"}</strong></span></div>
      </div>

      <div className="dash-grid">
        <div className="appointments-section">
          <div className="section-header">
            <h2>My Appointments</h2>
            <div className="tab-buttons">
              <button 
                className={activeTab === "upcoming" ? "active" : ""}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming
              </button>
              <button 
                className={activeTab === "past" ? "active" : ""}
                onClick={() => setActiveTab("past")}
              >
                Past
              </button>
              <button 
                className={activeTab === "all" ? "active" : ""}
                onClick={() => setActiveTab("all")}
              >
                All
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              Loading appointments...
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "60px 20px", 
              background: "var(--mint)", 
              borderRadius: "12px",
              color: "var(--text-muted)"
            }}>
              <span style={{ fontSize: "48px", marginBottom: "16px", display: "block" }}>📅</span>
              <p>No appointments found</p>
              <button 
                className="primary" 
                onClick={onBack}
                style={{ marginTop: "16px" }}
              >
                Book an appointment
              </button>
            </div>
          ) : (
            <div className="appointments-list">
              {filteredAppointments.map((appointment) => (
                <div 
                  key={appointment.id}
                  className="appointment-card"
                  onClick={() => setSelectedAppointment(appointment)}
                  style={{
                    background: "#fff",
                    border: "1px solid var(--line)",
                    borderRadius: "16px",
                    padding: "24px",
                    marginBottom: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", marginBottom: "8px", color: "var(--ink)" }}>
                        {appointment.serviceName}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ 
                          background: appointment.mode === "Online" ? "var(--mint)" : "var(--accent-light)",
                          color: appointment.mode === "Online" ? "var(--green)" : "var(--accent)",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}>
                          {appointment.mode}
                        </span>
                        <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                          • {appointment.nurseName}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                        📅 {appointment.date} at {appointment.time}
                      </div>
                    </div>
                    <span 
                      className="status-badge"
                      style={{
                        background: `${getStatusColor(appointment.status)}20`,
                        color: getStatusColor(appointment.status),
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <span>{getStatusIcon(appointment.status)}</span>
                      {appointment.status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </div>

                  {appointment.mode === "Online" && appointment.status === "confirmed" && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleJoinVideoCall(appointment); }}
                      style={{
                        width: "100%",
                        background: "linear-gradient(135deg, var(--green) 0%, #075f55 100%)",
                        color: "#fff",
                        border: "none",
                        padding: "12px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        marginBottom: "16px"
                      }}
                    >
                      <span>📹</span> Join Video Call
                    </button>
                  )}

                  {appointment.location && (
                    <div style={{
                      background: "var(--mint)",
                      padding: "12px",
                      borderRadius: "8px",
                      marginBottom: "16px",
                      fontSize: "14px",
                      color: "var(--ink)"
                    }}>
                      📍 {appointment.location}
                    </div>
                  )}

                  {appointment.patientNotes && (
                    <div style={{
                      background: "var(--surface)",
                      padding: "12px",
                      borderRadius: "8px",
                      marginBottom: "16px",
                      fontSize: "14px",
                      color: "var(--text-muted)"
                    }}>
                      <strong style={{ color: "var(--ink)", marginBottom: "4px", display: "block" }}>
                        Notes:
                      </strong>
                      {appointment.patientNotes}
                    </div>
                  )}

                  <div style={{
                    display: "flex",
                    gap: "12px",
                    borderTop: "1px solid var(--line)",
                    paddingTop: "16px"
                  }}>
                    {appointment.status === "pending" && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCancelAppointment(appointment.id); }}
                          style={{
                            flex: 1,
                            background: "#fff",
                            border: "1px solid #ef4444",
                            color: "#ef4444",
                            padding: "10px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRescheduleAppointment(appointment); }}
                          style={{
                            flex: 1,
                            background: "#fff",
                            border: "1px solid var(--line)",
                            color: "var(--ink)",
                            padding: "10px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          Reschedule
                        </button>
                      </>
                    )}
                    {appointment.status === "confirmed" && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRescheduleAppointment(appointment); }}
                        style={{
                          flex: 1,
                          background: "#fff",
                          border: "1px solid var(--line)",
                          color: "var(--ink)",
                          padding: "10px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          "fontWeight": "600",
                          cursor: "pointer"
                        }}
                      >
                        Reschedule
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedAppointment(appointment); }}
                      style={{
                        flex: 1,
                        background: "var(--accent)",
                        color: "#fff",
                        border: "none",
                        padding: "10px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="quick-actions">
          <h2>Quick Actions</h2>
          <button onClick={onBack}>
            <i>＋</i>
            <span>
              <b>Book Appointment</b>
              <small>Schedule a new healthcare service</small>
            </span>
          </button>
          <button onClick={() => alert("Payment history coming soon")}>
            <i>₦</i>
            <span>
              <b>Payment History</b>
              <small>View past transactions</small>
            </span>
          </button>
          <button onClick={() => alert("Medical records coming soon")}>
            <i>📋</i>
            <span>
              <b>Medical Records</b>
              <small>Access your health documents</small>
            </span>
          </button>
          <button onClick={() => alert("Settings coming soon")}>
            <i>⚙</i>
            <span>
              <b>Settings</b>
              <small>Account preferences</small>
            </span>
          </button>
        </aside>
      </div>

      {selectedAppointment && (
        <div className="modal-backdrop" onClick={() => setSelectedAppointment(null)}>
          <div className="modal appointment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="kicker">APPOINTMENT DETAILS</span>
                <h2>{selectedAppointment.serviceName}</h2>
              </div>
              <button onClick={() => setSelectedAppointment(null)}>×</button>
            </div>
            <div className="form-body">
              <div className="booking-summary-box">
                <div className="summary-header">
                  <div className="summary-icon">📋</div>
                  <div>
                    <h3>Booking Summary</h3>
                    <p>#{selectedAppointment.id}</p>
                  </div>
                  <span className={`status-badge ${selectedAppointment.status.toLowerCase()}`}>
                    {selectedAppointment.status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
                <div className="summary-grid">
                  <div className="summary-item">
                    <small>Nurse</small>
                    <strong>{selectedAppointment.nurseName}</strong>
                  </div>
                  <div className="summary-item">
                    <small>Date & Time</small>
                    <strong>{selectedAppointment.date} at {selectedAppointment.time}</strong>
                  </div>
                  <div className="summary-item">
                    <small>Service</small>
                    <strong>{selectedAppointment.serviceName}</strong>
                  </div>
                  <div className="summary-item">
                    <small>Mode</small>
                    <strong>{selectedAppointment.mode}</strong>
                  </div>
                  <div className="summary-item total">
                    <small>Total Amount</small>
                    <strong>₦{selectedAppointment.totalAmount?.toLocaleString()}</strong>
                  </div>
                </div>
                {selectedAppointment.patientNotes && (
                  <div className="notes-section">
                    <small>Additional Notes</small>
                    <p>{selectedAppointment.patientNotes}</p>
                  </div>
                )}
                {selectedAppointment.location && (
                  <div className="location-section">
                    <small>Location</small>
                    <p>{selectedAppointment.location}</p>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button className="primary wide" onClick={() => setSelectedAppointment(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
