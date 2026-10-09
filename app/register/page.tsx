"use client";
import { useState, useEffect, Suspense } from "react";
import { useAuth } from "../auth-context";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { googleLogin } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"patient" | "nurse">("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const { register, sendVerification } = useAuth();

  useEffect(() => {
    // Fetch Google Client ID from API
    fetch('/api/auth/google-config')
      .then(res => res.json())
      .then(data => setGoogleClientId(data.googleClientId))
      .catch(err => console.error('Failed to fetch Google config:', err));
  }, []);

  // Handle Google OAuth callback
  useEffect(() => {
    const googleEmail = searchParams.get("email");
    const googleName = searchParams.get("name");
    const googleId = searchParams.get("google_id");
    const picture = searchParams.get("picture");

    if (googleEmail && googleId) {
      // Auto-login with Google credentials
      handleGoogleAuth({ email: googleEmail, name: googleName, google_id: googleId, picture });
    }
  }, [searchParams]);

  const handleGoogleAuth = async (googleData: any) => {
    try {
      await googleLogin(googleData);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
    }
  };

  const handleGoogleLogin = () => {
    if (!googleClientId) {
      alert("Google authentication is not configured");
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/callback/google`;
    const scope = 'email profile';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    window.location.href = authUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(email, password, name, role);
      // Send verification code
      try {
        const code = await sendVerification(email);
        setMessage(`Verification code sent to ${email}. Your code is: ${code}`);
        // Redirect to verify page
        router.push(`/verify?email=${email}`);
      } catch (verifyError) {
        setError(verifyError instanceof Error ? verifyError.message : "Failed to send verification code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="kicker">CREATE ACCOUNT</span>
            <h1>Join Mobile Nurse Care</h1>
            <p>Create your account to get started</p>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
          
          <form onSubmit={handleSubmit}>
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
                <b><span className="material-icons">person</span></b>
                <span>Patient<small>I need nursing care</small></span>
              </button>
              <button
                type="button"
                className={role === "nurse" ? "selected" : ""}
                onClick={() => setRole("nurse")}
              >
                <b><span className="material-icons">local_hospital</span></b>
                <span>Nurse<small>I provide care services</small></span>
              </button>
            </div>
            
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
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="social-login">
            <div className="divider">
              <span>Or continue with</span>
            </div>
            <button type="button" className="social-btn google" onClick={handleGoogleLogin}>
              <span className="material-icons">g_mobiledata</span>
              <span>Google</span>
            </button>
            <button type="button" className="social-btn apple" onClick={() => alert("Apple authentication coming soon")}>
              <span className="material-icons">apple</span>
              <span>Apple</span>
            </button>
          </div>

          <div className="auth-footer">
            <p>
              Already have an account?{" "}
              <a href="/login">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="auth-page"><div className="auth-container"><div className="auth-card"><div className="auth-header"><span className="kicker">CREATE ACCOUNT</span><h1>Join Mobile Nurse Care</h1><p>Loading...</p></div></div></div></div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
