import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/shared/db/client";
import {
  user,
  assets,
  profiles,
  conversations,
  messages,
  moderationActions,
} from "@/shared/db/schema";
import type { MarketplaceStore, Transaction } from "../domain/model";
export const store: MarketplaceStore = {
  transaction: (work) =>
    db.transaction(async (t) => {
      const tx: Transaction = {
        lockUsers: (ids) =>
          t
            .select({
              id: user.id,
              name: user.name,
              role: user.role,
              status: user.status,
            })
            .from(user)
            .where(inArray(user.id, [...new Set(ids)].sort()))
            .orderBy(user.id)
            .for("update"),
        asset: async (id) =>
          (await t.select().from(assets).where(eq(assets.id, id)))[0],
        saveAsset: async (a) => {
          await t
            .insert(assets)
            .values(a)
            .onConflictDoUpdate({
              target: assets.id,
              set: { ...a, updatedAt: new Date() },
            });
        },
        saveProfile: async (p) => {
          await t
            .insert(profiles)
            .values(p)
            .onConflictDoUpdate({ target: profiles.userId, set: p });
        },
        moderate: async (managerId, targetId, status, reason) => {
          await t
            .update(user)
            .set({ status, updatedAt: new Date() })
            .where(eq(user.id, targetId));
          await t.insert(moderationActions).values({
            id: crypto.randomUUID(),
            managerId,
            targetUserId: targetId,
            action: status,
            reason,
          });
        },
        conversation: async (id) =>
          (
            await t.select().from(conversations).where(eq(conversations.id, id))
          )[0],
        ensureConversation: async (buyerId, sellerId, assetId) => {
          await t
            .insert(conversations)
            .values({ id: crypto.randomUUID(), buyerId, sellerId, assetId })
            .onConflictDoNothing();
          return (
            await t
              .select()
              .from(conversations)
              .where(
                and(
                  eq(conversations.buyerId, buyerId),
                  eq(conversations.sellerId, sellerId),
                ),
              )
          )[0];
        },
        messageByNonce: async (senderId, nonce) =>
          (
            await t
              .select()
              .from(messages)
              .where(
                and(eq(messages.senderId, senderId), eq(messages.nonce, nonce)),
              )
          )[0],
        saveMessage: async (m) => {
          await t.insert(messages).values(m);
        },
      };
      return work(tx);
    }),
};
