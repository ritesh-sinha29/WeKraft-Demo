import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
 
  // USERS TABLE
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(), // Clerk user ID for auth
    email: v.string(),
    imageUrl: v.optional(v.string()),
    hasCompletedOnboarding: v.boolean(),
    githubUsername: v.optional(v.string()),
    githubAccessToken: v.optional(v.string()), // Can't store it in db for security reasons.
    last_sign_in: v.optional(v.number()),
    inviteLink: v.optional(v.string()),
    // ✅ PLAN TYPE
    type: v.union(v.literal("free"), v.literal("pro"), v.literal("elite")),
    // ✅ PROJECT LIMIT
    limit: v.union(v.literal(2), v.literal(5), v.literal(15)),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_token", ["tokenIdentifier"]),

  // REPOSITORIES TABLE
  repositories: defineTable({
    githubId: v.float64(), // Changed to float64 to be safe with large GitHub IDs
    name: v.string(),
    owner: v.string(),
    fullName: v.string(),
    url: v.string(),
    // Relation to users table
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_github_id", ["githubId"]),

  // REVIEWS TABLE
  reviews: defineTable({
    // Relation to repositories table
    repositoryId: v.id("repositories"),
    prNumber: v.number(),
    prTitle: v.string(),
    prUrl: v.string(),
    // Large AI-generated review text
    review: v.string(),
    // Review status
    status: v.union(
      v.literal("completed"),
      v.literal("failed"),
      v.literal("pending")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_repository", ["repositoryId"]),

  // PROJECTS TABLE (Updated with Voice OS fields)
  projects: defineTable({
    // Project details
    projectName: v.string(),
    description: v.string(),
    tags: v.array(v.string()), // Validation (2-5 tags) done in mutations
    // Visibility
    isPublic: v.boolean(),
    // Linked repository
    repositoryId: v.id("repositories"),
    repoName: v.string(), // Denormalized for quick access
    repoFullName: v.string(), // e.g., "ronitrai27/Line-Queue-PR-Agent"
    repoOwner: v.string(),
    repoUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    lookingForMembers: v.optional(
      v.array(
        v.object({
          role: v.string(),
          type: v.union(
            v.literal("casual"),
            v.literal("part-time"),
            v.literal("serious")
          ),
        })
      )
    ),
    // Project owner (creator)
    ownerId: v.id("users"),
    about: v.optional(v.string()),
    // Community engagement details
    projectStars: v.optional(v.number()),
    projectForks: v.optional(v.number()),
    projectUpvotes: v.optional(v.number()),

    // HEALTH SCORES (Existing Logic)
    healthScore: v.optional(
      v.object({
        totalScore: v.number(), // 0–100
        activityMomentum: v.number(), // 0–35
        maintenanceQuality: v.number(), // 0–35
        communityTrust: v.number(), // 0–20
        freshness: v.number(), // 0–10
        lastCalculatedDate: v.string(), // YYYY-MM-DD
        previousScores: v.array(
          v.object({
            totalScore: v.number(),
            calculatedDate: v.string(),
          })
        ),
      })
    ),

    // --- 🆕 NEW FIELDS FOR VOICE OS ---
    // Tracks budget for "Budget Agent"
    budget: v.optional(
      v.object({
        total: v.number(),
        spent: v.number(),
        currency: v.string(),
        lastUpdated: v.number(),
      })
    ),

    // Tracks deadlines for "Timeline Agent"
    timeline: v.optional(
      v.object({
        startDate: v.number(),
        deadline: v.number(),
        milestones: v.array(
          v.object({
            title: v.string(),
            date: v.number(),
            isCompleted: v.boolean(),
          })
        ),
      })
    ),

    status: v.optional(
      v.union(
        v.literal("planning"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed")
      )
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_repository", ["repositoryId"])
    .index("by_public", ["isPublic"]),

  // UI/UX STUDIO TABLES
  uiFrames: defineTable({
    projectId: v.id("projects"),
    frameId: v.string(), // UUID for client-side routing
    frameName: v.string(), // User-provided name for the frame
    designCode: v.string(), // HTML/Tailwind code
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_frame_id", ["frameId"])
    .index("by_user", ["userId"]),

  uiChats: defineTable({
    frameId: v.string(), // References uiFrames.frameId
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_frame", ["frameId"]),

  // ==========================================================================
  // TABLES FOR VOICE OS AGENTS
  // ==========================================================================

  // 1. TASKS (Core unit of work for Task Agent)
  tasks: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    assignedTo: v.optional(v.id("users")), // Can be null (unassigned)
    createdBy: v.id("users"),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_assignee", ["assignedTo"])
    .index("by_status", ["status"]),

  // 2. PROJECT MEMBERS (For Team Agent to check "Who is available?")
  projectMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_project_and_user", ["projectId", "userId"]),

  // 3. VOICE CONVERSATIONS (Permanent History & Context)
  voiceConversations: defineTable({
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    sessionId: v.string(), // Maps to Redis session ID
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    summary: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),

  // 4. VOICE MESSAGES (Transcript & Actions)
  voiceMessages: defineTable({
    conversationId: v.id("voiceConversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    text: v.string(),
    // Tracks what the AI actually *did* (e.g., "Create Task", "Navigation")
    actionTaken: v.optional(
      v.object({
        type: v.string(),
        status: v.union(v.literal("success"), v.literal("failed")),
        data: v.any(),
      })
    ),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),
});