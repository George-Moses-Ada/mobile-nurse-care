"use client";
import { useMemo, useState, useEffect } from "react";
import { useAuth } from "./auth-context";
import { AuthModal } from "./auth-modal";

type Service = { id: number; name: string; description: string; duration: string; price: number; icon: string; modes: string[] };
type Nurse = { id: number; name: string; rating: number; specialization: string; location: { lat: number; lng: number; address: string }; distance: number; profilePicture: string; verified: boolean };
const days = [{ day: "MON", date: "17" }, { day: "TUE", date: "18" }, { day: "WED", date: "19" }, { day: "THU", date: "20" }, { day: "FRI", date: "21" }, { day: "SAT", date: "22" }];
const times = ["9:00 AM", "10:30 AM", "12:00 PM", "2:00 PM", "3:30 PM", "5:00 PM"];

export default function Home() {
  const { user, logout } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [view, setView] = useState<"patient" | "dashboard">("patient");
  const [selected, setSelected] = useState<Service | null>(null);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("Home visit");
  const [day, setDay] = useState("17");
  const [time, setTime] = useState("10:30 AM");
  const [complete, setComplete] = useState(false);
  const [menu, setMenu] = useState(false);
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [patientNotes, setPatientNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [selectedNurse, setSelectedNurse] = useState<Nurse | null>(null);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [nurseFilter, setNurseFilter] = useState<{ rating: number; specialization: string; maxDistance: number }>({ rating: 0, specialization: "all", maxDistance: 20 });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [geocodingLocation, setGeocodingLocation] = useState(false);
  const [hoveredNurse, setHoveredNurse] = useState<number | null>(null);
  const total = useMemo(() => (selected?.price ?? 0) + (mode === "Home visit" ? 3000 : 0), [selected, mode]);

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch("/api/services");
        const data = await res.json();
        setServices(data.services || []);
      } catch (error) {
        console.error("Failed to load services:", error);
      }
    }
    loadServices();
  }, []);

  useEffect(() => {
    async function loadAppointments() {
      if (!user || user.role !== "nurse") return;
      try {
        const res = await fetch("/api/appointments?nurseId=" + user.id);
        const data = await res.json();
        setAppointments(data.appointments || []);
      } catch (error) {
        console.error("Failed to load appointments:", error);
      }
    }
    loadAppointments();
  }, [user]);

  useEffect(() => {
    if (selected) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [selected]);

  function book(service: Service = services[0]) {
    if (!user) {
      setAuthModal(true);
      return;
    }
    setSelected(service);
    setMode(service.modes[0]);
    setStep(1);
    setComplete(false);
    setLocation(null);
    setSelectedNurse(null);
    setLocationSearch("");
  }

  function getCurrentLocation() {
    if (typeof window === 'undefined') return;
    setLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Reverse geocode to get address
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocation({ lat: latitude, lng: longitude, address });
            setLocationSearch(address);
            loadNurses(latitude, longitude);
          } catch (error) {
            console.error("Failed to get address:", error);
            setLocation({ lat: latitude, lng: longitude, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
            setLocationSearch(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            loadNurses(latitude, longitude);
          }
          setLoadingLocation(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLoadingLocation(false);
          alert("Unable to get your location. Please search manually.");
        }
      );
    } else {
      setLoadingLocation(false);
      alert("Geolocation is not supported by your browser. Please search manually.");
    }
  }

  function handleLocationSearch(value: string) {
    setLocationSearch(value);
    if (value.length > 2) {
      // Use OpenStreetMap Nominatim API for real location suggestions
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=NG&limit=5`)
        .then(res => res.json())
        .then(data => {
          const suggestions = data.map((item: any) => item.display_name);
          setLocationSuggestions(suggestions);
        })
        .catch(error => {
          console.error("Failed to fetch location suggestions:", error);
          setLocationSuggestions([]);
        });
    } else {
      setLocationSuggestions([]);
    }
  }

  function selectLocation(address: string) {
    setLocationSearch(address);
    setLocationSuggestions([]);
    setGeocodingLocation(true);
    // Geocode the address to get lat/lng
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setLocation({ lat, lng, address });
          loadNurses(lat, lng);
        } else {
          // If no results, set location with approximate coordinates
          const lat = 6.5244 + (Math.random() - 0.5) * 0.1;
          const lng = 3.3792 + (Math.random() - 0.5) * 0.1;
          setLocation({ lat, lng, address });
          loadNurses(lat, lng);
        }
        setGeocodingLocation(false);
      })
      .catch(error => {
        console.error("Failed to geocode address:", error);
        // Fallback to approximate coordinates
        const lat = 6.5244 + (Math.random() - 0.5) * 0.1;
        const lng = 3.3792 + (Math.random() - 0.5) * 0.1;
        setLocation({ lat, lng, address });
        loadNurses(lat, lng);
        setGeocodingLocation(false);
      });
  }

  function loadNurses(userLat: number, userLng: number) {
    // Mock nurse data - in production this would come from an API
    const mockNurses: Nurse[] = [
      { id: 1, name: "Sarah Johnson", rating: 4.8, specialization: "General Nursing", location: { lat: userLat + 0.01, lng: userLng + 0.01, address: "Near your location" }, distance: 1.5, profilePicture: "👩🏾‍⚕️", verified: true },
      { id: 2, name: "Michael Adeyemi", rating: 4.9, specialization: "Elderly Care", location: { lat: userLat + 0.02, lng: userLng - 0.01, address: "2km away" }, distance: 2.3, profilePicture: "👨🏾‍⚕️", verified: true },
      { id: 3, name: "Grace Okafor", rating: 4.7, specialization: "Wound Care", location: { lat: userLat - 0.01, lng: userLng + 0.02, address: "3km away" }, distance: 3.1, profilePicture: "👩🏽‍⚕️", verified: true },
      { id: 4, name: "David Nnamdi", rating: 4.6, specialization: "Postnatal Care", location: { lat: userLat + 0.03, lng: userLng + 0.01, address: "5km away" }, distance: 5.2, profilePicture: "👨🏿‍⚕️", verified: false },
      { id: 5, name: "Fatima Ibrahim", rating: 4.9, specialization: "General Nursing", location: { lat: userLat - 0.02, lng: userLng - 0.02, address: "8km away" }, distance: 8.4, profilePicture: "👩🏻‍⚕️", verified: true },
      { id: 6, name: "Emeka Okonkwo", rating: 4.5, specialization: "Injection Services", location: { lat: userLat + 0.05, lng: userLng - 0.03, address: "12km away" }, distance: 12.1, profilePicture: "👨🏾‍⚕️", verified: true },
      { id: 7, name: "Amina Bello", rating: 4.8, specialization: "Elderly Care", location: { lat: userLat - 0.04, lng: userLng + 0.04, address: "15km away" }, distance: 15.3, profilePicture: "👩🏿‍⚕️", verified: true },
      { id: 8, name: "Chinedu Okafor", rating: 4.7, specialization: "General Nursing", location: { lat: userLat + 0.06, lng: userLng + 0.02, address: "18km away" }, distance: 18.7, profilePicture: "👨🏽‍⚕️", verified: false },
    ];
    setNurses(mockNurses);
  }

  function getFilteredNurses() {
    return nurses.filter(nurse => {
      const matchesRating = nurse.rating >= nurseFilter.rating;
      const matchesSpecialization = nurseFilter.specialization === "all" || nurse.specialization === nurseFilter.specialization;
      const matchesDistance = nurse.distance <= nurseFilter.maxDistance;
      // In production, this would check if the nurse has existing bookings at the selected date/time
      // For demo, we'll randomly mark some nurses as unavailable
      const isAvailable = Math.random() > 0.2; // 80% chance of being available
      return matchesRating && matchesSpecialization && matchesDistance && isAvailable;
    });
  }

  return (
    <main>
      <header className="nav-wrap">
        <nav className="nav shell">
          <button className="brand" onClick={() => setView("patient")}>
            <span className="brand-mark">+</span>
            <span>Mobile Nurse<span>Care</span></span>
          </button>
          <button className="menu-btn" onClick={() => setMenu(!menu)}>☰</button>
          <div className={`menu-backdrop ${menu ? "open" : ""}`} onClick={() => setMenu(false)}></div>
          <div className={`nav-links ${menu ? "open" : ""}`}>
            <button className={`menu-close ${menu ? "open" : ""}`} onClick={() => setMenu(false)}>×</button>
            <a href="#services" onClick={() => setMenu(false)}>Services</a>
            <a href="#how" onClick={() => setMenu(false)}>How it works</a>
            <a href="#about" onClick={() => setMenu(false)}>About me</a>
            {user ? (
              <>
                <button className="login" onClick={() => { logout(); setMenu(false); }}>Sign out</button>
                {user.role === "nurse" && (
                  <button className="login" onClick={() => { setView(view === "patient" ? "dashboard" : "patient"); setMenu(false); }}>
                    {view === "patient" ? "Nurse dashboard" : "Patient website"}
                  </button>
                )}
              </>
            ) : (
              <>
                <button className="login" onClick={() => { setAuthMode("login"); setAuthModal(true); setMenu(false); }}>Sign in</button>
                <button className="primary small" onClick={() => { setAuthMode("register"); setAuthModal(true); setMenu(false); }}>Sign up</button>
              </>
            )}
            {view === "patient" && user && <button className="primary small" onClick={() => { book(); setMenu(false); }}>Book appointment</button>}
          </div>
        </nav>
      </header>
      {view === "patient" ? (
        <>
          <section className="hero shell">
            <div className="hero-copy">
              <div className="eyebrow"><span>●</span> Trusted care, wherever you are</div>
              <h1>Quality nursing care, <em>on your schedule.</em></h1>
              <p>Book a qualified mobile nurse for compassionate care at home or a private online consultation. Simple, safe and built around you.</p>
              <div className="hero-actions">
                <button className="primary" onClick={() => book()}>Book a service <span>→</span></button>
                <a href="#services" className="text-link">Explore services ↓</a>
              </div>
              <div className="trust-row">
                <span>✓ Licensed nurse</span>
                <span>✓ Secure payments</span>
                <span>✓ Flexible scheduling</span>
              </div>
            </div>
            <div className="hero-art">
              <div className="blob" />
              <div className="nurse-card">
                <div className="nurse-avatar">👩🏾‍⚕️</div>
                <div><small>Your mobile nurse</small><strong>Care that comes to you</strong><span><b>●</b> Available today</span></div>
              </div>
              <div className="floating-card top"><i>♡</i><div><strong>98%</strong><small>Patient satisfaction</small></div></div>
              <div className="floating-card bottom"><i>✓</i><div><strong>Easy booking</strong><small>Pick a time in minutes</small></div></div>
            </div>
          </section>
          <section className="stats">
            <div className="shell stat-grid">
              <div><strong>6+</strong><span>Nursing services</span></div>
              <div><strong>2</strong><span>Ways to receive care</span></div>
              <div><strong>100%</strong><span>Private & confidential</span></div>
              <div><strong>₦</strong><span>Secure Paystack checkout</span></div>
            </div>
          </section>
          <section className="section shell" id="services">
            <div className="section-head">
              <div><span className="kicker">MY SERVICES</span><h2>The right care for every need</h2><p>Choose a service and select a time that works for you.</p></div>
              <button className="outline" onClick={() => book()}>View availability →</button>
            </div>
            <div className="service-grid">
              {services.map(s => (
                <article className="service-card" key={s.name}>
                  <div className="service-icon">{s.icon}</div>
                  <div className="badges">{s.modes.map(m => <span key={m}>{m}</span>)}</div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <div className="service-meta"><span>◷ {s.duration}</span><strong>From ₦{s.price.toLocaleString()}</strong></div>
                  <button onClick={() => book(s)}>Book this service <span>→</span></button>
                </article>
              ))}
            </div>
          </section>
          <section className="how" id="how">
            <div className="section shell">
              <span className="kicker">HOW IT WORKS</span>
              <h2>Care in three simple steps</h2>
              <div className="steps">
                <div><b>01</b><i>✚</i><h3>Choose your service</h3><p>Select the care you need and whether you prefer a home or online session.</p></div>
                <div><b>02</b><i>▦</i><h3>Pick a date & time</h3><p>See available appointment times and choose what fits your schedule.</p></div>
                <div><b>03</b><i>✓</i><h3>Pay & get confirmed</h3><p>Pay securely with Paystack and receive your booking confirmation instantly.</p></div>
              </div>
            </div>
          </section>
          <section className="about shell" id="about">
            <div className="about-card">
              <div><span className="kicker light">PERSONAL, PROFESSIONAL CARE</span><h2>A nurse who listens, wherever you need me.</h2><p>I provide respectful, confidential nursing care designed around your routine. Every appointment is handled with patience, clinical attention and clear communication.</p><button className="white-btn" onClick={() => book()}>Schedule your care →</button></div>
              <div className="availability"><small>THIS WEEK</small><strong>Appointments available</strong><div><span>●</span> Home visits</div><div><span>●</span> Online consultations</div><p>Mon – Sat · 9:00 AM – 6:00 PM</p></div>
            </div>
          </section>
        </>
      ) : (
        <Dashboard onBack={() => setView("patient")} />
      )}
      {view === "patient" && (
        <footer>
          <div className="shell footer">
            <div><div className="brand light-brand"><span className="brand-mark">+</span><span>Mobile Nurse<span>Care</span></span></div><p>Professional nursing care, at home or online.</p></div>
            <div><strong>Quick links</strong><a href="#services">Services</a><a href="#how">How it works</a><a href="#about">About me</a></div>
            <div><strong>Need help?</strong><a href="tel:+2348000000000">+234 800 000 0000</a><a href="mailto:hello@mobilenurse.care">hello@mobilenurse.care</a></div>
          </div>
          <div className="copyright shell">© 2026 Mobile Nurse Care. Your health information stays private.</div>
        </footer>
      )}
      <AuthModal isOpen={authModal} onClose={() => setAuthModal(false)} defaultMode={authMode} />
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div><span className="kicker">BOOK AN APPOINTMENT</span><h2>{complete ? "Booking confirmed" : step === 1 ? "Choose care details" : step === 2 ? "Select your location" : step === 3 ? "Select a time" : step === 4 ? "Choose a nurse" : step === 5 ? "Your details" : "Payment"}</h2></div>
              <button onClick={() => setSelected(null)}>×</button>
            </div>
            {!complete && <div className="progress"><span className={step >= 1 ? "active" : ""} /><span className={step >= 2 ? "active" : ""} /><span className={step >= 3 ? "active" : ""} /><span className={step >= 4 ? "active" : ""} /><span className={step >= 5 ? "active" : ""} /><span className={step >= 6 ? "active" : ""} /></div>}
            {complete ? (
              <div className="success">
                <div>✓</div>
                <h3>You're booked!</h3>
                <p>Your {mode.toLowerCase()} for <strong>{selected.name}</strong> is scheduled for August {day} at {time}.</p>
                <div className="confirm-box"><span>Payment</span><strong>₦{total.toLocaleString()} · Paid</strong></div>
                <button className="primary wide" onClick={() => setSelected(null)}>Done</button>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <div className="form-body">
                    <label>Selected service</label>
                    <div className="selected-service"><span className="service-icon">{selected.icon}</span><div><strong>{selected.name}</strong><small>{selected.duration} · ₦{selected.price.toLocaleString()}</small></div></div>
                    <label>How would you like to receive care?</label>
                    <div className="choice-row">{selected.modes.map(m => <button key={m} className={mode === m ? "selected" : ""} onClick={() => setMode(m)}><b>{m === "Online" ? "◉" : "⌂"}</b><span>{m}<small>{m === "Online" ? "Private video consultation" : "Nurse comes to your address"}</small></span></button>)}</div>
                    <button className="primary wide" onClick={() => setStep(2)}>Continue →</button>
                  </div>
                )}
                {step === 2 && (
                  <div className="form-body">
                    <label>Your location</label>
                    <button 
                      className="location-btn" 
                      onClick={getCurrentLocation}
                      disabled={loadingLocation}
                      style={{ 
                        width: "100%", 
                        padding: "16px", 
                        marginBottom: "16px", 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "12px",
                        border: "1px solid var(--line)",
                        borderRadius: "8px",
                        background: loadingLocation ? "var(--surface)" : "transparent",
                        cursor: loadingLocation ? "not-allowed" : "pointer"
                      }}
                    >
                      <span>📍</span>
                      <span>{loadingLocation ? "Getting your location..." : "Use my current location"}</span>
                    </button>
                    <label>Or search for your address</label>
                    <div style={{ position: "relative" }}>
                      <input 
                        placeholder="Enter your address or location..."
                        value={locationSearch}
                        onChange={(e) => handleLocationSearch(e.target.value)}
                        style={{ 
                          width: "100%", 
                          padding: "16px", 
                          marginBottom: "8px",
                          border: "1px solid var(--line)",
                          borderRadius: "8px"
                        }}
                      />
                      {locationSuggestions.length > 0 && (
                        <div style={{
                          position: "absolute",
                          bottom: "100%",
                          left: 0,
                          right: 0,
                          background: "#ffffff",
                          border: "1px solid var(--line)",
                          borderRadius: "8px",
                          marginBottom: "4px",
                          maxHeight: "200px",
                          overflowY: "auto",
                          zIndex: 10,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                        }}>
                          {locationSuggestions.map((suggestion, index) => (
                            <div 
                              key={index}
                              onClick={() => selectLocation(suggestion)}
                              style={{
                                padding: "12px 16px",
                                cursor: "pointer",
                                borderBottom: index < locationSuggestions.length - 1 ? "1px solid var(--line)" : "none",
                                background: "#ffffff"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-light)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {location && (
                      <div className="selected-location" style={{
                        padding: "12px",
                        background: "var(--accent-light)",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <span>✓</span>
                        <span>{location.address}</span>
                      </div>
                    )}
                    {geocodingLocation && (
                      <div style={{
                        padding: "12px",
                        background: "var(--surface)",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        textAlign: "center",
                        color: "var(--text-muted)"
                      }}>
                        Getting location coordinates...
                      </div>
                    )}
                    <button 
                      className="primary wide" 
                      onClick={() => {
                        if (!location) {
                          alert("Please select your location");
                          return;
                        }
                        setStep(3);
                      }}
                      disabled={!location || geocodingLocation}
                    >
                      {geocodingLocation ? "Getting location..." : "Continue →"}
                    </button>
                    <button className="text-link" onClick={() => setStep(1)} style={{ marginTop: "12px" }}>← Back to service</button>
                  </div>
                )}
                {step === 3 && (
                  <div className="form-body">
                    <label>Select date <small>August 2026</small></label>
                    <div className="date-row">{days.map(d => <button key={d.date} className={day === d.date ? "selected" : ""} onClick={() => setDay(d.date)}><small>{d.day}</small><strong>{d.date}</strong></button>)}</div>
                    <label>Available times</label>
                    <div className="time-grid">{times.map(t => <button key={t} className={time === t ? "selected" : ""} onClick={() => setTime(t)}>{t}</button>)}</div>
                    <button className="primary wide" onClick={() => setStep(4)}>Continue →</button>
                    <button className="text-link" onClick={() => setStep(2)} style={{ marginTop: "12px" }}>← Back to location</button>
                  </div>
                )}
                {step === 4 && (
                  <div className="form-body">    <label>Choose your nurse</label>
                    <div className="nurse-filters" style={{ marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <select 
                        value={nurseFilter.rating} 
                        onChange={(e) => setNurseFilter({ ...nurseFilter, rating: Number(e.target.value) })}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)", flex: 1, minWidth: "140px" }}
                      >
                        <option value={0}>All ratings</option>
                        <option value={4.5}>4.5+ stars</option>
                        <option value={4.7}>4.7+ stars</option>
                        <option value={4.9}>4.9+ stars</option>
                      </select>
                      <select 
                        value={nurseFilter.specialization} 
                        onChange={(e) => setNurseFilter({ ...nurseFilter, specialization: e.target.value })}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)", flex: 1, minWidth: "140px" }}
                      >
                        <option value="all">All specializations</option>
                        <option value="General Nursing">General Nursing</option>
                        <option value="Elderly Care">Elderly Care</option>
                        <option value="Wound Care">Wound Care</option>
                        <option value="Postnatal Care">Postnatal Care</option>
                        <option value="Injection Services">Injection Services</option>
                      </select>
                      <select 
                        value={nurseFilter.maxDistance} 
                        onChange={(e) => setNurseFilter({ ...nurseFilter, maxDistance: Number(e.target.value) })}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)", flex: 1, minWidth: "140px" }}
                      >
                        <option value={5}>Within 5km</option>
                        <option value={10}>Within 10km</option>
                        <option value={15}>Within 15km</option>
                        <option value={20}>Within 20km</option>
                      </select>
                    </div>
                    <div className="nurse-list" style={{ maxHeight: "400px", overflowY: "auto", marginBottom: "16px", paddingRight: "8px" }}>
                      {getFilteredNurses().length === 0 ? (
                        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>No nurses match your filters</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {getFilteredNurses().map(nurse => (
                            <div 
                              key={nurse.id}
                              onClick={() => setSelectedNurse(nurse)}
                              onMouseEnter={() => setHoveredNurse(nurse.id)}
                              onMouseLeave={() => setHoveredNurse(null)}
                              className={`nurse-card ${selectedNurse?.id === nurse.id ? 'selected' : ''}`}
                              style={{
                                padding: "16px",
                                borderRadius: "12px",
                                cursor: "pointer",
                                background: selectedNurse?.id === nurse.id ? "var(--accent-light)" : (hoveredNurse === nurse.id ? "var(--surface)" : "#ffffff"),
                                border: selectedNurse?.id === nurse.id ? "2px solid var(--accent)" : (hoveredNurse === nurse.id ? "2px solid var(--accent)" : "1px solid var(--line)"),
                                boxShadow: selectedNurse?.id === nurse.id ? "0 4px 12px rgba(0,0,0,0.15)" : (hoveredNurse === nurse.id ? "0 4px 12px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.08)"),
                                transform: selectedNurse?.id === nurse.id ? "translateY(-2px)" : (hoveredNurse === nurse.id ? "translateY(-1px)" : "translateY(0)"),
                                transition: "all 0.2s ease",
                                width: "100%"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                                <div style={{ 
                                  position: "relative",
                                  width: "50px",
                                  height: "50px",
                                  borderRadius: "50%",
                                  background: "var(--accent-light)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "28px",
                                  flexShrink: 0
                                }}>
                                  {nurse.profilePicture}
                                  {nurse.verified && (
                                    <div style={{
                                      position: "absolute",
                                      bottom: "-2px",
                                      right: "-2px",
                                      width: "18px",
                                      height: "18px",
                                      background: "#10b981",
                                      borderRadius: "50%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "11px",
                                      border: "2px solid #ffffff"
                                    }}>
                                      ✓
                                    </div>
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                    <strong style={{ fontSize: "15px" }}>{nurse.name}</strong>
                                    {nurse.verified && (
                                      <span style={{ 
                                        background: "#10b981", 
                                        color: "#ffffff", 
                                        fontSize: "9px", 
                                        padding: "2px 5px", 
                                        borderRadius: "4px",
                                        fontWeight: "600",
                                        flexShrink: 0
                                      }}>
                                        Verified
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                                    <span style={{ fontSize: "13px" }}>⭐ {nurse.rating}</span>
                                    <span style={{ color: "var(--text-muted)", fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>• {nurse.specialization}</span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center",
                                paddingTop: "10px",
                                borderTop: "1px solid var(--line)"
                              }}>
                                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                  📍 {nurse.distance}km away
                                </span>
                                <button style={{
                                  padding: "6px 12px",
                                  background: selectedNurse?.id === nurse.id ? "var(--accent)" : (hoveredNurse === nurse.id ? "var(--accent-light)" : "transparent"),
                                  color: selectedNurse?.id === nurse.id ? "#ffffff" : "var(--accent)",
                                  border: selectedNurse?.id === nurse.id ? "none" : "1px solid var(--accent)",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  flexShrink: 0
                                }}>
                                  {selectedNurse?.id === nurse.id ? "Selected" : "Select"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedNurse && (
                      <div className="selected-nurse" style={{
                        padding: "12px",
                        background: "var(--accent-light)",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <span>✓</span>
                        <span>Selected: {selectedNurse.name} ({selectedNurse.specialization})</span>
                      </div>
                    )}
                    <button 
                      className="primary wide" 
                      onClick={() => {
                        if (!selectedNurse) {
                          alert("Please select a nurse");
                          return;
                        }
                        setStep(5);
                      }}
                      disabled={!selectedNurse}
                    >
                      Continue →
                    </button>
                    <button className="text-link" onClick={() => setStep(3)} style={{ marginTop: "12px" }}>← Back to date & time</button>
                  </div>
                )}
                {step === 5 && (
                  <div className="form-body">
                    <label>Your details</label>
                    <div className="field-grid">
                      <div className="field-row">
                        <input placeholder="Full name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                        <input placeholder="Phone number" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} />
                      </div>
                      <input placeholder="Address" className="full-width" value={patientAddress} onChange={(e) => setPatientAddress(e.target.value)} />
                    </div>
                    <label>Additional notes (optional)</label>
                    <textarea 
                      placeholder="Any specific requirements or medical information..."
                      value={patientNotes}
                      onChange={(e) => setPatientNotes(e.target.value)}
                      className="field-grid"
                      style={{ width: "100%", padding: "16px", minHeight: "100px", marginBottom: "24px", fontFamily: "inherit", fontSize: "15px", border: "1px solid var(--line)", borderRadius: "8px", resize: "vertical" }}
                    />
                    <label>Upload documents (optional)</label>
                    <div className="file-upload-section">
                      <input 
                        type="file" 
                        id="file-upload"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setUploadedFiles(files);
                        }}
                        style={{ display: "none" }}
                      />
                      <label htmlFor="file-upload" className="file-upload-btn">
                        <span className="upload-icon">📎</span>
                        <div>
                          <b>Click to upload files</b>
                          <small>Images, PDFs, documents (max 10MB)</small>
                        </div>
                      </label>
                      {uploadedFiles.length > 0 && (
                        <div className="uploaded-files">
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="file-item">
                              <span className="file-icon">📄</span>
                              <span className="file-name">{file.name}</span>
                              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                              <button 
                                className="remove-file"
                                onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="summary">
                      <div><small>Service</small><strong>{selected.name}</strong><span>{selected.duration}</span></div>
                      <div><small>Date & time</small><strong>August {day}, {time}</strong><span>{mode}</span></div>
                      <div><small>Service price</small><strong>₦{selected.price.toLocaleString()}</strong><span>Base service cost</span></div>
                      {mode === "Home visit" && <div><small>Home visit fee</small><strong>₦3,000</strong><span>Additional travel fee</span></div>}
                      <div className="total-row"><small>Total amount</small><strong className="total-amount">₦{total.toLocaleString()}</strong><span>Including all fees</span></div>
                    </div>
                    <button className="primary wide" onClick={() => {
                      if (!patientName || !patientPhone) {
                        alert("Please fill in your name and phone number");
                        return;
                      }
                      setStep(6);
                    }}>Continue to Payment →</button>
                    <button className="text-link" onClick={() => setStep(4)} style={{ marginTop: "12px" }}>← Back to nurse selection</button>
                  </div>
                )}
                {step === 6 && (
                  <div className="form-body">
                    <label>Payment</label>
                    <div className="payment-info">
                      <div className="payment-amount">
                        <small>Total to pay</small>
                        <strong>₦{total.toLocaleString()}</strong>
                      </div>
                      <div className="payment-method">
                        <small>Payment method</small>
                        <div className="paystack-badge">
                          <span>💳</span>
                          <span>Paystack Secure Payment</span>
                        </div>
                      </div>
                    </div>
                    <button className="primary wide" onClick={async () => {
                      try {
                        console.log("User:", user);
                        console.log("Selected:", selected);
                        
                        if (!user) {
                          alert("Please log in to book an appointment");
                          setAuthModal(true);
                          setAuthMode("login");
                          return;
                        }
                        
                        const appointmentData = {
                          userId: user.id,
                          nurseId: selectedNurse?.id || 1,
                          nurseName: selectedNurse?.name || "Nurse",
                          serviceId: selected.id,
                          serviceName: selected.name,
                          date: `2026-08-${day}`,
                          time,
                          mode,
                          total,
                          status: "pending",
                          patientName,
                          patientPhone,
                          patientAddress,
                          patientNotes,
                          uploadedFiles: uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
                          location: location?.address || ""
                        };
                        
                        console.log("Sending appointment data:", appointmentData);
                        
                        const res = await fetch("/api/appointments", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(appointmentData)
                        });
                        
                        console.log("Response status:", res.status);
                        const data = await res.json();
                        console.log("Response data:", data);
                        
                        if (res.ok) {
                          setComplete(true);
                        } else {
                          console.error("Failed to create appointment:", data);
                          alert("Failed to create appointment: " + (data.error || "Unknown error"));
                        }
                      } catch (error) {
                        console.error("Failed to create appointment:", error);
                        alert("Failed to create appointment: " + error);
                      }
                    }}>Pay ₦{total.toLocaleString()}</button>
                    <button className="text-link" onClick={() => setStep(5)} style={{ marginTop: "12px" }}>← Back to details</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Dashboard({ onBack }: { onBack: () => void }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAction, setQuickAction] = useState<"add" | "availability" | "payments" | "settings" | "profile" | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewingFile, setViewingFile] = useState<any | null>(null);
  const [consultationText, setConsultationText] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    async function fetchAppointments() {
      try {
        // For demo purposes, fetch all appointments since we're using nurseId=1 hardcoded
        const response = await fetch(`/api/appointments`);
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
  }, [user?.id]);

  const completedCount = appointments.filter((a: any) => a.status === "completed").length;
  const totalEarnings = appointments.filter((a: any) => a.paymentStatus === "paid").reduce((sum: number, a: any) => sum + a.totalAmount, 0);
  const nextAppointment = appointments.find((a: any) => a.status === "confirmed");

  return (
    <section className="dashboard shell">
      <div className="dash-head">
        <div>
          <span className="kicker">NURSE DASHBOARD</span>
          <h1>Good morning, {user?.name || "Nurse"}</h1>
          <p>Here's what your care schedule looks like today.</p>
        </div>
        <button className="outline" onClick={onBack}>View patient website</button>
      </div>
      <div className="dash-stats">
        <div><i>▦</i><span><small>Today's bookings</small><strong>{appointments.length}</strong></span></div>
        <div><i>✓</i><span><small>Completed this week</small><strong>{completedCount}</strong></span></div>
        <div><i>₦</i><span><small>This month's earnings</small><strong>₦{totalEarnings.toLocaleString()}</strong></span></div>
        <div><i>◷</i><span><small>Next appointment</small><strong>{nextAppointment?.time || "--:--"}</strong></span></div>
      </div>
      <div className="dash-grid">
        <div className="schedule">
          <div className="card-head">
            <div><h2>Today's appointments</h2><p>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p></div>
            <button onClick={() => setShowCalendar(true)}>View calendar</button>
          </div>
          {loading ? (
            <p>Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <p>No appointments scheduled</p>
          ) : (
            appointments.map((a: any) => (
              <div className="appointment" key={a.id} onClick={() => setSelectedAppointment(a)} style={{ cursor: "pointer" }}>
                <strong>{a.time}</strong>
                <span className="avatar">PT</span>
                <div className="patient">
                  <b>{a.patientName || `Patient #${a.userId}`}</b>
                  <small>{a.serviceName} · {a.mode}</small>
                  {a.patientPhone && <small>📞 {a.patientPhone}</small>}
                  {a.patientAddress && <small>📍 {a.patientAddress}</small>}
                </div>
                <span className={`status ${a.status.toLowerCase()}`}>{a.status}</span>
                <button className="dots" onClick={(e) => { e.stopPropagation(); setSelectedAppointment(a); }}>•••</button>
              </div>
            ))
          )}
        </div>
        <aside className="quick">
          <h2>Quick actions</h2>
          <button onClick={() => setQuickAction("add")}><i>＋</i><span><b>Add appointment</b><small>Create a booking manually</small></span></button>
          <button onClick={() => setQuickAction("availability")}><i>▦</i><span><b>Manage availability</b><small>Set your working hours</small></span></button>
          <button onClick={() => setQuickAction("payments")}><i>₦</i><span><b>Payment history</b><small>View transactions</small></span></button>
          <button onClick={() => setQuickAction("profile")}><i>👤</i><span><b>Profile</b><small>Manage your profile</small></span></button>
          <button onClick={() => setQuickAction("settings")}><i>⚙</i><span><b>Settings</b><small>Account preferences</small></span></button>
        </aside>
        {quickAction && (
          <div className="modal-backdrop" onClick={() => setQuickAction(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div><span className="kicker">QUICK ACTION</span><h2>{quickAction === "add" ? "Add appointment" : quickAction === "availability" ? "Manage availability" : quickAction === "payments" ? "Payment history" : quickAction === "profile" ? "Profile" : "Settings"}</h2></div>
                <button onClick={() => setQuickAction(null)}>×</button>
              </div>
              <div className="form-body">
                {quickAction === "add" && (
                  <>
                    <label>Patient details</label>
                    <div className="field-grid">
                      <input placeholder="Patient name" />
                      <input placeholder="Patient phone" />
                    </div>
                    <label>Service</label>
                    <select className="field-grid input" style={{ width: "100%", padding: "16px", marginBottom: "24px" }}>
                      <option>General consultation</option>
                      <option>Home nursing care</option>
                      <option>Injection or medication</option>
                      <option>Wound dressing</option>
                      <option>Elderly care</option>
                      <option>Postnatal care</option>
                    </select>
                    <label>Date & time</label>
                    <div className="field-grid">
                      <input type="date" />
                      <input type="time" />
                    </div>
                    <button className="primary wide" onClick={() => { setQuickAction(null); alert("Appointment added!"); }}>Add appointment</button>
                  </>
                )}
                {quickAction === "availability" && (
                  <>
                    <label>Working hours</label>
                    <div className="field-grid">
                      <input placeholder="Start time (e.g., 9:00 AM)" defaultValue="9:00 AM" />
                      <input placeholder="End time (e.g., 6:00 PM)" defaultValue="6:00 PM" />
                    </div>
                    <label>Available days</label>
                    <div className="days-grid">
                      <label className="day-checkbox"><input type="checkbox" defaultChecked /><span>Monday</span></label>
                      <label className="day-checkbox"><input type="checkbox" defaultChecked /><span>Tuesday</span></label>
                      <label className="day-checkbox"><input type="checkbox" defaultChecked /><span>Wednesday</span></label>
                      <label className="day-checkbox"><input type="checkbox" defaultChecked /><span>Thursday</span></label>
                      <label className="day-checkbox"><input type="checkbox" defaultChecked /><span>Friday</span></label>
                      <label className="day-checkbox"><input type="checkbox" defaultChecked /><span>Saturday</span></label>
                      <label className="day-checkbox"><input type="checkbox" /><span>Sunday</span></label>
                    </div>
                    <button className="primary wide" onClick={() => { setQuickAction(null); alert("Availability updated!"); }}>Save availability</button>
                  </>
                )}
                {quickAction === "payments" && (
                  <>
                    <label>Payment history</label>
                    <div className="summary">
                      {appointments.filter((a: any) => a.paymentStatus === "paid").map((a: any) => (
                        <div key={a.id}>
                          <small>{a.date}</small>
                          <strong>₦{a.totalAmount?.toLocaleString()}</strong>
                          <span>{a.serviceName}</span>
                        </div>
                      ))}
                      {appointments.filter((a: any) => a.paymentStatus === "paid").length === 0 && <p>No payments yet</p>}
                    </div>
                    <button className="primary wide" onClick={() => setQuickAction(null)}>Close</button>
                  </>
                )}
                {quickAction === "settings" && (
                  <>
                    <label>Account settings</label>
                    <div className="field-grid">
                      <input placeholder="Display name" defaultValue={user?.name} />
                      <input placeholder="Email" defaultValue={user?.email} />
                    </div>
                    <label>Notification preferences</label>
                    <div className="settings-grid">
                      <label className="setting-item">
                        <input type="checkbox" defaultChecked />
                        <span><b>Email notifications</b><small>Receive booking confirmations and updates</small></span>
                      </label>
                      <label className="setting-item">
                        <input type="checkbox" defaultChecked />
                        <span><b>SMS notifications</b><small>Get text messages for urgent updates</small></span>
                      </label>
                      <label className="setting-item">
                        <input type="checkbox" />
                        <span><b>Calendar sync</b><small>Automatically add appointments to calendar</small></span>
                      </label>
                    </div>
                    <button className="primary wide" onClick={() => { setQuickAction(null); alert("Settings saved!"); }}>Save settings</button>
                  </>
                )}
                {quickAction === "profile" && (
                  <>
                    <div className="profile-container">
                      <div className="profile-section">
                        <div className="section-header">
                          <h3>Profile Overview</h3>
                          <button className="edit-btn">Edit</button>
                        </div>
                        <div className="profile-overview">
                          <div className="profile-avatar">
                            <span>👤</span>
                          </div>
                          <div className="profile-info">
                            <h4>{user?.name || "Nurse Name"}</h4>
                            <p>Registered Nurse</p>
                            <div className="rating">
                              <span>⭐⭐⭐⭐⭐</span>
                              <small>4.9 (127 reviews)</small>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="profile-section">
                        <div className="section-header">
                          <h3>Personal Information</h3>
                          <button className="edit-btn">Edit</button>
                        </div>
                        <div className="info-grid">
                          <div className="info-item">
                            <small>Full Name</small>
                            <strong>{user?.name || "Not provided"}</strong>
                          </div>
                          <div className="info-item">
                            <small>Email</small>
                            <strong>{user?.email || "Not provided"}</strong>
                          </div>
                          <div className="info-item">
                            <small>Phone</small>
                            <strong>+234 800 000 0000</strong>
                          </div>
                          <div className="info-item">
                            <small>Date of Birth</small>
                            <strong>January 15, 1990</strong>
                          </div>
                          <div className="info-item full-width">
                            <small>Address</small>
                            <strong>123 Medical Center Road, Lagos, Nigeria</strong>
                          </div>
                        </div>
                      </div>

                      <div className="profile-section">
                        <div className="section-header">
                          <h3>Professional Information</h3>
                          <button className="edit-btn">Edit</button>
                        </div>
                        <div className="info-grid">
                          <div className="info-item">
                            <small>Specialization</small>
                            <strong>Home Nursing Care</strong>
                          </div>
                          <div className="info-item">
                            <small>Years of Experience</small>
                            <strong>8 years</strong>
                          </div>
                          <div className="info-item">
                            <small>License Number</small>
                            <strong>RN-2024-12345</strong>
                          </div>
                          <div className="info-item">
                            <small>Education</small>
                            <strong>B.Sc. Nursing, University of Lagos</strong>
                          </div>
                        </div>
                      </div>

                      <div className="profile-section">
                        <div className="section-header">
                          <h3>Identity and License Verification</h3>
                          <button className="edit-btn">Edit</button>
                        </div>
                        <div className="verification-status">
                          <div className="verification-item verified">
                            <span className="status-icon">✓</span>
                            <div>
                              <strong>Identity Verification</strong>
                              <small>Verified on March 15, 2024</small>
                            </div>
                          </div>
                          <div className="verification-item verified">
                            <span className="status-icon">✓</span>
                            <div>
                              <strong>Nursing License</strong>
                              <small>Verified on March 15, 2024</small>
                            </div>
                          </div>
                          <div className="verification-item pending">
                            <span className="status-icon">◷</span>
                            <div>
                              <strong>Background Check</strong>
                              <small>Pending verification</small>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="profile-section">
                        <div className="section-header">
                          <h3>Services Offered</h3>
                          <button className="edit-btn">Edit</button>
                        </div>
                        <div className="services-list">
                          <div className="service-item">
                            <span className="service-icon">✦</span>
                            <strong>General consultation</strong>
                          </div>
                          <div className="service-item">
                            <span className="service-icon">✦</span>
                            <strong>Home nursing care</strong>
                          </div>
                          <div className="service-item">
                            <span className="service-icon">✦</span>
                            <strong>Injection or medication</strong>
                          </div>
                          <div className="service-item">
                            <span className="service-icon">✦</span>
                            <strong>Wound dressing</strong>
                          </div>
                          <div className="service-item">
                            <span className="service-icon">✦</span>
                            <strong>Elderly care</strong>
                          </div>
                          <div className="service-item">
                            <span className="service-icon">✦</span>
                            <strong>Postnatal care</strong>
                          </div>
                        </div>
                      </div>

                      <div className="profile-section">
                        <div className="section-header">
                          <h3>Service Pricing</h3>
                          <button className="edit-btn">Edit</button>
                        </div>
                        <div className="pricing-list">
                          <div className="pricing-item">
                            <strong>General consultation</strong>
                            <span>₦12,000</span>
                          </div>
                          <div className="pricing-item">
                            <strong>Home nursing care</strong>
                            <span>₦25,000</span>
                          </div>
                          <div className="pricing-item">
                            <strong>Injection or medication</strong>
                            <span>₦8,000</span>
                          </div>
                          <div className="pricing-item">
                            <strong>Wound dressing</strong>
                            <span>₦15,000</span>
                          </div>
                          <div className="pricing-item">
                            <strong>Elderly care</strong>
                            <span>₦30,000</span>
                          </div>
                          <div className="pricing-item">
                            <strong>Postnatal care</strong>
                            <span>₦35,000</span>
                          </div>
                        </div>
                      </div>

                      <div className="profile-section">
                        <div className="section-header">
                          <h3>Availability</h3>
                          <button className="edit-btn">Edit</button>
                        </div>
                        <div className="availability-info">
                          <div className="availability-item">
                            <strong>Working Hours</strong>
                            <span>9:00 AM - 6:00 PM</span>
                          </div>
                          <div className="availability-item">
                            <strong>Available Days</strong>
                            <span>Monday - Saturday</span>
                          </div>
                          <div className="availability-item">
                            <strong>Response Time</strong>
                            <span>Within 1 hour</span>
                          </div>
                        </div>
                      </div>

                      <div className="profile-section">
                        <div className="section-header">
                          <h3>Service Locations</h3>
                          <button className="edit-btn">Edit</button>
                        </div>
                        <div className="locations-list">
                          <div className="location-item">
                            <span className="location-icon">📍</span>
                            <strong>Lagos Mainland</strong>
                          </div>
                          <div className="location-item">
                            <span className="location-icon">📍</span>
                            <strong>Lagos Island</strong>
                          </div>
                          <div className="location-item">
                            <span className="location-icon">📍</span>
                            <strong>Ikeja</strong>
                          </div>
                        </div>
                      </div>

                      <div className="profile-section">
                        <div className="section-header">
                          <h3>Reviews</h3>
                          <button className="view-all-btn">View All</button>
                        </div>
                        <div className="reviews-list">
                          <div className="review-item">
                            <div className="review-header">
                              <strong>Sarah Johnson</strong>
                              <span className="review-rating">⭐⭐⭐⭐⭐</span>
                            </div>
                            <p>Excellent service! Very professional and caring nurse. Highly recommended.</p>
                            <small>2 days ago</small>
                          </div>
                          <div className="review-item">
                            <div className="review-header">
                              <strong>Emeka Okafor</strong>
                              <span className="review-rating">⭐⭐⭐⭐⭐</span>
                            </div>
                            <p>Great experience. The nurse was punctual and provided excellent care for my elderly mother.</p>
                            <small>1 week ago</small>
                          </div>
                        </div>
                      </div>

                      <div className="profile-section">
                        <div className="section-header">
                          <h3>Notifications</h3>
                          <button className="edit-btn">Edit</button>
                        </div>
                        <div className="settings-grid">
                          <label className="setting-item">
                            <input type="checkbox" defaultChecked />
                            <span><b>New booking notifications</b><small>Get notified when patients book services</small></span>
                          </label>
                          <label className="setting-item">
                            <input type="checkbox" defaultChecked />
                            <span><b>Message notifications</b><small>Receive messages from patients</small></span>
                          </label>
                          <label className="setting-item">
                            <input type="checkbox" defaultChecked />
                            <span><b>Payment notifications</b><small>Get alerts for payments received</small></span>
                          </label>
                          <label className="setting-item">
                            <input type="checkbox" />
                            <span><b>Promotional notifications</b><small>Receive updates and promotions</small></span>
                          </label>
                        </div>
                      </div>

                      <div className="profile-section">
                        <div className="section-header">
                          <h3>Account and Security</h3>
                          <button className="edit-btn">Edit</button>
                        </div>
                        <div className="security-info">
                          <div className="security-item">
                            <small>Email</small>
                            <strong>{user?.email || "Not provided"}</strong>
                            <button className="change-btn">Change</button>
                          </div>
                          <div className="security-item">
                            <small>Password</small>
                            <strong>••••••••</strong>
                            <button className="change-btn">Change</button>
                          </div>
                          <div className="security-item">
                            <small>Two-Factor Authentication</small>
                            <strong>Disabled</strong>
                            <button className="enable-btn">Enable</button>
                          </div>
                          <div className="security-item danger">
                            <small>Delete Account</small>
                            <button className="delete-btn">Delete Account</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="primary wide" onClick={() => setQuickAction(null)}>Close</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {selectedAppointment && (
          <div className="modal-backdrop" onClick={() => setSelectedAppointment(null)}>
            <div className="modal appointment-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div><span className="kicker">APPOINTMENT DETAILS</span><h2>{selectedAppointment.serviceName}</h2></div>
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
                    <span className={`status-badge ${selectedAppointment.status.toLowerCase()}`}>{selectedAppointment.status}</span>
                  </div>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <small>Patient</small>
                      <strong>{selectedAppointment.patientName || `Patient #${selectedAppointment.userId}`}</strong>
                    </div>
                    <div className="summary-item">
                      <small>Phone</small>
                      <strong>{selectedAppointment.patientPhone || "Not provided"}</strong>
                    </div>
                    <div className="summary-item">
                      <small>Address</small>
                      <strong>{selectedAppointment.patientAddress || "Not provided"}</strong>
                    </div>
                    <div className="summary-item">
                      <small>Date & time</small>
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
                      <small>Total amount</small>
                      <strong>₦{selectedAppointment.totalAmount?.toLocaleString()}</strong>
                    </div>
                  </div>
                  {selectedAppointment.patientNotes && (
                    <div className="notes-section">
                      <small>Additional notes</small>
                      <p>{selectedAppointment.patientNotes}</p>
                    </div>
                  )}
                  {selectedAppointment.uploadedFiles && selectedAppointment.uploadedFiles.length > 0 && (
                    <div className="files-section">
                      <small>Uploaded files</small>
                      <div className="files-list">
                        {selectedAppointment.uploadedFiles.map((file: any, index: number) => (
                          <div key={index} className="file-item-display clickable" onClick={() => setViewingFile(file)} style={{ cursor: "pointer" }}>
                            <span className="file-icon">{file.type?.startsWith('image') ? '🖼️' : '📄'}</span>
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                            <span className="view-icon">👁️</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="service-tracking">
                  <label>Service Progress</label>
                  <div className="tracking-timeline">
                    <div className={`timeline-step ${selectedAppointment.status === 'pending' ? 'current' : ''} ${selectedAppointment.status !== 'pending' && selectedAppointment.status !== 'cancelled' ? 'completed' : ''}`}>
                      <div className="step-icon">{selectedAppointment.status === 'pending' ? '◷' : selectedAppointment.status !== 'pending' && selectedAppointment.status !== 'cancelled' ? '✓' : '◷'}</div>
                      <div className="step-content">
                        <b>Pending Request</b>
                        <small>Awaiting nurse acceptance</small>
                      </div>
                    </div>
                    <div className={`timeline-step ${selectedAppointment.status === 'confirmed' ? 'current' : ''} ${selectedAppointment.status === 'in_progress' || selectedAppointment.status === 'completed' ? 'completed' : ''} ${selectedAppointment.status === 'pending' || selectedAppointment.status === 'cancelled' ? 'pending' : ''}`}>
                      <div className="step-icon">{selectedAppointment.status === 'confirmed' ? '◷' : selectedAppointment.status === 'in_progress' || selectedAppointment.status === 'completed' ? '✓' : '◷'}</div>
                      <div className="step-content">
                        <b>Confirmed</b>
                        <small>Appointment accepted by nurse</small>
                      </div>
                    </div>
                    <div className={`timeline-step ${selectedAppointment.status === 'in_progress' ? 'current' : ''} ${selectedAppointment.status === 'completed' ? 'completed' : ''} ${selectedAppointment.status === 'pending' || selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'cancelled' ? 'pending' : ''}`}>
                      <div className="step-icon">{selectedAppointment.status === 'in_progress' ? '◷' : selectedAppointment.status === 'completed' ? '✓' : '◷'}</div>
                      <div className="step-content">
                        <b>In Progress</b>
                        <small>Nurse is providing care service</small>
                      </div>
                    </div>
                    <div className={`timeline-step ${selectedAppointment.status === 'completed' ? 'current completed' : ''} ${selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' ? 'pending' : ''}`}>
                      <div className="step-icon">{selectedAppointment.status === 'completed' ? '✓' : '◷'}</div>
                      <div className="step-content">
                        <b>Service Completed</b>
                        <small>Care service finished successfully</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="status-actions">
                    <label>Update status</label>
                    {selectedAppointment.status === 'pending' && (
                      <div className="status-buttons">
                        <button 
                          className="status-btn accept-btn"
                          onClick={async () => {
                            console.log("Accepting appointment:", selectedAppointment.id);
                            try {
                              const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "confirmed" })
                              });
                              console.log("Accept response status:", res.status);
                              if (res.ok) {
                                const data = await res.json();
                                console.log("Accept response data:", data);
                                setSelectedAppointment({ ...selectedAppointment, status: "confirmed" });
                                setAppointments(appointments.map((a: any) => a.id === selectedAppointment.id ? { ...a, status: "confirmed" } : a));
                              } else {
                                const errorData = await res.json();
                                console.error("Accept failed:", errorData);
                                alert("Failed to accept appointment: " + (errorData.error || "Unknown error"));
                              }
                            } catch (error) {
                              console.error("Failed to update status:", error);
                              alert("Failed to accept appointment: " + error);
                            }
                          }}
                        >
                          <span>✓</span> Confirm
                        </button>
                        <button 
                          className="status-btn cancel-btn"
                          onClick={async () => {
                            console.log("Rejecting appointment:", selectedAppointment.id);
                            try {
                              const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "cancelled" })
                              });
                              console.log("Reject response status:", res.status);
                              if (res.ok) {
                                const data = await res.json();
                                console.log("Reject response data:", data);
                                setSelectedAppointment({ ...selectedAppointment, status: "cancelled" });
                                setAppointments(appointments.map((a: any) => a.id === selectedAppointment.id ? { ...a, status: "cancelled" } : a));
                              } else {
                                const errorData = await res.json();
                                console.error("Reject failed:", errorData);
                                alert("Failed to reject appointment: " + (errorData.error || "Unknown error"));
                              }
                            } catch (error) {
                              console.error("Failed to update status:", error);
                              alert("Failed to reject appointment: " + error);
                            }
                          }}
                        >
                          <span>✕</span> Reject
                        </button>
                      </div>
                    )}
                    {selectedAppointment.status === 'confirmed' && (
                      <div className="status-buttons">
                        <button 
                          className="status-btn start-btn"
                          onClick={async () => {
                            console.log("Starting service:", selectedAppointment.id);
                            try {
                              const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "in_progress" })
                              });
                              console.log("Start response status:", res.status);
                              if (res.ok) {
                                const data = await res.json();
                                console.log("Start response data:", data);
                                setSelectedAppointment({ ...selectedAppointment, status: "in_progress" });
                                setAppointments(appointments.map((a: any) => a.id === selectedAppointment.id ? { ...a, status: "in_progress" } : a));
                                setConsultationText(data.appointment.consultationReport || "");
                              } else {
                                const errorData = await res.json();
                                console.error("Start failed:", errorData);
                                alert("Failed to start service: " + (errorData.error || "Unknown error"));
                              }
                            } catch (error) {
                              console.error("Failed to update status:", error);
                              alert("Failed to start service: " + error);
                            }
                          }}
                        >
                          <span>▶</span> Start Service
                        </button>
                        <button 
                          className="status-btn cancel-btn"
                          onClick={async () => {
                            console.log("Cancelling appointment:", selectedAppointment.id);
                            try {
                              const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "cancelled" })
                              });
                              console.log("Cancel response status:", res.status);
                              if (res.ok) {
                                const data = await res.json();
                                console.log("Cancel response data:", data);
                                setSelectedAppointment({ ...selectedAppointment, status: "cancelled" });
                                setAppointments(appointments.map((a: any) => a.id === selectedAppointment.id ? { ...a, status: "cancelled" } : a));
                              } else {
                                const errorData = await res.json();
                                console.error("Cancel failed:", errorData);
                                alert("Failed to cancel appointment: " + (errorData.error || "Unknown error"));
                              }
                            } catch (error) {
                              console.error("Failed to update status:", error);
                              alert("Failed to cancel appointment: " + error);
                            }
                          }}
                        >
                          <span>✕</span> Cancel
                        </button>
                      </div>
                    )}
                    {selectedAppointment.status === 'in_progress' && (
                      <div className="status-actions in-progress">
                        <label>Consultation Report (required to finish)</label>
                        <textarea 
                          placeholder="Write your consultation report and findings here..."
                          value={consultationText}
                          onChange={(e) => setConsultationText(e.target.value)}
                          className="consultation-textarea"
                          style={{ width: "100%", padding: "16px", minHeight: "150px", marginBottom: "16px", fontFamily: "inherit", fontSize: "15px", border: "1px solid var(--line)", borderRadius: "8px", resize: "vertical" }}
                        />
                        <div className="status-buttons">
                          <button 
                            className="status-btn complete-btn"
                            disabled={!consultationText.trim()}
                            onClick={async () => {
                              if (!consultationText.trim()) {
                                alert("Please write a consultation report before finishing the service");
                                return;
                              }
                              console.log("Finishing service:", selectedAppointment.id);
                              try {
                                const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "completed", consultationReport: consultationText })
                                });
                                console.log("Finish response status:", res.status);
                                if (res.ok) {
                                  const data = await res.json();
                                  console.log("Finish response data:", data);
                                  setSelectedAppointment({ ...selectedAppointment, status: "completed", consultationReport: consultationText });
                                  setAppointments(appointments.map((a: any) => a.id === selectedAppointment.id ? { ...a, status: "completed", consultationReport: consultationText } : a));
                                  setConsultationText("");
                                } else {
                                  const errorData = await res.json();
                                  console.error("Finish failed:", errorData);
                                  alert("Failed to finish service: " + (errorData.error || "Unknown error"));
                                }
                              } catch (error) {
                                console.error("Failed to update status:", error);
                                alert("Failed to finish service: " + error);
                              }
                            }}
                          >
                            <span>✓</span> Finish Service
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedAppointment.status === 'completed' && (
                      <div className="completion-summary">
                        <label>Consultation Report</label>
                        <div className="consultation-display">
                          <p>{selectedAppointment.consultationReport || "No consultation report provided"}</p>
                        </div>
                      </div>
                    )}
                    {selectedAppointment.status === 'cancelled' && (
                      <div className="cancelled-message">
                        <span className="cancelled-icon">✕</span>
                        <p>This appointment has been cancelled</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <button className="primary wide" onClick={() => setSelectedAppointment(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
        {showCalendar && (
          <div className="modal-backdrop" onClick={() => setShowCalendar(false)}>
            <div className="modal calendar-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div><span className="kicker">CALENDAR VIEW</span><h2>Appointments Calendar</h2></div>
                <button onClick={() => setShowCalendar(false)}>×</button>
              </div>
              <div className="form-body">
                <div className="calendar-view">
                  {appointments.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📅</div>
                      <h3>No appointments yet</h3>
                      <p>Appointments will appear here once patients book services.</p>
                    </div>
                  ) : (
                    <div className="calendar-grid">
                      {appointments.map((a: any) => (
                        <div key={a.id} className="calendar-item" onClick={() => { setSelectedAppointment(a); setShowCalendar(false); }} style={{ cursor: "pointer" }}>
                          <div className="calendar-date">
                            <span className="day">{new Date(a.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            <span className="date-num">{new Date(a.date).getDate()}</span>
                            <span className="time">{a.time}</span>
                          </div>
                          <div className="calendar-details">
                            <div className="service-info">
                              <b>{a.serviceName}</b>
                              <span className={`status-badge ${a.status.toLowerCase()}`}>{a.status}</span>
                            </div>
                            <div className="patient-info">
                              <span className="patient-icon">👤</span>
                              <span>{a.patientName || `Patient #${a.userId}`}</span>
                            </div>
                            <div className="mode-info">
                              <span className="mode-icon">{a.mode === 'Home visit' ? '🏠' : '💻'}</span>
                              <span>{a.mode}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="primary wide" onClick={() => setShowCalendar(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
        {viewingFile && (
          <div className="modal-backdrop" onClick={() => setViewingFile(null)}>
            <div className="modal file-viewer-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div><span className="kicker">FILE VIEWER</span><h2>{viewingFile.name}</h2></div>
                <button onClick={() => setViewingFile(null)}>×</button>
              </div>
              <div className="form-body">
                <div className="file-viewer-content">
                  {viewingFile.type?.startsWith('image') ? (
                    <div className="image-preview">
                      <div className="placeholder-image">
                        <span className="image-icon">🖼️</span>
                        <p>Image preview would display here</p>
                        <small>{viewingFile.name} ({(viewingFile.size / 1024).toFixed(1)} KB)</small>
                      </div>
                    </div>
                  ) : (
                    <div className="document-preview">
                      <div className="placeholder-document">
                        <span className="doc-icon">📄</span>
                        <p>Document preview would display here</p>
                        <small>{viewingFile.name} ({(viewingFile.size / 1024).toFixed(1)} KB)</small>
                      </div>
                    </div>
                  )}
                </div>
                <button className="primary wide" onClick={() => setViewingFile(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
