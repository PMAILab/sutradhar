import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { googleSignInUrl } from "../lib/api";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { signUpWithEmail, isMock } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setErrorMessage("Password needs at least 6 characters.");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    const { error } = await signUpWithEmail(email, password);
    setSubmitting(false);
    if (error) {
      // The backend project requires email confirmation before a session
      // exists — that comes back as this specific message, not a real
      // failure, so it routes to the "check your email" view instead of
      // being shown as an error.
      if (error.startsWith("Check your email")) {
        setConfirmationSent(true);
        return;
      }
      setErrorMessage(error);
      return;
    }
    navigate("/dashboard");
  }

  function handleGoogle() {
    window.location.href = googleSignInUrl("/dashboard");
  }

  if (confirmationSent) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-gutter">
        <div className="max-w-md w-full text-center">
          <h1 className="font-serif text-headline-lg text-primary font-semibold italic mb-4">Check your email</h1>
          <p className="font-sans text-body-md text-on-surface-variant mb-8">
            We sent a confirmation link to {email}. Confirm it, then log in.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="bg-primary hover:bg-primary-container text-on-primary px-10 py-4 rounded-full font-sans text-label-lg transition-all active:scale-95 shadow-md"
          >
            Go to log in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-gutter">
      <div className="max-w-md w-full">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-headline-lg text-primary font-semibold italic mb-2">Sutradhar</h1>
          <p className="font-sans text-body-md text-on-surface-variant">Create your planner account</p>
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
              placeholder="At least 6 characters"
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
            {submitting ? "Creating account..." : "Create account"}
          </button>

          {isMock && (
            <p className="text-center font-sans text-label-sm uppercase tracking-widest text-on-surface-variant">
              Demo mode: any email and password works
            </p>
          )}
        </form>

        <p className="text-center mt-6 font-sans text-body-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
