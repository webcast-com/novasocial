import { db } from "@/db";
import {
  users,
  activityRules,
  posts,
  comments,
  reactions,
  shares,
  referrals,
  activityLogs,
  rewards,
  userRewards,
  chatGroups,
  chatMessages,
  quests,
  flashEvents,
} from "@/db/schema";
import { count } from "drizzle-orm";

export async function ensureSeeded() {
  try {
    const rulesCount = await db.select({ value: count() }).from(activityRules);
    if ((rulesCount[0]?.value ?? 0) > 0) {
      await ensureNewFeaturesSeeded();
      return { seeded: false, message: "Database already seeded (new features verified)." };
    }
  } catch (err) {
    console.error("Error checking seeded state:", err);
    return { seeded: false, error: String(err) };
  }

  // 1. Insert activity rules
  await db.insert(activityRules).values([
    {
      actionType: "post_created",
      name: "Publish Community Post",
      description: "Earn points every time you create a new topic, show and tell, or question in the feed.",
      points: 50,
      dailyCap: 250,
      iconName: "FileText",
      isActive: true,
    },
    {
      actionType: "comment_created",
      name: "Write Insightful Comment",
      description: "Contribute meaningfully to community posts by sharing feedback and answers.",
      points: 25,
      dailyCap: 150,
      iconName: "MessageSquare",
      isActive: true,
    },
    {
      actionType: "reaction_given",
      name: "React to Content",
      description: "Give community appreciation (Likes, Loves, Celebrates, Fire) to fellow members.",
      points: 10,
      dailyCap: 50,
      iconName: "Heart",
      isActive: true,
    },
    {
      actionType: "post_shared",
      name: "Share Community Post",
      description: "Share interesting posts via copy link or to external social channels to drive engagement.",
      points: 30,
      dailyCap: 90,
      iconName: "Share2",
      isActive: true,
    },
    {
      actionType: "referral_successful",
      name: "Successful Member Referral",
      description: "Invite colleagues or friends with your personal affiliate referral link when they sign up.",
      points: 200,
      dailyCap: null,
      iconName: "UserPlus",
      isActive: true,
    },
    {
      actionType: "daily_login",
      name: "Daily Pulse Check-In",
      description: "Check in once per day to maintain your loyalty streak and score easy activity points.",
      points: 15,
      dailyCap: 15,
      iconName: "Flame",
      isActive: true,
    },
  ]);

  // 2. Insert Users
  const insertedUsers = await db.insert(users).values([
    {
      name: "Elena Rostova",
      username: "elena_tech",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      role: "user",
      referralCode: "ELENA_PULSE_2026",
      totalPoints: 1680,
      currentLevel: "Community Champion",
      bio: "Open Source Contributor & AI Geek. Loving the vibes here!",
      location: "Berlin, Germany",
      gender: "female",
    },
    {
      name: "Marcus Vance",
      username: "marcus_dev",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      role: "user",
      referralCode: "MARCUS_V_DEV",
      totalPoints: 920,
      currentLevel: "Rising Star",
      bio: "Product designer and frontend builder. Constantly seeking elegant solutions.",
      location: "Austin, Texas, USA",
      gender: "male",
    },
    {
      name: "Priya Patel",
      username: "priya_pulse",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: "user",
      referralCode: "PRIYA_DEV_88",
      totalPoints: 460,
      currentLevel: "Contributor",
      bio: "Cloud infrastructure developer and aspiring game creator.",
      location: "Mumbai, India",
      gender: "female",
    },
    {
      name: "Devon Walker",
      username: "devon_w",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      role: "user",
      referralCode: "DEVON_NEW",
      totalPoints: 190,
      currentLevel: "Novice",
      bio: "New to VibePulse! Exploring all the cool gamified features.",
      location: "Toronto, Canada",
      gender: "male",
    },
    {
      name: "Maya Sterling (Admin)",
      username: "admin_maya",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      role: "admin",
      referralCode: "MAYA_ADMIN_VIP",
      totalPoints: 3450,
      currentLevel: "Pulse Grandmaster",
      bio: "Head of Gamified Experience & Community Operations. Admin Sandbox Lead.",
      location: "London, United Kingdom",
      gender: "female",
    },
  ]).returning();

  const elena = insertedUsers[0];
  const marcus = insertedUsers[1];
  const priya = insertedUsers[2];
  const devon = insertedUsers[3];
  const maya = insertedUsers[4];

  // 3. Insert sample posts
  const insertedPosts = await db.insert(posts).values([
    {
      userId: elena.id,
      authorName: elena.name,
      authorUsername: elena.username,
      authorAvatar: elena.avatarUrl,
      title: "Why activity points create higher sustained engagement than one-off badges",
      content: "When users can physically watch their points ticker rise after leaving constructive feedback or sharing a post, the reward loop becomes intrinsic! In our test group, daily logins soared by 68%. What incentives keep you active in online platforms?",
      category: "Ideas",
      reactionsCount: 12,
      commentsCount: 3,
      sharesCount: 5,
    },
    {
      userId: marcus.id,
      authorName: marcus.name,
      authorUsername: marcus.username,
      authorAvatar: marcus.avatarUrl,
      title: "Show & Tell: Just created a sleek dark theme customizable loyalty badge grid!",
      content: "I've been playing around with CSS gradients and glassmorphism cards for the user levels. Check out the leaderboard styles and drop a comment if you want me to publish the snippet!",
      category: "Show & Tell",
      reactionsCount: 8,
      commentsCount: 2,
      sharesCount: 3,
    },
    {
      userId: maya.id,
      authorName: maya.name,
      authorUsername: maya.username,
      authorAvatar: maya.avatarUrl,
      title: "🎉 Weekend Special: Referral points doubled to 400 pts!",
      content: "Hey VibePulse family! As an admin experiment this weekend, we are celebrating community growth. Share your personal invitation code with teammates and watch your ranking climb!",
      category: "Announcements",
      reactionsCount: 24,
      commentsCount: 4,
      sharesCount: 9,
    },
    {
      userId: priya.id,
      authorName: priya.name,
      authorUsername: priya.username,
      authorAvatar: priya.avatarUrl,
      title: "Tips on reaching 'Rising Star' status within your first 3 days",
      content: "The secret is engagement math! Make 1 thoughtful post (+50), comment on 4 peers' posts (+100), react to 5 updates (+50), and invite 2 dev buddies (+400). You'll hit Rising Star instantly!",
      category: "Tutorials",
      reactionsCount: 15,
      commentsCount: 2,
      sharesCount: 6,
    },
  ]).returning();

  // 4. Insert sample comments
  await db.insert(comments).values([
    {
      postId: insertedPosts[0].id,
      userId: marcus.id,
      authorName: marcus.name,
      authorUsername: marcus.username,
      authorAvatar: marcus.avatarUrl,
      content: "Totally agree Elena! Instant positive reinforcement + unlocked perks in the rewards store makes it addictive in a good way.",
    },
    {
      postId: insertedPosts[0].id,
      userId: devon.id,
      authorName: devon.name,
      authorUsername: devon.username,
      authorAvatar: devon.avatarUrl,
      content: "As a newcomer, seeing exactly how many points each activity awards really motivates me to participate!",
    },
    {
      postId: insertedPosts[1].id,
      userId: elena.id,
      authorName: elena.name,
      authorUsername: elena.username,
      authorAvatar: elena.avatarUrl,
      content: "Please publish that snippet Marcus, the glassmorphism card looks stunning on hi-DPI screens.",
    },
    {
      postId: insertedPosts[2].id,
      userId: priya.id,
      authorName: priya.name,
      authorUsername: priya.username,
      authorAvatar: priya.avatarUrl,
      content: "Time to message my entire study group and get them signed up via my ref code! 🔥",
    },
  ]);

  // 5. Insert sample reactions
  await db.insert(reactions).values([
    { postId: insertedPosts[0].id, userId: marcus.id, reactionType: "love" },
    { postId: insertedPosts[0].id, userId: priya.id, reactionType: "fire" },
    { postId: insertedPosts[0].id, userId: devon.id, reactionType: "celebrate" },
    { postId: insertedPosts[1].id, userId: elena.id, reactionType: "mindblown" },
    { postId: insertedPosts[2].id, userId: elena.id, reactionType: "love" },
    { postId: insertedPosts[3].id, userId: devon.id, reactionType: "like" },
  ]);

  // 6. Insert sample shares
  await db.insert(shares).values([
    { postId: insertedPosts[0].id, userId: elena.id, platform: "twitter", clicksCount: 14 },
    { postId: insertedPosts[1].id, userId: marcus.id, platform: "linkedin", clicksCount: 8 },
    { postId: insertedPosts[3].id, userId: priya.id, platform: "copy_link", clicksCount: 5 },
  ]);

  // 7. Insert sample referrals
  await db.insert(referrals).values([
    {
      referrerId: elena.id,
      referredUserId: priya.id,
      referredEmail: "priya.p@devmail.com",
      referredName: "Priya Patel",
      status: "completed",
      pointsAwarded: 200,
      completedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    },
    {
      referrerId: elena.id,
      referredUserId: null,
      referredEmail: "jason.mora@enterprise.org",
      referredName: "Jason Mora",
      status: "pending",
      pointsAwarded: 0,
    },
    {
      referrerId: marcus.id,
      referredUserId: devon.id,
      referredEmail: "devon.w@gaming.ai",
      referredName: "Devon Walker",
      status: "completed",
      pointsAwarded: 200,
      completedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
  ]);

  // 8. Insert Activity Logs (rich audit feed)
  await db.insert(activityLogs).values([
    {
      userId: elena.id,
      activityType: "referral_successful",
      title: "Referral Completed",
      description: "Invited Priya Patel via ELENA_PULSE_2026 affiliate code",
      pointsChange: 200,
      createdAt: new Date(Date.now() - 100 * 60000),
    },
    {
      userId: elena.id,
      activityType: "post_created",
      title: "Published Community Post",
      description: "Why activity points create higher sustained engagement...",
      pointsChange: 50,
      createdAt: new Date(Date.now() - 90 * 60000),
    },
    {
      userId: marcus.id,
      activityType: "comment_created",
      title: "Wrote Insightful Comment",
      description: "Commented on Elena Rostova's post about loyalty badges",
      pointsChange: 25,
      createdAt: new Date(Date.now() - 80 * 60000),
    },
    {
      userId: devon.id,
      activityType: "reaction_given",
      title: "Reacted to Post",
      description: "Gave a 'Celebrate' reaction to community update",
      pointsChange: 10,
      createdAt: new Date(Date.now() - 70 * 60000),
    },
    {
      userId: marcus.id,
      activityType: "post_shared",
      title: "Shared Post",
      description: "Shared post to LinkedIn and generated 8 referral clicks",
      pointsChange: 30,
      createdAt: new Date(Date.now() - 60 * 60000),
    },
    {
      userId: elena.id,
      activityType: "daily_login",
      title: "Daily Pulse Check-In",
      description: "Day 5 consecutive active engagement streak bonus!",
      pointsChange: 15,
      createdAt: new Date(Date.now() - 40 * 60000),
    },
    {
      userId: priya.id,
      activityType: "post_created",
      title: "Published Community Post",
      description: "Tips on reaching 'Rising Star' status within your first 3 days",
      pointsChange: 50,
      createdAt: new Date(Date.now() - 25 * 60000),
    },
  ]);

  // 9. Insert Rewards Stock
  const insertedRewards = await db.insert(rewards).values([
    {
      name: "Limited Edition VibePulse Hoodie",
      description: "Premium cotton blend streetwear hoodie with glowing embroidery logo.",
      category: "swag",
      costPoints: 1500,
      imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&auto=format&fit=crop&q=80",
      stock: 42,
      isActive: true,
    },
    {
      name: "$25 Artisan Coffee / Bookstore Voucher",
      description: "Redeemable digital card sent instantly to your profile email.",
      category: "voucher",
      costPoints: 1000,
      imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&auto=format&fit=crop&q=80",
      stock: 120,
      isActive: true,
    },
    {
      name: "VIP Discord Gold Role Badge & Flair",
      description: "Unlocks dedicated VIP lounge voice channels & golden name font.",
      category: "vip",
      costPoints: 500,
      imageUrl: "https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=400&auto=format&fit=crop&q=80",
      stock: 500,
      isActive: true,
    },
    {
      name: "Neon Cybernetic Avatar Frame",
      description: "Equip a dynamic glowing animated border around your avatar across the app.",
      category: "badge",
      costPoints: 350,
      imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80",
      stock: 999,
      isActive: true,
    },
    {
      name: "1-on-1 Strategy Mentorship Call (45m)",
      description: "Private coaching session with senior engineers or design mentors.",
      category: "vip",
      costPoints: 2200,
      imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&auto=format&fit=crop&q=80",
      stock: 10,
      isActive: true,
    },
    {
      name: "1 Month Pro Tier Cloud & Storage Boost",
      description: "Free hosting tier voucher with unmetered API endpoints.",
      category: "voucher",
      costPoints: 800,
      imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
      stock: 75,
      isActive: true,
    },
  ]).returning();

  // 10. Insert Sample User Reward Redemption
  await db.insert(userRewards).values([
    {
      userId: elena.id,
      rewardId: insertedRewards[2].id,
      rewardName: insertedRewards[2].name,
      pointsSpent: 500,
      status: "fulfilled",
      redeemedAt: new Date(Date.now() - 48 * 3600 * 1000),
    }
  ]);

  await ensureNewFeaturesSeeded();

  return { seeded: true, message: "Successfully seeded VibePulse interactive database!" };
}

export async function ensureNewFeaturesSeeded() {
  try {
    // A. Ensure Quests exist
    const qCount = await db.select({ val: count() }).from(quests);
    if ((qCount[0]?.val ?? 0) === 0) {
      await db.insert(quests).values([
        {
          title: "💬 Active Commenter",
          description: "Comment on 3 community posts today to spark constructive discussions.",
          pointsReward: 30,
          targetAction: "comment_created",
          targetCount: 3,
          frequency: "daily",
          iconName: "MessageSquare",
          isActive: true,
        },
        {
          title: "🚀 Social Catalyst",
          description: "Share 1 community post to WhatsApp, X, or Telegram.",
          pointsReward: 50,
          targetAction: "post_shared",
          targetCount: 1,
          frequency: "daily",
          iconName: "Share2",
          isActive: true,
        },
        {
          title: "🔥 Daily Pulse Check-In",
          description: "Check in on VibePulse to keep your multi-day active streak burning.",
          pointsReward: 15,
          targetAction: "daily_login",
          targetCount: 1,
          frequency: "daily",
          iconName: "Flame",
          isActive: true,
        },
        {
          title: "❤️ Community Supporter",
          description: "Give 3 reactions (Like, Love, Celebrate, Fire) to fellow members' updates.",
          pointsReward: 20,
          targetAction: "reaction_given",
          targetCount: 3,
          frequency: "daily",
          iconName: "Heart",
          isActive: true,
        },
      ]);
    }

    // B. Ensure Chat Groups exist
    const cCount = await db.select({ val: count() }).from(chatGroups);
    if ((cCount[0]?.val ?? 0) === 0) {
      const allUsers = await db.select().from(users).limit(5);
      const firstUser = allUsers[0];
      const secondUser = allUsers[1] || firstUser;

      const insertedGroups = await db
        .insert(chatGroups)
        .values([
          {
            name: "💻 Tech & Development",
            description: "Discuss frontend architecture, Next.js App Router, Drizzle ORM, and AI tools.",
            category: "Tech",
            isDirect: false,
            createdById: firstUser?.id || null,
          },
          {
            name: "💡 Ideas & Brainstorming",
            description: "Share feedback on loyalty mechanics, badge designs, and community incentives.",
            category: "Ideas",
            isDirect: false,
            createdById: secondUser?.id || null,
          },
          {
            name: "💬 General Community Lounge",
            description: "Casual conversations, daily check-ins, and networking with fellow builders.",
            category: "General",
            isDirect: false,
            createdById: firstUser?.id || null,
          },
        ])
        .returning();

      if (insertedGroups.length > 0 && firstUser && secondUser) {
        await db.insert(chatMessages).values([
          {
            groupId: insertedGroups[0].id,
            senderId: firstUser.id,
            senderName: firstUser.name,
            senderUsername: firstUser.username,
            senderAvatar: firstUser.avatarUrl,
            content: "Welcome to Tech & Development! What stack is everyone using for real-time gamified features?",
          },
          {
            groupId: insertedGroups[0].id,
            senderId: secondUser.id,
            senderName: secondUser.name,
            senderUsername: secondUser.username,
            senderAvatar: secondUser.avatarUrl,
            content: "Next.js App Router + PostgreSQL + Drizzle ORM is unbeatable for performance and type safety!",
          },
          {
            groupId: insertedGroups[1].id,
            senderId: firstUser.id,
            senderName: firstUser.name,
            senderUsername: firstUser.username,
            senderAvatar: firstUser.avatarUrl,
            content: "Idea: Let's add exponential streak bonuses for 7 consecutive days!",
          },
        ]);
      }
    }

    // C. Ensure Flash Events exist
    const eCount = await db.select({ val: count() }).from(flashEvents);
    if ((eCount[0]?.val ?? 0) === 0) {
      await db.insert(flashEvents).values([
        {
          title: "🎉 WEEKEND 2X HAPPY HOUR",
          description: "All activity points earned from posting, commenting, reacting, and sharing are automatically DOUBLED!",
          multiplier: 2,
          isActive: true,
          bannerText: "⚡ 2X HAPPY HOUR ACTIVE: ALL ACTIVITY POINTS DOUBLED!",
        },
      ]);
    }
  } catch (err) {
    console.error("Error seeding new features:", err);
  }
}
