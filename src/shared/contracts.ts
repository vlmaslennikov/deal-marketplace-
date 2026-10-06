import type {
  Currency,
  RateSnapshot,
} from "@/modules/marketplace/domain/money";
import type {
  Participant,
  Profile,
  Asset,
  Conversation,
  Message,
} from "@/modules/marketplace/domain/model";
export type AssetCard = Omit<Asset, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  sellerName: string;
  company: string;
  convertedPriceCents: number | null;
  convertedCurrency: Currency | null;
  score: number | null;
  reasons: { label: string; matched: boolean | null; weight: number }[];
};
export type PersonCard = Participant & {
  profile: Profile | null;
  score?: number | null;
  budgetNotCompared?: boolean;
  convertedMinBudget?: number | null;
  convertedMaxBudget?: number | null;
  convertedCurrency?: Currency | null;
};
export type Thread = Omit<Conversation, "createdAt"> & {
  createdAt: string;
  otherName: string;
  otherStatus: string;
  title: string;
};
export type ApiData = {
  rates: RateSnapshot | null;
  actor: Participant;
  profile: Profile | null;
  assets: AssetCard[];
  people: PersonCard[];
  threads: Thread[];
  messages: (Omit<Message, "createdAt" | "nonce"> & { createdAt: string })[];
  total: number;
  page: number;
  stats: { assets: number; buyers: number; sellers: number };
  audit: {
    id: string;
    targetUserId: string;
    action: string;
    reason: string;
    createdAt: string;
  }[];
};
