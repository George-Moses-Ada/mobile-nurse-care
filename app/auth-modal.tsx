"use client";
import { useState } from "react";
import { useAuth } from "./auth-context";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
};

type AuthMode = "login" | "register" | "verify" | "forgot" | "reset";

export function AuthModal({ isOpen, onClose, defaultMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"patient" | "nurse">("patient");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { login, register, sendVerification, verifyEmail, forgotPassword, resetPassword } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
        onClose();
      } else if (mode === "register") {
        await register(email, password, name, role);
        // Only send verification code if registration succeeded
        try {
          await sendVerification(email);
          setMessage(`Verification code sent to ${email}. Please check your inbox.`);
          setMode("verify");
        } catch (verifyError) {
          setError(verifyError instanceof Error ? verifyError.message : "Failed to send verification code");
        }
      } else if (mode === "verify") {
        await verifyEmail(email, verificationCode);
        setMessage("Email verified successfully! You can now sign in.");
        setTimeout(() => {
          setMode("login");
          setMessage("");
        }, 2000);
      } else if (mode === "forgot") {
        await forgotPassword(email);
        setMessage("If an account exists with this email, a password reset code has been sent.");
        setMode("reset");
      } else if (mode === "reset") {
        await resetPassword(email, verificationCode, newPassword);
        setMessage("Password reset successfully! You can now sign in.");
        setTimeout(() => {
          setMode("login");
          setMessage("");
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setLoading(true);
    try {
      const code = await sendVerification(email);
      setMessage(`New verification code sent. For development, your code is: ${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <span className="kicker">
              {mode === "login" ? "SIGN IN" : mode === "register" ? "CREATE ACCOUNT" : mode === "verify" ? "VERIFY EMAIL" : mode === "forgot" ? "FORGOT PASSWORD" : "RESET PASSWORD"}
            </span>
            <h2>
              {mode === "login" ? "Welcome back" : mode === "register" ? "Join Mobile Nurse Care" : mode === "verify" ? "Verify your email" : mode === "forgot" ? "Reset your password" : "Enter reset code"}
            </h2>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="form-body">
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
          
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
          
          {mode === "verify" && (
            <>
              <label>Verification code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                placeholder="Enter 6-digit code"
                maxLength={6}
                pattern="[0-9]{6}"
              />
              <button 
                type="button" 
                onClick={handleResendCode} 
                disabled={loading}
                className="text-link"
              >
                Resend code
              </button>
            </>
          )}

          {mode === "forgot" && (
            <>
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </>
          )}

          {mode === "reset" && (
            <>
              <label>Reset code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                placeholder="Enter 6-digit code"
                maxLength={6}
                pattern="[0-9]{6}"
              />
              <label>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter new password"
                minLength={6}
              />
            </>
          )}
          
          <button type="submit" className="primary wide" disabled={loading}>
            {loading ? "Processing..." : mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : mode === "verify" ? "Verify Email" : mode === "forgot" ? "Send Reset Code" : "Reset Password"}
          </button>
        </form>
        <div className="modal-foot">
          {mode === "verify" ? (
            <p>
              <button type="button" onClick={() => setMode("login")}>
                Back to sign in
              </button>
            </p>
          ) : mode === "forgot" ? (
            <p>
              <button type="button" onClick={() => setMode("login")}>
                Back to sign in
              </button>
            </p>
          ) : mode === "reset" ? (
            <p>
              <button type="button" onClick={() => setMode("forgot")}>
                Back to forgot password
              </button>
            </p>
          ) : mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button type="button" onClick={() => setMode("register")}>
                Sign up
              </button>
              {" | "}
              <button type="button" onClick={() => setMode("forgot")}>
                Forgot password?
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
