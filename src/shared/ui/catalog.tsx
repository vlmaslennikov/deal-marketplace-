"use client";
import { CountryFlag, CountryList, CurrencyFlag } from "./country-flag";
import { useState, useEffect } from "react";
import { currencies } from "@/modules/marketplace/domain/money";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  Building2,
  MapPin,
  Plus,
  BriefcaseBusiness,
  Landmark,
  CreditCard,
  WalletCards,
  Cpu,
  Blocks,
} from "lucide-react";
import type { ApiData, AssetCard, PersonCard } from "../contracts";
import { countryNames, categoryNames, formatMoney, initials } from "./helpers";
export function Filters({
  people = false,
  manager = false,
}: {
  people?: boolean;
  manager?: boolean;
}) {
  const params = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const [currency, setCurrency] = useState(params.get("currency") ?? "");
  useEffect(() => setCurrency(params.get("currency") ?? ""), [params]);
  return (
    <form
      className="filters"
      key={params.toString()}
      onSubmit={(e) => {
        e.preventDefault();
        const q = new URLSearchParams();
        for (const [k, v] of new FormData(e.currentTarget))
          if (String(v)) q.set(k, String(v));
        if (!q.get("currency") && q.get("sort")?.startsWith("price-"))
          q.set("sort", "newest");
        if (params.get("asset")) q.set("asset", params.get("asset")!);
        router.push(path + "?" + q.toString());
      }}
    >
      <div className="search">
        <Search size={19} />
        <input
          aria-label="Search marketplace"
          name="q"
          placeholder={
            people || manager
              ? "Search participants or companies…"
              : "Search assets, licences or keywords…"
          }
          defaultValue={params.get("q") ?? ""}
        />
      </div>
      <div className="filter-row">
        <label>
          Jurisdiction
          <select name="country" defaultValue={params.get("country") ?? ""}>
            <option value="">All jurisdictions</option>
            {Object.entries(countryNames).map(([v, n]) => (
              <option value={v} key={v}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select name="category" defaultValue={params.get("category") ?? ""}>
            <option value="">All categories</option>
            {Object.entries(categoryNames).map(([v, n]) => (
              <option value={v} key={v}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Currency <CurrencyFlag currency={currency} />
          <select
            name="currency"
            aria-label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="">All currencies</option>
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          {people ? "Min budget" : "Min price"}
          <input
            disabled={!currency}
            title={!currency ? "Choose a currency first" : currency}
            name="min"
            type="number"
            min="0"
            max="20000000"
            placeholder="No minimum"
            defaultValue={params.get("min") ?? ""}
          />
        </label>
        <label>
          {people ? "Max budget" : "Max price"}
          <input
            disabled={!currency}
            title={!currency ? "Choose a currency first" : currency}
            name="max"
            type="number"
            min="0"
            max="20000000"
            placeholder="No maximum"
            defaultValue={params.get("max") ?? ""}
          />
        </label>
        <button className="primary apply">
          <SlidersHorizontal size={16} />
          Apply filters
        </button>
        <Link className="clear" href={path}>
          Reset
        </Link>
      </div>
      <details className="advanced">
        <summary>More filters</summary>
        <div className="filter-row">
          <label>
            Licence
            <input
              name="license"
              defaultValue={params.get("license") ?? ""}
              placeholder="e.g. SPI"
            />
          </label>
          {!people && (
            <label>
              Business status
              <select
                name="business"
                defaultValue={params.get("business") ?? ""}
              >
                <option value="">Any status</option>
                <option value="ACTIVE">Operating business</option>
                <option value="LICENSE_ONLY">Licence only</option>
              </select>
            </label>
          )}
          {manager && (
            <>
              <label>
                Participant role
                <select name="role" defaultValue={params.get("role") ?? ""}>
                  <option value="">All participants</option>
                  <option value="BUYER">Buyer</option>
                  <option value="SELLER">Seller</option>
                </select>
              </label>
              <label>
                Account status
                <select name="status" defaultValue={params.get("status") ?? ""}>
                  <option value="">All statuses</option>
                  <option>ACTIVE</option>
                  <option>SUSPENDED</option>
                  <option>REMOVED</option>
                </select>
              </label>
            </>
          )}
          <input
            type="hidden"
            name="sort"
            value={params.get("sort") ?? "newest"}
          />
        </div>
      </details>
    </form>
  );
}
export function AssetTile({ a }: { a: AssetCard }) {
  const Icon =
    {
      BANK: Landmark,
      PAYMENT: CreditCard,
      EMI: WalletCards,
      FINTECH: Cpu,
      CRYPTO: Blocks,
    }[a.category] ?? BriefcaseBusiness;
  return (
    <article className="asset-card">
      <div className={"card-top category-" + a.category}>
        <span className="category-icon">
          <Icon size={27} />
        </span>
        <span className="badge">{categoryNames[a.category]}</span>
      </div>
      <div className="card-body">
        <div className="location">
          <span>
            <CountryFlag country={a.country} />
          </span>
          {countryNames[a.country]}
          <span className="asset-code">
            {/^asset-\d+$/.test(a.id)
              ? "DEAL-" + String(Number(a.id.split("-")[1]) + 101)
              : "NEW"}
          </span>
        </div>
        <h3>
          <Link href={"/assets/" + a.id}>{a.title || "Untitled draft"}</Link>
        </h3>
        <p className="license-line">
          {a.licenseType || "Licence to be added"} <span>·</span>{" "}
          {a.regulator || "Regulator to be added"}
        </p>
        <div className="tag-row">
          <span>
            {a.businessStatus === "ACTIVE"
              ? "Operating business"
              : "Licence only"}
          </span>
          {a.status !== "PUBLISHED" && (
            <span className="status">{a.status}</span>
          )}
        </div>
        <div className="features">
          {a.features.slice(0, 2).map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
        <div className="card-bottom">
          <div>
            <small>ASKING PRICE</small>
            <strong>
              {formatMoney(
                a.convertedPriceCents ?? a.priceCents,
                a.convertedCurrency ?? a.currency,
              )}
            </strong>
            {a.convertedCurrency && a.convertedCurrency !== a.currency && (
              <small>Original: {formatMoney(a.priceCents, a.currency)}</small>
            )}
          </div>
          {a.reasons.some((r) => r.matched === null) && (
            <span className="match neutral">Budget not compared</span>
          )}
          {a.score !== null && (
            <span className="match" title="Rules-based fit, not probability">
              {a.score}/100 fit
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
export function BuyerTile({ person: p }: { person: PersonCard }) {
  return (
    <article className="buyer-card">
      <div className="buyer-head">
        <span className="avatar">{initials(p.profile?.company ?? p.name)}</span>
        <span className="badge">Buyer</span>
      </div>
      <h3>
        <Link href={"/buyers/" + p.id}>{p.profile?.company ?? p.name}</Link>
      </h3>
      <p className="muted">{p.name}</p>
      <p className="buyer-bio">
        {p.profile?.bio || "Acquisition criteria have not been added yet."}
      </p>
      <div className="tag-row">
        {p.profile?.categories.map((c) => (
          <span key={c}>{categoryNames[c]}</span>
        ))}
      </div>
      <p className="location">
        <MapPin size={15} />
        <CountryList countries={p.profile?.countries} />
      </p>
      <div className="card-bottom">
        <div>
          <small>ACQUISITION BUDGET</small>
          <strong className="budget">
            {p.profile?.minBudget !== null && p.profile
              ? formatMoney(
                  p.convertedMinBudget ?? p.profile.minBudget,
                  p.convertedCurrency ?? p.profile.budgetCurrency,
                )
              : "Open"}{" "}
            –{" "}
            {p.profile?.maxBudget !== null && p.profile
              ? formatMoney(
                  p.convertedMaxBudget ?? p.profile.maxBudget,
                  p.convertedCurrency ?? p.profile.budgetCurrency,
                )
              : "Open"}
          </strong>
        </div>
        {p.budgetNotCompared && (
          <span className="match neutral">Budget not compared</span>
        )}
        {p.score !== null && p.score !== undefined && (
          <span className="match">{p.score}/100</span>
        )}
      </div>
    </article>
  );
}
export function Catalog({
  data,
  people = false,
  owned = false,
}: {
  data: ApiData;
  people?: boolean;
  owned?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  function update(key: string, v: string) {
    const q = new URLSearchParams(params);
    q.set(key, v);
    if (key !== "page") q.delete("page");
    router.push(path + "?" + q);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {people
              ? "MEET YOUR NEXT PARTNER"
              : owned
                ? "SELLER WORKSPACE"
                : "ASSET MARKETPLACE"}
          </span>
          <h1>
            {people
              ? "Connect with the right buyers"
              : owned
                ? "Your opportunities, in one place"
                : "Discover your next opportunity"}
          </h1>
          <p className="muted">
            {people
              ? "Explore acquisition interests and make a focused introduction."
              : owned
                ? "Create, refine and publish your financial business listings."
                : "Explore financial businesses and assets that fit your acquisition strategy."}
          </p>
        </div>
        {owned && (
          <Link className="primary" href="/assets/new">
            <Plus size={18} />
            New listing
          </Link>
        )}
      </div>
      {!owned && (
        <div className="metrics">
          <div className="metric featured">
            <Building2 />
            <span>
              <strong>{data.stats.assets}</strong>
              <small>Published opportunities</small>
            </span>
            <span className="metric-note">Across 6 jurisdictions</span>
          </div>
          <div className="metric">
            <Search />
            <span>
              <strong>{data.stats.buyers}</strong>
              <small>Active buyers</small>
            </span>
          </div>
          <div className="metric">
            <BriefcaseBusiness />
            <span>
              <strong>{data.stats.sellers}</strong>
              <small>Active sellers</small>
            </span>
          </div>
        </div>
      )}
      <Filters people={people} />
      {data.rates && (
        <p className="rate-note">
          Indicative conversion · Frankfurter rate dated {data.rates.date}
        </p>
      )}
      {!data.rates && (
        <p className="rate-note">
          Exchange rates unavailable. Prices are shown in their original
          currencies.
        </p>
      )}
      <div className="results-bar">
        <span>
          <strong>{data.total}</strong>{" "}
          {people ? "buyers" : owned ? "your listings" : "opportunities"}
          <small>
            {" "}
            ·{" "}
            {params.get("q") || params.get("country") || params.get("category")
              ? "Filtered results"
              : "All results"}
          </small>
        </span>
        <label className="sort">
          Sort by
          <select
            aria-label="Sort results"
            value={params.get("sort") ?? "newest"}
            onChange={(e) => update("sort", e.target.value)}
          >
            <option value="newest">{people ? "Name" : "Newest first"}</option>
            {!people && (
              <>
                <option value="price-asc" disabled={!params.get("currency")}>
                  Price: low to high
                </option>
                <option value="price-desc" disabled={!params.get("currency")}>
                  Price: high to low
                </option>
              </>
            )}
            {(data.actor.role === "BUYER" || params.get("asset")) && (
              <option value="match">Best fit</option>
            )}
          </select>
        </label>
      </div>
      {data.total === 0 ? (
        <div className="empty">
          <Search size={30} />
          <h2>No results yet</h2>
          <p>
            Try adjusting your filters
            {owned ? " or create your first listing" : ""}.
          </p>
          <Link href={path}>Clear filters</Link>
        </div>
      ) : (
        <div className="cards">
          {people
            ? data.people.map((p) => <BuyerTile key={p.id} person={p} />)
            : data.assets.map((a) => <AssetTile key={a.id} a={a} />)}
        </div>
      )}
      {data.total > 12 && (
        <div className="pagination">
          <button
            disabled={data.page <= 1}
            onClick={() => update("page", String(data.page - 1))}
          >
            Previous
          </button>
          <span>
            Page {data.page} of {Math.ceil(data.total / 12)}
          </span>
          <button
            disabled={data.page >= Math.ceil(data.total / 12)}
            onClick={() => update("page", String(data.page + 1))}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
