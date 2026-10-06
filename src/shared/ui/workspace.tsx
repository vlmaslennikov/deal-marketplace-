"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  MessageSquare,
  UserRound,
  ShieldCheck,
  LogOut,
  BriefcaseBusiness,
  PanelLeft,
} from "lucide-react";
import type { ApiData } from "../contracts";
import { Login } from "./login";
import { Catalog } from "./catalog";
import { AssetDetail, BuyerDetail } from "./details";
import { AssetForm, ProfileForm } from "./forms";
import { Inbox, Manager } from "./management";
import { initials } from "./helpers";
export function Workspace({ demoEnabled }: { demoEnabled: boolean }) {
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<ApiData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const query = params.toString();
  const reload = () => setRefresh((n) => n + 1);
  const parts = path.split("/").filter(Boolean);
  const edit = parts[2] === "edit";
  const create = path === "/assets/new";
  const assetId =
    parts[0] === "assets" && parts[1] && !create ? parts[1] : undefined;
  const personId = parts[0] === "buyers" ? parts[1] : undefined;
  const view =
    parts[0] === "my-assets" || create
      ? "my-assets"
      : parts[0] === "buyers"
        ? "buyers"
        : parts[0] === "manager"
          ? "manager"
          : parts[0] === "profile"
            ? "profile"
            : parts[0] === "inbox"
              ? "inbox"
              : "assets";
  useEffect(() => {
    if (path === "/login") {
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    setError("");
    const q = new URLSearchParams(query);
    q.set("view", view);
    if (assetId) q.set("asset", assetId);
    if (personId) q.set("person", personId);
    fetch("/api/marketplace?" + q, { signal: abort.signal })
      .then(async (r) => {
        const b = await r.json();
        if (r.status === 401) {
          router.replace("/login");
          return;
        }
        if (!r.ok) throw new Error(b.error);
        setData(b);
        if (path === "/")
          router.replace(
            b.actor.role === "MANAGER"
              ? "/manager"
              : b.actor.role === "SELLER"
                ? "/my-assets"
                : "/assets",
          );
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [path, query, view, assetId, personId, refresh, router]);
  if (path === "/login") return <Login demoEnabled={demoEnabled} />;
  const actor = data?.actor;
  const nav = [
    { href: "/assets", label: "Asset marketplace", icon: Building2 },
    ...(actor?.role === "SELLER"
      ? [
          { href: "/buyers", label: "Buyer directory", icon: Users },
          { href: "/my-assets", label: "My listings", icon: BriefcaseBusiness },
        ]
      : []),
    ...(actor?.role === "MANAGER"
      ? [{ href: "/manager", label: "Management", icon: ShieldCheck }]
      : [
          { href: "/inbox", label: "Messages", icon: MessageSquare },
          { href: "/profile", label: "My profile", icon: UserRound },
        ]),
  ];
  async function signOut() {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setData(null);
    router.push("/login");
  }
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="brand" href="/assets">
          Deal
          <i>MARKETPLACE</i>
        </Link>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.href}
              className={
                path.startsWith(n.href) ? "nav-item selected" : "nav-item"
              }
              href={n.href}
            >
              <n.icon size={19} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="sidebar-note-icon">
            <Building2 size={22} />
          </div>
          <strong>
            Better connections.
            <br />
            New possibilities.
          </strong>
          <p>Your next chapter is a conversation away.</p>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">{initials(actor?.name ?? "Guest")}</span>
          <div>
            <strong>{actor?.name ?? "Welcome"}</strong>
            <small>{actor?.role.toLowerCase() ?? "Marketplace"}</small>
          </div>
          <button aria-label="Sign out" title="Sign out" onClick={signOut}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div>
            <PanelLeft size={18} />
            <span>Workspace</span>
            <span className="separator">/</span>
            <strong>
              {view === "assets"
                ? "Asset marketplace"
                : view === "my-assets"
                  ? "My listings"
                  : view === "buyers"
                    ? "Buyer directory"
                    : view === "inbox"
                      ? "Messages"
                      : view === "manager"
                        ? "Management"
                        : "Profile"}
            </strong>
          </div>
          <span className="demo-label">
            {demoEnabled ? "Demo marketplace" : "Marketplace"}
            <span className="blue-dot" />
          </span>
        </header>
        <main className="content">
          {error ? (
            <div className="error-page">
              <h1>We couldn’t open this page</h1>
              <p className="error" role="alert">
                {error}
              </p>
              <button onClick={reload}>Try again</button>
              <Link className="button" href="/assets">
                Marketplace
              </Link>
            </div>
          ) : loading ? (
            <div className="loading" role="status">
              <span className="eyebrow">MARKETPLACE</span>
              <h1>Loading your workspace…</h1>
              <div className="skeleton-grid">
                {[1, 2, 3].map((n) => (
                  <div key={n} />
                ))}
              </div>
            </div>
          ) : data ? (
            <>
              {create ? (
                <AssetForm />
              ) : assetId ? (
                edit ? (
                  <AssetForm key={assetId} asset={data.assets[0]} />
                ) : (
                  data.assets[0] && (
                    <AssetDetail key={assetId} data={data} a={data.assets[0]} />
                  )
                )
              ) : personId ? (
                data.people[0] && <BuyerDetail p={data.people[0]} data={data} />
              ) : view === "profile" ? (
                <ProfileForm data={data} onSaved={() => {}} />
              ) : view === "inbox" ? (
                <Inbox data={data} reload={reload} />
              ) : view === "manager" ? (
                <Manager data={data} reload={reload} />
              ) : (
                <Catalog
                  data={data}
                  people={view === "buyers"}
                  owned={view === "my-assets"}
                />
              )}
            </>
          ) : null}
          <footer className="footer">
            <span>Deal marketplace prototype</span>
            <span>Synthetic demo data · Independent prototype</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
