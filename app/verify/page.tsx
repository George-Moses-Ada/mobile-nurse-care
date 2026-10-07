"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../auth-context";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { verifyEmail, sendVerification } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await verifyEmail(email, verificationCode);
      setMessage("Email verified successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
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
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="kicker">VERIFY EMAIL</span>
            <h1>Verify your email</h1>
            <p>Enter the verification code sent to your email</p>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
          
          <form onSubmit={handleSubmit}>
            <label>Email address</label>
            <input
              type="email"
              value={email}
              disabled
              placeholder="Enter your email"
            />
            
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
              style={{ marginBottom: "16px" }}
            >
              Resend code
            </button>
            
            <button type="submit" className="primary wide" disabled={loading}>
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              <button type="button" onClick={() => router.push("/login")}>
                Back to sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
