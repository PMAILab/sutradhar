import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { googleSignInUrl } from "../lib/api";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(
    searchParams.get("authError") ? "Google sign-in didn't go through, mind trying again?" : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const { signInWithEmail, isMock } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    const { error } = await signInWithEmail(email, password);
    setSubmitting(false);
    if (error) {
      setErrorMessage(error);
      return;
    }
    navigate("/dashboard");
  }

  function handleGoogle() {
    // Full-page redirect — the OAuth exchange happens entirely server-side
    // (see backend/src/routes/auth.ts), the browser just needs to land here.
    window.location.href = googleSignInUrl("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-gutter">
      <div className="max-w-md w-full">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-headline-lg text-primary font-semibold italic mb-2">Sutradhar</h1>
          <p className="font-sans text-body-md text-on-surface-variant">
            The thread that holds your wedding season together.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm space-y-6"
        >
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border border-outline-variant hover:bg-surface-container px-10 py-4 rounded-full font-sans text-label-lg text-on-surface transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">account_circle</span>
            Continue with Google
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-outline-variant" />
            <span className="font-sans text-label-sm text-on-surface-variant">or</span>
            <div className="flex-1 h-px bg-outline-variant" />
          </div>

          <div className="space-y-2">
            <label className="font-sans text-label-sm text-on-surface-variant uppercase">Email address</label>
            <input
              type="email"
              required
              className="w-full bg-transparent border-b border-outline-variant py-2 font-sans text-body-md focus:outline-none focus:border-primary transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="font-sans text-label-sm text-on-surface-variant uppercase">Password</label>
            <input
              type="password"
              required
              className="w-full bg-transparent border-b border-outline-variant py-2 font-sans text-body-md focus:outline-none focus:border-primary transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 text-tertiary">
              <span className="material-symbols-outlined text-lg">error</span>
              <p className="font-sans text-body-sm">{errorMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-container text-on-primary px-10 py-4 rounded-full font-sans text-label-lg transition-all active:scale-95 shadow-md disabled:opacity-60"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>

          {isMock && (
            <p className="text-center font-sans text-label-sm uppercase tracking-widest text-on-surface-variant">
              Demo mode: any email and password works
            </p>
          )}
        </form>

        <p className="text-center mt-6 font-sans text-body-sm text-on-surface-variant">
          New here?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
