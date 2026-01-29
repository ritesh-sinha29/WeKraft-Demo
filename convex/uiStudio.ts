import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================
// GET ALL FRAMES FOR A PROJECT
// ============================================
export const getFrames = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return [];
    }

    // Get all frames for this project
    const frames = await ctx.db
      .query("uiFrames")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc") // Newest first
      .collect();

    return frames;
  },
});

// ============================================
// GET SINGLE FRAME BY FRAME ID
// ============================================
export const getFrame = query({
  args: {
    frameId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const frame = await ctx.db
      .query("uiFrames")
      .withIndex("by_frame_id", (q) => q.eq("frameId", args.frameId))
      .unique();

    return frame;
  },
});

// ============================================
// GET CHAT HISTORY FOR A FRAME
// ============================================
export const getChatHistory = query({
  args: {
    frameId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const chats = await ctx.db
      .query("uiChats")
      .withIndex("by_frame", (q) => q.eq("frameId", args.frameId))
      .order("asc") // Oldest first (chronological order)
      .collect();

    return chats;
  },
});

// ============================================
// CREATE NEW FRAME
// ============================================
export const createFrame = mutation({
  args: {
    projectId: v.id("projects"),
    frameId: v.string(),
    frameName: v.string(),
    designCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify project exists and user has access
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user owns the project
    if (project.ownerId !== user._id) {
      throw new Error("Unauthorized: You don't own this project");
    }

    // Check if frameId already exists
    const existingFrame = await ctx.db
      .query("uiFrames")
      .withIndex("by_frame_id", (q) => q.eq("frameId", args.frameId))
      .unique();

    if (existingFrame) {
      throw new Error("Frame with this ID already exists");
    }

    // Create the frame
    const frameDbId = await ctx.db.insert("uiFrames", {
      projectId: args.projectId,
      frameId: args.frameId,
      frameName: args.frameName,
      designCode: args.designCode,
      userId: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return frameDbId;
  },
});

// ============================================
// UPDATE EXISTING FRAME
// ============================================
export const updateFrame = mutation({
  args: {
    frameId: v.string(),
    designCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Find the frame
    const frame = await ctx.db
      .query("uiFrames")
      .withIndex("by_frame_id", (q) => q.eq("frameId", args.frameId))
      .unique();

    if (!frame) {
      throw new Error("Frame not found");
    }

    // Check if user owns the frame
    if (frame.userId !== user._id) {
      throw new Error("Unauthorized: You don't own this frame");
    }

    // Update the frame
    await ctx.db.patch(frame._id, {
      designCode: args.designCode,
      updatedAt: Date.now(),
    });

    return frame._id;
  },
});

// ============================================
// DELETE FRAME
// ============================================
export const deleteFrame = mutation({
  args: {
    frameId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Find the frame
    const frame = await ctx.db
      .query("uiFrames")
      .withIndex("by_frame_id", (q) => q.eq("frameId", args.frameId))
      .unique();

    if (!frame) {
      throw new Error("Frame not found");
    }

    // Check if user owns the frame
    if (frame.userId !== user._id) {
      throw new Error("Unauthorized: You don't own this frame");
    }

    // Delete all chats for this frame first
    const chats = await ctx.db
      .query("uiChats")
      .withIndex("by_frame", (q) => q.eq("frameId", args.frameId))
      .collect();

    for (const chat of chats) {
      await ctx.db.delete(chat._id);
    }

    // Delete the frame
    await ctx.db.delete(frame._id);

    return { success: true };
  },
});

// ============================================
// SAVE CHAT MESSAGE
// ============================================
export const saveChat = mutation({
  args: {
    frameId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify frame exists and user has access
    const frame = await ctx.db
      .query("uiFrames")
      .withIndex("by_frame_id", (q) => q.eq("frameId", args.frameId))
      .unique();

    if (!frame) {
      throw new Error("Frame not found");
    }

    if (frame.userId !== user._id) {
      throw new Error("Unauthorized: You don't own this frame");
    }

    // Insert chat message
    const chatId = await ctx.db.insert("uiChats", {
      frameId: args.frameId,
      role: args.role,
      content: args.content,
      userId: user._id,
      createdAt: Date.now(),
    });

    return chatId;
  },
});

// ============================================
// GET FRAME COUNT FOR PROJECT (HELPER)
// ============================================
export const getFrameCount = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const frames = await ctx.db
      .query("uiFrames")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return frames.length;
  },
});

// ============================================
// GET USER'S TOTAL FRAME COUNT (HELPER)
// ============================================
export const getUserFrameCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return 0;
    }

    const frames = await ctx.db
      .query("uiFrames")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return frames.length;
  },
});