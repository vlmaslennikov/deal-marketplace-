import { faker } from "@faker-js/faker";
import { hashPassword } from "better-auth/crypto";
import { db, pool } from "../src/shared/db/client";
import {
  user,
  account,
  profiles,
  assets,
  conversations,
  messages,
} from "../src/shared/db/schema";
if (!process.env.DATABASE_URL || !process.env.DEMO_PASSWORD)
  throw new Error("DATABASE_URL and DEMO_PASSWORD are required");
faker.seed(51);
const password = await hashPassword(process.env.DEMO_PASSWORD);
await db.transaction(async (t) => {
  for (const role of ["BUYER", "SELLER", "MANAGER"] as const) {
    const total = role === "BUYER" ? 15 : role === "SELLER" ? 8 : 1;
    for (let i = 0; i < total; i++) {
      const id = `${role.toLowerCase()}-${i}`;
      const name =
        i === 0
          ? {
              BUYER: "Alex Morgan",
              SELLER: "Sofia Laurent",
              MANAGER: "Jordan Ellis",
            }[role]
          : faker.person.fullName();
      await t
        .insert(user)
        .values({
          id,
          name,
          email:
            i === 0
              ? `${role.toLowerCase()}@dealdemo.local`
              : `${id}@dealdemo.local`,
          emailVerified: true,
          role,
        })
        .onConflictDoNothing();
      await t
        .insert(account)
        .values({
          id: `account-${id}`,
          accountId: id,
          providerId: "credential",
          userId: id,
          password,
        })
        .onConflictDoNothing();
      if (role !== "MANAGER")
        await t
          .insert(profiles)
          .values({
            userId: id,
            company:
              i === 0
                ? role === "BUYER"
                  ? "Northstar Capital"
                  : "Meridian Advisory"
                : faker.company.name(),
            bio:
              role === "BUYER"
                ? "We acquire established financial infrastructure and regulated payment businesses. Our team prioritizes transparent operations and a clear transition plan."
                : "Independent advisory team supporting owners through carefully managed acquisitions.",
            country: ["PL", "LT", "DE", "GB", "MT", "CA"][i % 6],
            countries:
              i === 0
                ? ["PL", "LT"]
                : [
                    ["DE", "GB"],
                    ["MT", "CA"],
                    ["PL", "DE"],
                  ][i % 3],
            categories:
              i === 0
                ? ["PAYMENT", "EMI"]
                : [["FINTECH"], ["CRYPTO"], ["BANK"], ["PAYMENT", "EMI"]][
                    i % 4
                  ],
            licenses: i === 0 ? ["SPI", "EMI"] : [],
            minBudget: 5000000,
            maxBudget: i === 0 ? 25000000 : 10000000 * (i + 1),
          })
          .onConflictDoNothing();
    }
  }
  const fixture = [
    {
      country: "PL",
      category: "PAYMENT",
      licenseType: "SPI",
      regulator: "KNF",
      title: "Polish payment institution",
      priceCents: 9500000,
      features: [
        "Merchant acquiring",
        "Payment transfers",
        "Transition support",
      ],
    },
    {
      country: "LT",
      category: "EMI",
      licenseType: "EMI",
      regulator: "Bank of Lithuania",
      title: "Lithuanian e-money platform",
      priceCents: 24000000,
      features: [
        "E-money infrastructure",
        "SEPA integrations",
        "Core banking stack",
      ],
    },
    {
      country: "GB",
      category: "FINTECH",
      licenseType: "Technology business",
      regulator: "Not applicable",
      title: "UK merchant analytics platform",
      priceCents: 18500000,
      features: ["Recurring revenue", "Merchant dashboard", "API integrations"],
    },
    {
      country: "CA",
      category: "PAYMENT",
      licenseType: "MSB registration",
      regulator: "FINTRAC",
      title: "Canadian payments business",
      priceCents: 14500000,
      features: [
        "Cross-border payments",
        "Compliance tooling",
        "Operational team",
      ],
    },
    {
      country: "DE",
      category: "BANK",
      licenseType: "Banking authorization",
      regulator: "BaFin",
      title: "German banking opportunity",
      priceCents: 78000000,
      features: [
        "Corporate accounts",
        "Established team",
        "Core infrastructure",
      ],
    },
    {
      country: "MT",
      category: "CRYPTO",
      licenseType: "CASP authorization",
      regulator: "MFSA",
      title: "Malta digital asset platform",
      priceCents: 32000000,
      features: [
        "Trading infrastructure",
        "Custody integrations",
        "Institutional clients",
      ],
    },
  ];
  for (let i = 0; i < 30; i++) {
    const a = fixture[i % 6];
    await t
      .insert(assets)
      .values({
        ...a,
        id: `asset-${i}`,
        sellerId: `seller-${i % 8}`,
        title:
          i < 6
            ? a.title
            : `${a.title} · ${["Atlas", "Horizon", "Vertex", "Nova"][Math.floor(i / 6) - 1]}`,
        description: `${a.title} available for acquisition. This synthetic opportunity includes established technology infrastructure and a structured transition process. ${a.features.join(", ")} are included in the proposed scope. Request an introduction to discuss your acquisition criteria and next steps. All regulatory labels are illustrative demo data and have not been verified.`,
        businessStatus: i % 3 === 0 ? "LICENSE_ONLY" : "ACTIVE",
        priceCents: a.priceCents + i * 250000,
        createdAt: new Date(Date.UTC(2026, 8, 30 - i)),
        status: i === 29 ? "DRAFT" : "PUBLISHED",
      })
      .onConflictDoNothing();
  }
  for (const [currency, country, title, priceCents, sellerId] of [
    [
      "USD",
      "CA",
      "Canadian payment portfolio in dollars",
      21000000,
      "seller-3",
    ],
    ["GBP", "GB", "British fintech platform in pounds", 16500000, "seller-2"],
    ["PLN", "PL", "Polish e-money business in zloty", 67000000, "seller-0"],
  ] as const) {
    await t
      .insert(assets)
      .values({
        id: `asset-fx-${currency.toLowerCase()}`,
        sellerId,
        country,
        currency,
        title,
        priceCents,
        category: "PAYMENT",
        licenseType: "Payment services",
        regulator: "Illustrative demo",
        description: `${title} is a synthetic acquisition opportunity with merchant infrastructure, operational processes, and a proposed structured transition. Regulatory details are illustrative only.`,
        features: ["Payment services", "Merchant technology"],
        businessStatus: "ACTIVE",
        status: "PUBLISHED",
      })
      .onConflictDoNothing();
  }
  for (let i = 0; i < 5; i++) {
    await t
      .insert(conversations)
      .values({
        id: `conversation-${i}`,
        buyerId: `buyer-${i}`,
        sellerId: `seller-${i}`,
        assetId: `asset-${i}`,
      })
      .onConflictDoNothing();
    await t
      .insert(messages)
      .values({
        id: `message-${i}`,
        conversationId: `conversation-${i}`,
        senderId: `seller-${i}`,
        nonce: `seed-${i}`,
        body: "Thank you for your interest. Happy to discuss the scope, transition timeline and your acquisition criteria.",
      })
      .onConflictDoNothing();
  }
});
await pool.end();
console.log(
  "Seed complete: 15 buyers, 8 sellers, 1 manager, 33 assets, 5 conversations.",
);
