ALTER TABLE "assets" DROP CONSTRAINT "asset_currency";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "budget_currency" text DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "asset_currency" CHECK ("assets"."currency" in ('EUR', 'USD', 'GBP', 'PLN'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "budget_currency" CHECK ("profiles"."budget_currency" in ('EUR', 'USD', 'GBP', 'PLN'));