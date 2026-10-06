import { countryNames } from "./helpers";
export function CountryFlag({ country }: { country: string }) {
  if (!countryNames[country]) return null;
  return (
    <img
      className="country-flag"
      src={`/flags/${country.toLowerCase()}.svg`}
      alt={`Flag of ${countryNames[country]}`}
      width={24}
      height={18}
    />
  );
}
export function CountryList({ countries }: { countries?: string[] }) {
  return countries?.length ? (
    <>
      {countries.map((c) => (
        <span className="country-label" key={c}>
          <CountryFlag country={c} />
          {countryNames[c]}
        </span>
      ))}
    </>
  ) : (
    <>All jurisdictions</>
  );
}
export function CurrencyFlag({ currency }: { currency: string }) {
  const country = { EUR: "eu", USD: "us", GBP: "gb", PLN: "pl" }[
    currency as "EUR" | "USD" | "GBP" | "PLN"
  ];
  return country ? (
    <img
      className="country-flag"
      src={`/flags/${country}.svg`}
      alt={`${currency} flag`}
      width={24}
      height={18}
    />
  ) : null;
}
