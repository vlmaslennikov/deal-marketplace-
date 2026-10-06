"use client";
import {
  currencies,
  convertCents,
  type Currency,
  type RateSnapshot,
} from "@/modules/marketplace/domain/money";
import { CountryFlag, CurrencyFlag } from "./country-flag";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AssetCard, ApiData } from "../contracts";
import { countryNames, categoryNames, mutate } from "./helpers";
import { parseMoney } from "@/modules/marketplace/domain/policies";
async function changeCurrency(
  form: HTMLFormElement,
  fields: string[],
  from: Currency,
  to: Currency,
) {
  if (from === to) return;
  const inputs = fields.map(
    (name) => form.elements.namedItem(name) as HTMLInputElement,
  );
  if (!inputs.some((input) => input.value)) return;
  const response = await fetch("/api/rates");
  if (!response.ok)
    throw new Error(
      "Exchange rates are unavailable. Currency was not changed.",
    );
  const rates = (await response.json()) as RateSnapshot;
  const converted = inputs.map((input) =>
    input.value ? convertCents(parseMoney(input.value), from, to, rates) : null,
  );
  if (converted.some((value) => value !== null && value > 2000000000))
    throw new Error(
      "Converted amount exceeds 20,000,000. Enter a smaller amount before changing currency.",
    );
  inputs.forEach((input, index) => {
    if (converted[index] !== null)
      input.value = (converted[index]! / 100).toFixed(2);
  });
}
function choices(
  name: string,
  values: Record<string, string>,
  selected: string[],
) {
  return (
    <div className="checkboxes">
      {Object.entries(values).map(([v, n]) => (
        <label key={v}>
          <input
            type="checkbox"
            name={name}
            value={v}
            defaultChecked={selected.includes(v)}
          />
          {name === "countries" && <CountryFlag country={v} />} {n}
        </label>
      ))}
    </div>
  );
}
export function AssetForm({ asset }: { asset?: AssetCard }) {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>(asset?.currency ?? "EUR");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [converting, setConverting] = useState(false);
  async function save(form: HTMLFormElement, publish: boolean) {
    setBusy(true);
    setError("");
    try {
      const f = new FormData(form);
      const s = (n: string) => String(f.get(n) ?? "");
      const result = await mutate({
        type: "saveAsset",
        id: asset?.id,
        publish,
        data: {
          title: s("title"),
          description: s("description"),
          category: s("category"),
          country: s("country"),
          priceCents: parseMoney(s("price")),
          currency,
          businessStatus: s("businessStatus"),
          licenseType: s("licenseType"),
          regulator: s("regulator"),
          features: s("features")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      router.push("/assets/" + result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back" href="/my-assets">
        Back to my listings
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SELLER WORKSPACE</span>
          <h1>{asset ? "Edit your listing" : "Create an opportunity"}</h1>
          <p className="muted">
            Start with a draft. Publish when the essential details are ready.
          </p>
        </div>
      </div>
      <form
        className="form-panel"
        onSubmit={(e) => {
          e.preventDefault();
          const button = (e.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement;
          save(e.currentTarget, button?.value === "publish");
        }}
      >
        <h2>Asset details</h2>
        <p className="muted small">
          Keep sensitive company identifiers out of the public description.
        </p>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        <label>
          Listing title
          <input
            name="title"
            maxLength={120}
            defaultValue={asset?.title ?? ""}
            placeholder="e.g. Polish payment institution"
          />
        </label>
        <div className="two-col">
          <label>
            Category
            <select name="category" defaultValue={asset?.category ?? "PAYMENT"}>
              {Object.entries(categoryNames).map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Jurisdiction
            <select name="country" defaultValue={asset?.country ?? "PL"}>
              {Object.entries(countryNames).map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="money-field">
            <label htmlFor="asking-price">Asking price ({currency})</label>
            <div className="money-control">
              <input
                id="asking-price"
                name="price"
                type="number"
                min="0"
                max="20000000"
                step="0.01"
                required
                defaultValue={asset ? asset.priceCents / 100 : 0}
              />
              <CurrencyFlag currency={currency} />
              <select
                aria-label="Listing currency"
                disabled={converting}
                value={currency}
                onChange={async (e) => {
                  const to = e.target.value as Currency;
                  setConverting(true);
                  setError("");
                  try {
                    await changeCurrency(
                      e.currentTarget.form!,
                      ["price"],
                      currency,
                      to,
                    );
                    setCurrency(to);
                  } catch (error) {
                    setError((error as Error).message);
                  } finally {
                    setConverting(false);
                  }
                }}
              >
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <label>
            Business status
            <select
              name="businessStatus"
              defaultValue={asset?.businessStatus ?? "ACTIVE"}
            >
              <option value="ACTIVE">Operating business</option>
              <option value="LICENSE_ONLY">Licence only</option>
            </select>
          </label>
          <label>
            Licence type
            <input
              name="licenseType"
              maxLength={80}
              defaultValue={asset?.licenseType ?? ""}
              placeholder="e.g. SPI"
            />
          </label>
          <label>
            Regulator
            <input
              name="regulator"
              maxLength={100}
              defaultValue={asset?.regulator ?? ""}
              placeholder="e.g. KNF or Not applicable"
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            name="description"
            rows={6}
            maxLength={6000}
            defaultValue={asset?.description ?? ""}
            placeholder="Describe the business, operations and proposed acquisition scope."
          />
        </label>
        <label>
          Business capabilities
          <input
            name="features"
            defaultValue={asset?.features.join(", ") ?? ""}
            placeholder="Merchant acquiring, Payment transfers"
          />
          <small>Separate with commas, up to 8 capabilities.</small>
        </label>
        <div className="info">
          <strong>Ready to publish?</strong> Add a title of at least 8
          characters, a description of at least 40 characters, a positive price,
          licence and regulator.
        </div>
        <div className="form-actions">
          <Link className="button" href="/my-assets">
            Cancel
          </Link>
          <button disabled={busy || converting} name="intent" value="draft">
            {asset?.status === "PUBLISHED" ? "Save changes" : "Save draft"}
          </button>
          <button
            disabled={busy || converting}
            className="primary"
            name="intent"
            value="publish"
          >
            Publish listing
          </button>
        </div>
      </form>
    </>
  );
}
export function ProfileForm({
  data,
  onSaved,
}: {
  data: ApiData;
  onSaved: () => void;
}) {
  const p = data.profile;
  const [currency, setCurrency] = useState<Currency>(
    p?.budgetCurrency ?? "EUR",
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [converting, setConverting] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR MARKETPLACE IDENTITY</span>
          <h1>Your profile & interests</h1>
          <p className="muted">
            Help the right people understand what you bring to the table.
          </p>
        </div>
      </div>
      <form
        className="form-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setSaved(false);
          try {
            const f = new FormData(e.currentTarget);
            const s = (k: string) => String(f.get(k) ?? "");
            await mutate({
              type: "profile",
              data: {
                company: s("company"),
                bio: s("bio"),
                country: s("country"),
                countries: f.getAll("countries"),
                categories: f.getAll("categories"),
                licenses: s("licenses")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                budgetCurrency: currency,
                minBudget: s("min") ? parseMoney(s("min")) : null,
                maxBudget: s("max") ? parseMoney(s("max")) : null,
              },
            });
            setSaved(true);
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Company profile</h2>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className="success" role="status">
            Profile saved. Your acquisition criteria are up to date.
          </div>
        )}
        <div className="two-col">
          <label>
            Company name
            <input
              name="company"
              minLength={2}
              maxLength={100}
              required
              defaultValue={p?.company ?? ""}
            />
          </label>
          <label>
            Based in
            <select name="country" defaultValue={p?.country ?? "PL"}>
              {Object.entries(countryNames).map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          About your company
          <textarea
            name="bio"
            rows={4}
            maxLength={2000}
            defaultValue={p?.bio ?? ""}
          />
        </label>
        {data.actor.role === "BUYER" && (
          <>
            <h2>Acquisition criteria</h2>
            <p className="muted small">
              Leave a criterion empty to keep your options open.
            </p>
            <fieldset>
              <legend>Preferred jurisdictions</legend>
              {choices("countries", countryNames, p?.countries ?? [])}
            </fieldset>
            <fieldset>
              <legend>Interested categories</legend>
              {choices("categories", categoryNames, p?.categories ?? [])}
            </fieldset>
            <label>
              Budget currency <CurrencyFlag currency={currency} />
              <select
                aria-label="Budget currency"
                disabled={converting}
                value={currency}
                onChange={async (e) => {
                  const to = e.target.value as Currency;
                  setConverting(true);
                  setError("");
                  try {
                    await changeCurrency(
                      e.currentTarget.form!,
                      ["min", "max"],
                      currency,
                      to,
                    );
                    setCurrency(to);
                  } catch (error) {
                    setError((error as Error).message);
                  } finally {
                    setConverting(false);
                  }
                }}
              >
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <div className="two-col">
              <label>
                Minimum budget ({currency})
                <input
                  name="min"
                  type="number"
                  min="0"
                  max="20000000"
                  step="0.01"
                  defaultValue={p?.minBudget != null ? p.minBudget / 100 : ""}
                />
              </label>
              <label>
                Maximum budget ({currency})
                <input
                  name="max"
                  type="number"
                  min="0"
                  max="20000000"
                  step="0.01"
                  defaultValue={p?.maxBudget != null ? p.maxBudget / 100 : ""}
                />
              </label>
            </div>
            <label>
              Preferred licences
              <input
                name="licenses"
                defaultValue={p?.licenses.join(", ") ?? ""}
                placeholder="SPI, EMI"
              />
              <small>Separate licence types with commas.</small>
            </label>
          </>
        )}
        <div className="form-actions">
          <button className="primary" disabled={busy || converting}>
            Save profile
          </button>
        </div>
      </form>
    </>
  );
}
