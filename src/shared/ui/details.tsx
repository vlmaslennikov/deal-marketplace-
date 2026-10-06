"use client";
import {
  currencies,
  convertCents,
  type Currency,
} from "@/modules/marketplace/domain/money";
import { useState } from "react";
import { CountryFlag, CountryList, CurrencyFlag } from "./country-flag";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Minus, MessageSquare, MapPin, Building2 } from "lucide-react";
import type { ApiData, AssetCard, PersonCard } from "../contracts";
import {
  countryNames,
  categoryNames,
  formatMoney,
  initials,
  mutate,
} from "./helpers";
export function Contact({
  targetId,
  assetId,
  label,
}: {
  targetId: string;
  assetId?: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(() => crypto.randomUUID());
  return (
    <>
      <button className="primary full" onClick={() => setOpen(!open)}>
        <MessageSquare size={18} />
        {label}
      </button>
      {open && (
        <form
          className="contact-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const body = String(new FormData(e.currentTarget).get("body"));
              const r = await mutate({
                type: "contact",
                targetId,
                assetId,
                body,
                nonce,
              });
              setNonce(crypto.randomUUID());
              router.push("/inbox?thread=" + r.id);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Your message
            <textarea
              name="body"
              required
              minLength={1}
              maxLength={4000}
              rows={4}
              placeholder="Introduce yourself and explain your interest."
              autoFocus
            />
          </label>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <button className="primary full" disabled={busy}>
            Send introduction
          </button>
        </form>
      )}
    </>
  );
}
export function AssetDetail({ data, a }: { data: ApiData; a: AssetCard }) {
  const router = useRouter();
  const own = data.actor.id === a.sellerId;
  const [currency, setCurrency] = useState<Currency>(
    a.convertedCurrency ?? a.currency,
  );
  const convertedPrice = convertCents(
    a.priceCents,
    a.currency,
    currency,
    data.rates,
  );
  const [archive, setArchive] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Link className="back" href={own ? "/my-assets" : "/assets"}>
        Back to {own ? "my listings" : "opportunities"}
      </Link>
      <div className="detail-heading">
        <div className="location">
          <CountryFlag country={a.country} /> {countryNames[a.country]}
          <span className="badge">{categoryNames[a.category]}</span>
          <span className="badge">{a.status}</span>
        </div>
        <h1>{a.title || "Untitled draft"}</h1>
        <p className="muted">
          {a.licenseType} · {a.regulator} ·{" "}
          {a.businessStatus === "ACTIVE"
            ? "Operating business"
            : "Licence only"}
        </p>
      </div>
      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2>Opportunity overview</h2>
            <p className="description">
              {a.description || "Add a description before publishing."}
            </p>
            <h2>Business capabilities</h2>
            <div className="capabilities">
              {a.features.length ? (
                a.features.map((f) => (
                  <div key={f}>
                    <Check size={17} />
                    {f}
                  </div>
                ))
              ) : (
                <p className="muted">No capabilities provided.</p>
              )}
            </div>
            <h2>At a glance</h2>
            <dl className="facts">
              <div>
                <dt>Jurisdiction</dt>
                <dd>
                  <CountryFlag country={a.country} /> {countryNames[a.country]}
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{categoryNames[a.category]}</dd>
              </div>
              <div>
                <dt>Licence</dt>
                <dd>{a.licenseType || "Not specified"}</dd>
              </div>
              <div>
                <dt>Regulator</dt>
                <dd>{a.regulator || "Not specified"}</dd>
              </div>
            </dl>
          </section>
          {data.actor.role === "BUYER" && (
            <section className="panel match-panel">
              <div className="section-title">
                <h2>Why this matches</h2>
                <strong>
                  {a.score !== null
                    ? a.score + "/100 fit"
                    : a.reasons.some((r) => r.matched === null)
                      ? "Budget not compared"
                      : "Set your criteria"}
                </strong>
              </div>
              <p className="muted small">
                An explainable score based on your acquisition criteria. This is
                not a probability or financial assessment.
              </p>
              {a.reasons.map((r) => (
                <div className="match-reason" key={r.label}>
                  {r.matched ? <Check size={18} /> : <Minus size={18} />}
                  <span>{r.label}</span>
                  <strong>
                    {r.matched === null
                      ? `Rate unavailable (${data.profile?.budgetCurrency} / ${a.currency})`
                      : r.matched
                        ? "Matches"
                        : "Outside preferences"}
                  </strong>
                </div>
              ))}
              <Link href="/profile">Update acquisition criteria</Link>
            </section>
          )}
        </div>
        <aside>
          <section className="panel price-panel">
            <span className="caption">ASKING PRICE</span>
            <div className="detail-price">
              {formatMoney(
                convertedPrice ?? a.priceCents,
                convertedPrice === null ? a.currency : currency,
              )}
            </div>
            <label className="currency-choice">
              Display currency <CurrencyFlag currency={currency} />
              <select
                aria-label="Display currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {currencies.map((c) => (
                  <option key={c} disabled={c !== a.currency && !data.rates}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {currency !== a.currency && (
              <p className="muted small">
                Original: {formatMoney(a.priceCents, a.currency)} · Frankfurter{" "}
                {data.rates?.date}
              </p>
            )}
            <p className="muted small">Indicative asking price</p>
            <hr />
            <div className="seller-info">
              <span className="avatar">{initials(a.company)}</span>
              <div>
                <strong>{a.company}</strong>
                <small>{a.sellerName}</small>
              </div>
            </div>
            {data.actor.role === "BUYER" && a.status === "PUBLISHED" && (
              <Contact
                targetId={a.sellerId}
                assetId={a.id}
                label="Contact seller"
              />
            )}
            {own && a.status !== "ARCHIVED" && (
              <>
                <Link
                  className="primary full"
                  href={"/assets/" + a.id + "/edit"}
                >
                  Edit listing
                </Link>
                <Link
                  className="button full"
                  href={"/buyers?asset=" + a.id + "&sort=match"}
                >
                  Find matching buyers
                </Link>
                <button
                  className="text-button"
                  onClick={() => setArchive(true)}
                >
                  Archive listing
                </button>
                {archive && (
                  <div className="info">
                    <p>
                      Remove this listing from discovery? It will remain in your
                      history.
                    </p>
                    <button
                      className="danger"
                      onClick={async () => {
                        try {
                          await mutate({ type: "archiveAsset", id: a.id });
                          router.push("/my-assets");
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Confirm archive
                    </button>
                    <button onClick={() => setArchive(false)}>Cancel</button>
                  </div>
                )}
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
          <p className="privacy-note">
            <Building2 size={18} /> Contact details stay private. Start an
            introduction through the marketplace.
          </p>
        </aside>
      </div>
    </>
  );
}
export function BuyerDetail({ p, data }: { p: PersonCard; data: ApiData }) {
  const native = p.profile?.budgetCurrency ?? "EUR";
  const [currency, setCurrency] = useState<Currency>(
    p.convertedCurrency ?? native,
  );
  const money = (amount: number | null | undefined) =>
    amount == null
      ? "Open"
      : formatMoney(
          convertCents(amount, native, currency, data.rates) ?? amount,
          data.rates || currency === native ? currency : native,
        );
  return (
    <>
      <Link className="back" href="/buyers">
        Back to buyer directory
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BUYER PROFILE</span>
          <h1>{p.profile?.company ?? p.name}</h1>
          <p className="muted">
            {p.name} · <CountryFlag country={p.profile?.country ?? ""} />{" "}
            {countryNames[p.profile?.country ?? ""]}
          </p>
        </div>
        <span className="avatar large">
          {initials(p.profile?.company ?? p.name)}
        </span>
      </div>
      <div className="detail-grid">
        <section className="panel">
          <h2>About the buyer</h2>
          <p className="description">
            {p.profile?.bio || "No introduction yet."}
          </p>
          <h2>Acquisition interests</h2>
          <div className="tag-row">
            {p.profile?.categories.map((c) => (
              <span key={c}>{categoryNames[c]}</span>
            ))}
          </div>
          <p className="location">
            <MapPin size={17} />
            <CountryList countries={p.profile?.countries} />
          </p>
          <h2>Preferred licences</h2>
          <p>{p.profile?.licenses.join(", ") || "Open to all licence types"}</p>
        </section>
        <section className="panel price-panel">
          <span className="caption">ACQUISITION BUDGET</span>
          <h2>
            {money(p.profile?.minBudget)} – {money(p.profile?.maxBudget)}
          </h2>
          <label className="currency-choice">
            Display currency
            <select
              aria-label="Display currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
            >
              {currencies.map((c) => (
                <option key={c} disabled={c !== native && !data.rates}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {currency !== native && (
            <p className="muted small">
              Original:{" "}
              {p.profile?.minBudget == null
                ? "Open"
                : formatMoney(p.profile.minBudget, native)}{" "}
              –{" "}
              {p.profile?.maxBudget == null
                ? "Open"
                : formatMoney(p.profile.maxBudget, native)}{" "}
              · Frankfurter {data.rates?.date}
            </p>
          )}
          <Contact targetId={p.id} label="Contact buyer" />
        </section>
      </div>
    </>
  );
}
