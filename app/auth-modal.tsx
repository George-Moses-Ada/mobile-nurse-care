"use client";
import { useState } from "react";
import { useAuth } from "./auth-context";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
};

export function AuthModal({ isOpen, onClose, defaultMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"patient" | "nurse">("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name, role);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <span className="kicker">{mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}</span>
            <h2>{mode === "login" ? "Welcome back" : "Join Mobile Nurse Care"}</h2>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="form-body">
          {error && <div className="error-message">{error}</div>}
          
          {mode === "register" && (
            <>
              <label>Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your full name"
              />
              
              <label>I am a</label>
              <div className="choice-row">
                <button
                  type="button"
                  className={role === "patient" ? "selected" : ""}
                  onClick={() => setRole("patient")}
                >
                  <b>👤</b>
                  <span>Patient<small>I need nursing care</small></span>
                </button>
                <button
                  type="button"
                  className={role === "nurse" ? "selected" : ""}
                  onClick={() => setRole("nurse")}
                >
                  <b>👩🏾‍⚕️</b>
                  <span>Nurse<small>I provide care services</small></span>
                </button>
              </div>
            </>
          )}
          
          <label>Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
          
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            minLength={6}
          />
          
          <button type="submit" className="primary wide" disabled={loading}>
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
        <div className="modal-foot">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button type="button" onClick={() => setMode("register")}>
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button type="button" onClick={() => setMode("login")}>
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
