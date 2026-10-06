import type { Currency } from "./money";
export type Role = "BUYER" | "SELLER" | "MANAGER";
export type Status = "ACTIVE" | "SUSPENDED" | "REMOVED";
export type Participant = {
  id: string;
  name: string;
  role: Role;
  status: Status;
};
export type Asset = {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  country: string;
  priceCents: number;
  currency: Currency;
  businessStatus: string;
  licenseType: string;
  regulator: string;
  features: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
};
export type Profile = {
  userId: string;
  company: string;
  bio: string;
  country: string;
  countries: string[];
  categories: string[];
  licenses: string[];
  budgetCurrency: Currency;
  minBudget: number | null;
  maxBudget: number | null;
};
export type Conversation = {
  id: string;
  buyerId: string;
  sellerId: string;
  assetId: string | null;
  createdAt: Date;
};
export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  nonce: string;
  createdAt: Date;
};
export interface Transaction {
  lockUsers(ids: string[]): Promise<Participant[]>;
  asset(id: string): Promise<Asset | undefined>;
  saveAsset(asset: Asset): Promise<void>;
  saveProfile(profile: Profile): Promise<void>;
  moderate(
    managerId: string,
    targetId: string,
    status: Status,
    reason: string,
  ): Promise<void>;
  conversation(id: string): Promise<Conversation | undefined>;
  ensureConversation(
    buyerId: string,
    sellerId: string,
    assetId: string | null,
  ): Promise<Conversation>;
  messageByNonce(senderId: string, nonce: string): Promise<Message | undefined>;
  saveMessage(message: Message): Promise<void>;
}
export interface MarketplaceStore {
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
}
