"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../auth-context";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  const { login, googleLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Fetch Google Client ID from API
    fetch('/api/auth/google-config')
      .then(res => res.json())
      .then(data => setGoogleClientId(data.googleClientId))
      .catch(err => console.error('Failed to fetch Google config:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
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

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="kicker">SIGN IN</span>
            <h1>Welcome back</h1>
            <p>Sign in to access your account</p>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
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
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="social-login">
            <div className="divider">
              <span>Or continue with</span>
            </div>
            <button type="button" className="social-btn google" onClick={handleGoogleLogin} disabled={!googleClientId}>
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
              Don't have an account?{" "}
              <a href="/register">Sign up</a>
              {" | "}
              <a href="/forgot-password">Forgot password?</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
