"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth-context";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { forgotPassword } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const code = await forgotPassword(email);
      setMessage(`If an account exists with this email, a password reset code has been sent. For development, your code is: ${code}`);
      // Redirect to reset page
      router.push(`/reset-password?email=${email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="kicker">FORGOT PASSWORD</span>
            <h1>Reset your password</h1>
            <p>Enter your email to receive a reset code</p>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
          
          <form onSubmit={handleSubmit}>
            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
            
            <button type="submit" className="primary wide" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Code"}
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
