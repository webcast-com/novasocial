import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  avatarUrl: text("avatar_url"),
  role: text("role").default("user").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  referredById: integer("referred_by_id"),
  totalPoints: integer("total_points").default(0).notNull(),
  currentLevel: text("current_level").default("Novice").notNull(),
  bio: text("bio"),
  location: text("location"),
  gender: text("gender"),
  currentStreak: integer("current_streak").default(1).notNull(),
  maxStreak: integer("max_streak").default(1).notNull(),
  lastCheckinDate: text("last_checkin_date"),
  equippedBadges: text("equipped_badges").default('["🔥 7-Day Streak", "⭐ Pioneer"]').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityRules = pgTable("activity_rules", {
  id: serial("id").primaryKey(),
  actionType: text("action_type").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  points: integer("points").notNull(),
  dailyCap: integer("daily_cap"),
  iconName: text("icon_name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  authorName: text("author_name").notNull(),
  authorUsername: text("author_username").notNull(),
  authorAvatar: text("author_avatar"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("General").notNull(),
  sharesCount: integer("shares_count").default(0).notNull(),
  reactionsCount: integer("reactions_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"), // 'image' | 'video' | 'code' | 'poll' | null
  codeSnippet: text("code_snippet"),
  codeLanguage: text("code_language").default("javascript"),
  pollQuestion: text("poll_question"),
  pollOptions: text("poll_options"), // JSON string array e.g. '["Option A", "Option B", "Option C"]'
  pollVotes: text("poll_votes"), // JSON string record e.g. '{"Option A": 12, "Option B": 5}'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  authorName: text("author_name").notNull(),
  authorUsername: text("author_username").notNull(),
  authorAvatar: text("author_avatar"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  reactionType: text("reaction_type").default("like").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shares = pgTable("shares", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  platform: text("platform").notNull(),
  shareToken: text("share_token"),
  clicksCount: integer("clicks_count").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => users.id).notNull(),
  referredUserId: integer("referred_user_id"),
  referredEmail: text("referred_email").notNull(),
  referredName: text("referred_name"),
  status: text("status").default("pending").notNull(), // 'pending' | 'completed'
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  activityType: text("activity_type").notNull(), // e.g. post_created, comment_created, reaction_given, post_shared, referral_successful, reward_redeemed
  title: text("title").notNull(),
  description: text("description"),
  pointsChange: integer("points_change").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'swag', 'voucher', 'badge', 'vip'
  costPoints: integer("cost_points").notNull(),
  imageUrl: text("image_url"),
  stock: integer("stock").default(100).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const userRewards = pgTable("user_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  rewardId: integer("reward_id").references(() => rewards.id).notNull(),
  rewardName: text("reward_name").notNull(),
  pointsSpent: integer("points_spent").notNull(),
  status: text("status").default("fulfilled").notNull(),
  redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
});

export const chatGroups = pgTable("chat_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("General").notNull(), // 'Tech', 'General', 'Ideas', 'Direct'
  isDirect: boolean("is_direct").default(false).notNull(),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => chatGroups.id, { onDelete: "cascade" }).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  senderName: text("sender_name").notNull(),
  senderUsername: text("sender_username").notNull(),
  senderAvatar: text("sender_avatar"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quests = pgTable("quests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  pointsReward: integer("points_reward").notNull(),
  targetAction: text("target_action").notNull(), // e.g. 'comment_created', 'post_shared', 'daily_login', 'reaction_given'
  targetCount: integer("target_count").default(1).notNull(),
  frequency: text("frequency").default("daily").notNull(), // 'daily' | 'weekly'
  iconName: text("icon_name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const userQuestProgress = pgTable("user_quest_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  questId: integer("quest_id").references(() => quests.id).notNull(),
  currentCount: integer("current_count").default(0).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  isClaimed: boolean("is_claimed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  dateKey: text("date_key").notNull(), // e.g. '2026-03-30'
});

export const flashEvents = pgTable("flash_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  multiplier: integer("multiplier").default(2).notNull(), // 2x or 3x
  isActive: boolean("is_active").default(false).notNull(),
  bannerText: text("banner_text"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(), // recipient
  type: text("type").notNull(), // 'reaction' | 'comment' | 'dm' | 'referral' | 'points' | 'levelup' | 'quest' | 'system'
  title: text("title").notNull(),
  message: text("message").notNull(),
  actorId: integer("actor_id"), // who triggered it (optional)
  actorName: text("actor_name"),
  actorAvatar: text("actor_avatar"),
  entityId: integer("entity_id"), // related post/group/etc id (optional)
  iconEmoji: text("icon_emoji").default("🔔"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
