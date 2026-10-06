"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  ShieldCheck,
  BriefcaseBusiness,
} from "lucide-react";
export function Login({ demoEnabled }: { demoEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn(role?: string, form?: HTMLFormElement) {
    setBusy(true);
    setError("");
    try {
      const data = form ? Object.fromEntries(new FormData(form)) : null;
      const r = await fetch(role ? "/api/demo" : "/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(role ? { role } : data),
      });
      if (!r.ok) {
        const b = await r.json();
        throw new Error(
          b.error?.message ?? b.error ?? b.message ?? "Could not sign in.",
        );
      }
      router.replace(
        role === "manager"
          ? "/manager"
          : role === "seller"
            ? "/my-assets"
            : "/assets",
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-story">
        <a className="brand" href="/">
          Deal
          <i>MARKETPLACE</i>
        </a>
        <div>
          <span className="eyebrow">THE NEXT CHAPTER STARTS HERE</span>
          <h1>
            Exceptional businesses.
            <br />
            <em>The right connections.</em>
          </h1>
          <p>
            A focused marketplace for financial assets, ambitious buyers and new
            possibilities.
          </p>
          <div className="login-pill">
            <Building2 size={20} /> Financial services & fintech
          </div>
        </div>
        <small>
          Independent prototype · All listings are synthetic demo data.
        </small>
      </section>
      <section className="login-form">
        <div className="login-inner">
          <span className="eyebrow">WELCOME TO THE MARKETPLACE</span>
          <h2>Find your next opportunity.</h2>
          <p className="muted">
            Sign in to explore assets and start a conversation.
          </p>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {demoEnabled && (
            <div className="demo-options">
              <p className="caption">EXPLORE WITH A DEMO ACCOUNT</p>
              {[
                [
                  "buyer",
                  "Buyer",
                  Search,
                  "Discover assets and build your acquisition profile",
                ],
                [
                  "seller",
                  "Seller",
                  BriefcaseBusiness,
                  "Publish opportunities and meet buyers",
                ],
                [
                  "manager",
                  "Manager",
                  ShieldCheck,
                  "Review participants and manage the marketplace",
                ],
              ].map(([role, label, Icon, desc]) => {
                const I = Icon as typeof Search;
                return (
                  <button
                    aria-label={`Continue as ${label}`}
                    disabled={busy}
                    key={role as string}
                    onClick={() => signIn(role as string)}
                  >
                    <I size={22} />
                    <span>
                      <strong>Continue as {label as string}</strong>
                      <small>{desc as string}</small>
                    </span>
                  </button>
                );
              })}
              <p className="muted small">
                Shared demo accounts. Changes are visible to other evaluators.
              </p>
            </div>
          )}
          <details open={!demoEnabled}>
            <summary>Sign in with email</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                signIn(undefined, e.currentTarget);
              }}
            >
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <button className="primary" disabled={busy}>
                Sign in
              </button>
            </form>
          </details>
        </div>
      </section>
    </div>
  );
}
