import { db } from "@/db";
import { notifications } from "@/db/schema";
import { publish } from "@/lib/realtime";

export interface CreateNotificationInput {
  userId: number; // recipient
  type: string;
  title: string;
  message: string;
  actorId?: number | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  entityId?: number | null;
  iconEmoji?: string;
}

// Persist a notification and broadcast it to the recipient's live streams.
export async function createNotification(input: CreateNotificationInput) {
  try {
    // Do not notify yourself about your own actions.
    if (input.actorId && input.actorId === input.userId) {
      return null;
    }

    const inserted = await db
      .insert(notifications)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        actorAvatar: input.actorAvatar ?? null,
        entityId: input.entityId ?? null,
        iconEmoji: input.iconEmoji ?? "🔔",
        isRead: false,
        createdAt: new Date(),
      })
      .returning();

    const notification = inserted[0];

    publish({
      type: "notification",
      targetUserId: input.userId,
      payload: notification,
    });

    return notification;
  } catch (err) {
    console.error("createNotification error:", err);
    return null;
  }
}
