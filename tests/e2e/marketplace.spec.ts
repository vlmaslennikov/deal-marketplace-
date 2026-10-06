import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role: string) {
  await page.goto("/login");
  await page
    .getByRole("button", { name: `Continue as ${role}`, exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
test("buyer filters, inspects matching and sends a persistent private message", async ({
  page,
}) => {
  await login(page, "Buyer");
  await expect(
    page.getByRole("heading", { name: "Discover your next opportunity" }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/desktop-catalog.png" });
  await page
    .getByRole("combobox", { name: "Jurisdiction", exact: true })
    .selectOption("PL");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("PAYMENT");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/country=PL/);
  await page
    .getByRole("link", { name: "Polish payment institution", exact: true })
    .click();
  await expect(page.getByText("Why this matches")).toBeVisible();
  await page
    .getByRole("button", { name: "Contact seller", exact: true })
    .click();
  await page
    .getByLabel("Your message")
    .fill("I would like to discuss the acquisition timeline.");
  await page.getByRole("button", { name: "Send introduction" }).click();
  await expect(
    page.getByText("I would like to discuss the acquisition timeline.").last(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("I would like to discuss the acquisition timeline.").last(),
  ).toBeVisible();
});
test("seller creates and publishes a listing and searches buyers", async ({
  page,
}) => {
  await login(page, "Seller");
  await page.getByRole("link", { name: "New listing", exact: true }).click();
  await page.getByLabel("Listing title").fill("Baltic payment infrastructure");
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "Established payment technology infrastructure with merchant integrations and a structured transition plan.",
    );
  await page.getByLabel("Asking price (EUR)").fill("120000");
  await page.getByLabel("Licence type", { exact: true }).fill("SPI");
  await page.getByLabel("Regulator").fill("KNF");
  await page
    .getByRole("button", { name: "Publish listing", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Baltic payment infrastructure" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Baltic payment infrastructure" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Buyer directory", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Northstar Capital", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Northstar Capital", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Contact buyer", exact: true })
    .click();
  await page
    .getByLabel("Your message")
    .fill("Our listing aligns with your acquisition criteria.");
  await page.getByRole("button", { name: "Send introduction" }).click();
  await expect(
    page.getByText("Our listing aligns with your acquisition criteria.").last(),
  ).toBeVisible();
});
test("buyer updates criteria and refresh retains profile", async ({ page }) => {
  await login(page, "Buyer");
  await page.getByRole("link", { name: "My profile", exact: true }).click();
  await page
    .getByLabel("About your company")
    .fill("Long-term acquirer focused on sustainable payment infrastructure.");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");
  await page.reload();
  await expect(page.getByLabel("About your company")).toHaveValue(
    "Long-term acquirer focused on sustainable payment infrastructure.",
  );
});
test("mobile catalog has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "Buyer");
  await expect(
    page.getByRole("heading", { name: "Discover your next opportunity" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/mobile-catalog.png", fullPage: false });
});
test("manager suspends a participant and restores visibility", async ({
  page,
}) => {
  await login(page, "Manager");
  await page.getByLabel("Search marketplace").fill("Sofia Laurent");
  await page.getByRole("button", { name: "Apply filters" }).click();
  const row = page.getByTestId("person-seller-0");
  await row.getByRole("button", { name: "Suspend" }).click();
  await page.getByLabel("Reason").fill("Demo moderation verification");
  await page.getByRole("button", { name: "Confirm suspension" }).click();
  await expect(row).toContainText("SUSPENDED");
  await row.getByRole("button", { name: "Reactivate" }).click();
  await page.getByLabel("Reason").fill("Demo verification completed");
  await page.getByRole("button", { name: "Confirm reactivation" }).click();
  await expect(row).toContainText("ACTIVE");
});
test("unauthenticated API cannot read marketplace", async ({ request }) => {
  expect((await request.get("/api/marketplace")).status()).toBe(401);
});

test("seller converts entered listing amount and persists USD", async ({
  page,
}) => {
  await login(page, "Seller");
  await page.route("**/api/rates", (route) =>
    route.fulfill({
      json: {
        date: "2026-10-05",
        rates: { EUR: 1, USD: 1.2, GBP: 0.8, PLN: 4 },
      },
    }),
  );
  await page.getByRole("link", { name: "New listing", exact: true }).click();
  await page.getByLabel("Listing title").fill("Dollar converted payment asset");
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "An established payments infrastructure with merchant services and a documented acquisition transition.",
    );
  await page.getByLabel("Asking price (EUR)").fill("100000");
  await page
    .getByRole("combobox", { name: "Listing currency" })
    .selectOption("USD");
  await expect(page.getByLabel("Asking price (USD)")).toHaveValue("120000.00");
  await page.getByLabel("Licence type", { exact: true }).fill("SPI");
  await page.getByLabel("Regulator").fill("KNF");
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect(
    page.getByRole("heading", { name: "Dollar converted payment asset" }),
  ).toBeVisible();
  await expect(page.getByText(/USD\s*120,000/).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(/USD\s*120,000/).first()).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Flag of Poland" }).first(),
  ).toBeVisible();
});
