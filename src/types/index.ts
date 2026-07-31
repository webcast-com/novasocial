export interface TierInfo {
  levelName: string;
  minPoints: number;
  maxPoints: number;
  badgeColor: string;
  icon: string;
  tierNumber: number;
}

export interface User {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  referralCode: string;
  referredById: number | null;
  totalPoints: number;
  currentLevel: string;
  bio: string | null;
  location: string | null;
  gender: string | null;
  currentStreak?: number;
  maxStreak?: number;
  lastCheckinDate?: string | null;
  equippedBadges?: string[];
  createdAt: string;
  rank?: number;
  tierInfo: TierInfo;
}

export interface CommentItem {
  id: number;
  postId: number;
  userId: number;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
  content: string;
  createdAt: string;
}

export interface ReactionItem {
  id: number;
  postId: number;
  userId: number;
  reactionType: string;
  createdAt: string;
}

export interface PostItem {
  id: number;
  userId: number;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
  title: string;
  content: string;
  category: string;
  sharesCount: number;
  reactionsCount: number;
  commentsCount: number;
  createdAt: string;
  commentsList: CommentItem[];
  reactionsList: ReactionItem[];
  reactionsBreakdown: Record<string, number>;
  reactedUserIds: number[];
  mediaUrl?: string | null;
  mediaType?: string | null;
  codeSnippet?: string | null;
  codeLanguage?: string;
  pollQuestion?: string | null;
  pollOptions?: string[];
  pollVotes?: Record<string, number>;
  isBookmarked?: boolean;
}

export interface SocialProfileStats {
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export type IdeaStatus = "open" | "planned" | "in_progress" | "shipped" | "declined";
export type IdeaImpact = "low" | "medium" | "high";

export interface IdeaItem {
  id: number;
  authorId: number;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
  title: string;
  description: string;
  category: string;
  status: IdeaStatus;
  impact: IdeaImpact;
  voteCount: number;
  hasVoted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralItem {
  id: number;
  referrerId: number;
  referredUserId: number | null;
  referredEmail: string;
  referredName: string | null;
  status: "pending" | "completed";
  pointsAwarded: number;
  createdAt: string;
  completedAt?: string | null;
  referrerName?: string;
  referrerUsername?: string;
  referrerCode?: string;
}

export interface ActivityLogItem {
  id: number;
  userId: number;
  activityType: string;
  title: string;
  description: string | null;
  pointsChange: number;
  metadata: string | null;
  createdAt: string;
  userName?: string;
  userHandle?: string;
  userAvatar?: string | null;
}

export interface RewardItem {
  id: number;
  name: string;
  description: string;
  category: string;
  costPoints: number;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
}

export interface UserRedemptionItem {
  id: number;
  userId: number;
  rewardId: number;
  rewardName: string;
  pointsSpent: number;
  status: string;
  redeemedAt: string;
  imageUrl: string | null;
  category: string;
}

export interface ActivityRuleItem {
  id: number;
  actionType: string;
  name: string;
  description: string;
  points: number;
  dailyCap: number | null;
  iconName: string;
  isActive: boolean;
  updatedAt: string;
}

export interface ChatGroupItem {
  id: number;
  name: string;
  description: string | null;
  category: string;
  isDirect: boolean;
  createdById: number | null;
  createdAt: string;
  lastMessage?: string;
  memberCount?: number;
}

export interface ChatMessageItem {
  id: number;
  groupId: number;
  senderId: number;
  senderName: string;
  senderUsername: string;
  senderAvatar: string | null;
  content: string;
  createdAt: string;
}

export interface QuestItem {
  id: number;
  title: string;
  description: string;
  pointsReward: number;
  targetAction: string;
  targetCount: number;
  frequency: string;
  iconName: string;
  isActive: boolean;
}

export interface UserQuestItem {
  id: number;
  userId: number;
  questId: number;
  currentCount: number;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt: string | null;
  dateKey: string;
  quest?: QuestItem;
}

export interface FlashEventItem {
  id: number;
  title: string;
  description: string;
  multiplier: number;
  isActive: boolean;
  bannerText: string | null;
  updatedAt: string;
}

export interface NotificationItem {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  actorId: number | null;
  actorName: string | null;
  actorAvatar: string | null;
  entityId: number | null;
  iconEmoji: string | null;
  isRead: boolean;
  createdAt: string;
}
