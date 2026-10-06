"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageSquare, RefreshCw, ShieldCheck } from "lucide-react";
import type { ApiData, PersonCard } from "../contracts";
import { Filters, AssetTile } from "./catalog";
import { initials, mutate } from "./helpers";
export function Inbox({ data, reload }: { data: ApiData; reload: () => void }) {
  const params = useSearchParams();
  const thread = data.threads.find((t) => t.id === params.get("thread"));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(() => crypto.randomUUID());
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PRIVATE CONVERSATIONS</span>
          <h1>Your introductions</h1>
          <p className="muted">
            Keep the conversation focused on your next opportunity.
          </p>
        </div>
        <button onClick={reload}>
          <RefreshCw size={16} />
          Refresh messages
        </button>
      </div>
      <div className="inbox">
        <aside className="thread-list">
          {data.threads.length ? (
            data.threads.map((t) => (
              <Link
                href={"/inbox?thread=" + t.id}
                className={t.id === thread?.id ? "thread active" : "thread"}
                key={t.id}
              >
                <span className="avatar">{initials(t.otherName)}</span>
                <div>
                  <strong>{t.otherName}</strong>
                  <small>{t.title}</small>
                </div>
              </Link>
            ))
          ) : (
            <div className="empty">
              <MessageSquare />
              <p>No conversations yet.</p>
            </div>
          )}
        </aside>
        <section className="conversation">
          {thread ? (
            <>
              <div className="conversation-head">
                <strong>{thread.otherName}</strong>
                <small>{thread.title}</small>
              </div>
              <div className="messages">
                {data.messages.map((m) => (
                  <div
                    className={
                      "message " + (m.senderId === data.actor.id ? "own" : "")
                    }
                    key={m.id}
                  >
                    <p>{m.body}</p>
                    <small>
                      {new Date(m.createdAt).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </small>
                  </div>
                ))}
              </div>
              {thread.otherStatus === "ACTIVE" ? (
                <form
                  className="composer"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    setBusy(true);
                    setError("");
                    try {
                      await mutate({
                        type: "message",
                        conversationId: thread.id,
                        body: String(new FormData(form).get("body")),
                        nonce,
                      });
                      setNonce(crypto.randomUUID());
                      form.reset();
                      reload();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Message
                    <textarea
                      name="body"
                      required
                      maxLength={4000}
                      rows={3}
                      placeholder="Write a thoughtful reply…"
                    />
                  </label>
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="primary" disabled={busy}>
                    Send message
                  </button>
                </form>
              ) : (
                <p className="info">
                  This participant is unavailable. Your conversation history is
                  preserved.
                </p>
              )}
            </>
          ) : (
            <div className="empty">
              <MessageSquare size={36} />
              <h2>Select a conversation</h2>
              <p>Or introduce yourself from an asset or buyer profile.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
export function Manager({
  data,
  reload,
}: {
  data: ApiData;
  reload: () => void;
}) {
  const [target, setTarget] = useState<{
    p: PersonCard;
    status: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLATFORM OVERSIGHT</span>
          <h1>Marketplace management</h1>
          <p className="muted">
            Review participants, discover assets and keep the marketplace
            accountable.
          </p>
        </div>
        <span className="badge">
          <ShieldCheck size={16} />
          Manager workspace
        </span>
      </div>
      <Filters manager />
      <section className="panel">
        <h2>
          Participants <span className="count">{data.people.length}</span>
        </h2>
        <div className="participant-list">
          {data.people.map((p) => (
            <div
              className="participant"
              key={p.id}
              data-testid={"person-" + p.id}
            >
              <span className="avatar">{initials(p.name)}</span>
              <div className="participant-name">
                <strong>{p.name}</strong>
                <small>{p.profile?.company ?? "No company profile"}</small>
              </div>
              <span className="badge">{p.role}</span>
              <span className={"status " + p.status.toLowerCase()}>
                {p.status}
              </span>
              <div className="participant-actions">
                {p.status !== "REMOVED" && (
                  <>
                    <button
                      onClick={() => {
                        setError("");
                        setTarget({
                          p,
                          status:
                            p.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                        });
                      }}
                    >
                      {p.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                    </button>
                    <button
                      className="danger-text"
                      onClick={() => {
                        setError("");
                        setTarget({ p, status: "REMOVED" });
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {!data.people.length && (
            <p className="muted">No participants match these filters.</p>
          )}
        </div>
      </section>
      {target && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="moderation-title"
          >
            <h2 id="moderation-title">
              {target.status === "SUSPENDED"
                ? "Suspend"
                : target.status === "ACTIVE"
                  ? "Reactivate"
                  : "Remove"}{" "}
              {target.p.name}?
            </h2>
            <p>
              {target.status === "REMOVED"
                ? "Removal is permanent in this prototype. History will be retained."
                : target.status === "SUSPENDED"
                  ? "Their profile and published assets will be hidden. Publishing and contact will be blocked."
                  : "Their published assets will become visible and access will be restored."}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await mutate({
                    type: "moderate",
                    targetId: target.p.id,
                    status: target.status,
                    reason: String(new FormData(e.currentTarget).get("reason")),
                  });
                  setTarget(null);
                  reload();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Reason
                <textarea
                  name="reason"
                  autoFocus
                  minLength={5}
                  maxLength={500}
                  required
                  rows={3}
                />
              </label>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <div className="form-actions">
                <button type="button" onClick={() => setTarget(null)}>
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className={target.status === "ACTIVE" ? "primary" : "danger"}
                >
                  Confirm{" "}
                  {target.status === "SUSPENDED"
                    ? "suspension"
                    : target.status === "ACTIVE"
                      ? "reactivation"
                      : "removal"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <div className="section-title">
        <h2>
          Assets <span className="count">{data.total}</span>
        </h2>
        <Link href="/assets">View asset directory</Link>
      </div>
      <div className="cards">
        {data.assets.map((a) => (
          <AssetTile key={a.id} a={a} />
        ))}
      </div>
      <section className="panel audit">
        <h2>Recent moderation history</h2>
        {data.audit.length ? (
          data.audit.map((a) => (
            <div className="audit-row" key={a.id}>
              <span className="badge">{a.action}</span>
              <div>
                <strong>{a.targetUserId}</strong>
                <p>{a.reason}</p>
              </div>
              <time>{new Date(a.createdAt).toLocaleDateString("en-GB")}</time>
            </div>
          ))
        ) : (
          <p className="muted">No moderation actions yet.</p>
        )}
      </section>
    </>
  );
}
