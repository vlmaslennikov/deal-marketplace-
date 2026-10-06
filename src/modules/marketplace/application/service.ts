import type { MarketplaceStore } from "../domain/model";
import {
  assertActive,
  assertContact,
  assertPublish,
  assertTransition,
  DomainError,
} from "../domain/policies";
import { commandInput } from "./validation";
export class MarketplaceService {
  constructor(private store: MarketplaceStore) {}
  async execute(actorId: string, raw: unknown): Promise<{ id: string }> {
    const c = commandInput.parse(raw);
    return this.store.transaction(async (tx) => {
      const convo =
        c.type === "message"
          ? await tx.conversation(c.conversationId)
          : undefined;
      if (
        c.type === "message" &&
        (!convo || ![convo.buyerId, convo.sellerId].includes(actorId))
      )
        throw new DomainError("Conversation not found.", 404);
      const users = await tx.lockUsers([
        actorId,
        ...("targetId" in c ? [c.targetId] : []),
        ...(convo ? [convo.buyerId, convo.sellerId] : []),
      ]);
      const actor = users.find((u) => u.id === actorId);
      if (!actor) throw new DomainError("Please sign in.", 401);
      assertActive(actor);
      if (c.type === "profile") {
        if (actor.role === "MANAGER")
          throw new DomainError(
            "Managers do not have acquisition profiles.",
            403,
          );
        await tx.saveProfile({ ...c.data, userId: actor.id });
        return { id: actor.id };
      }
      if (c.type === "saveAsset" || c.type === "archiveAsset") {
        if (actor.role !== "SELLER")
          throw new DomainError("Only sellers can manage listings.", 403);
        const existing = c.id ? await tx.asset(c.id) : undefined;
        if (c.id && (!existing || existing.sellerId !== actor.id))
          throw new DomainError("Asset not found.", 404);
        if (existing?.status === "ARCHIVED")
          throw new DomainError("Archived listings cannot be changed.");
        if (c.type === "archiveAsset") {
          await tx.saveAsset({ ...existing!, status: "ARCHIVED" });
          return { id: c.id };
        }
        const a = {
          ...c.data,
          id: existing?.id ?? crypto.randomUUID(),
          sellerId: actor.id,
          status: existing?.status ?? ("DRAFT" as const),
          createdAt: existing?.createdAt ?? new Date(),
          updatedAt: new Date(),
        };
        if (c.publish || a.status === "PUBLISHED") {
          assertPublish(actor, a);
          a.status = "PUBLISHED";
        }
        await tx.saveAsset(a);
        return { id: a.id };
      }
      const target =
        "targetId" in c ? users.find((u) => u.id === c.targetId) : undefined;
      if (c.type === "moderate") {
        if (actor.role !== "MANAGER")
          throw new DomainError("Manager access required.", 403);
        if (!target || target.role === "MANAGER" || target.id === actor.id)
          throw new DomainError("This participant cannot be moderated.", 403);
        assertTransition(target.status, c.status);
        await tx.moderate(actor.id, target.id, c.status, c.reason);
        return { id: target.id };
      }
      let conversation = convo;
      if (c.type === "contact") {
        if (!target) throw new DomainError("Participant not found.", 404);
        assertContact(actor, target);
        if (c.assetId) {
          const a = await tx.asset(c.assetId);
          const seller = actor.role === "SELLER" ? actor : target;
          if (!a || a.sellerId !== seller.id || a.status !== "PUBLISHED")
            throw new DomainError("Published asset not found.", 404);
        }
        conversation = await tx.ensureConversation(
          actor.role === "BUYER" ? actor.id : target.id,
          actor.role === "SELLER" ? actor.id : target.id,
          c.assetId ?? null,
        );
      } else {
        const other = users.find((u) => u.id !== actor.id);
        if (!other) throw new DomainError("Participant not found.", 404);
        assertContact(actor, other);
      }
      const retry = await tx.messageByNonce(actor.id, c.nonce);
      if (retry) {
        if (retry.conversationId !== conversation!.id || retry.body !== c.body)
          throw new DomainError(
            "This request was already used for a different message.",
            409,
          );
        return { id: conversation!.id };
      }
      await tx.saveMessage({
        id: crypto.randomUUID(),
        conversationId: conversation!.id,
        senderId: actor.id,
        body: c.body,
        nonce: c.nonce,
        createdAt: new Date(),
      });
      return { id: conversation!.id };
    });
  }
}
