"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileCode, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";

const UIUXStudioPage = () => {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as Id<"projects">;

  // Convex queries and mutations
  const user = useQuery(api.users.getCurrentUser);
  const project = useQuery(api.projects.getProjectById, { projectId });
  const frames = useQuery(api.uiStudio.getFrames, { projectId });
  const createFrame = useMutation(api.uiStudio.createFrame);
  const deleteFrame = useMutation(api.uiStudio.deleteFrame);

  // State for frame naming dialog
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [newFrameName, setNewFrameName] = useState("");
  
  // State for delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [frameToDelete, setFrameToDelete] = useState<string | null>(null);

  // Open dialog to name frame
  const handleCreateNewDesign = () => {
    setNewFrameName("");
    setShowNameDialog(true);
  };

  // Create frame with name and redirect
  const handleConfirmCreateFrame = async () => {
    if (!user || !newFrameName.trim()) {
      toast.error("Please enter a frame name");
      return;
    }

    try {
      const frameId = `frame-${Date.now()}`;
      await createFrame({
        projectId,
        frameId,
        frameName: newFrameName.trim(),
        designCode: "",
      });

      setShowNameDialog(false);
      toast.success("✨ New design created!");
      router.push(
        `/dashboard/my-projects/${projectId}/workspace/ai-studio/ui-ux-studio/web-generator?frameId=${frameId}`
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to create design");
    }
  };

  // Open existing frame
  const handleOpenFrame = (frameId: string) => {
    router.push(
      `/dashboard/my-projects/${projectId}/workspace/ai-studio/ui-ux-studio/web-generator?frameId=${frameId}`
    );
  };

  // Handle delete frame
  const handleDeleteFrame = async () => {
    if (!frameToDelete) return;

    try {
      await deleteFrame({ frameId: frameToDelete });
      toast.success("🗑️ Frame deleted successfully");
      setShowDeleteDialog(false);
      setFrameToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete frame");
    }
  };

  // Open delete confirmation
  const handleConfirmDelete = (frameId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the frame
    setFrameToDelete(frameId);
    setShowDeleteDialog(true);
  };

  if (!project || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto p-2 md:p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                UI/UX Studio
              </h2>
            </div>
            <Button
              onClick={handleCreateNewDesign}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex gap-2 text-sm font-semibold"
            >
              <Plus className="w-3 h-3" />
              New Design
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
        <div className="max-w-7xl mx-auto p-4 md:p-6">

        {/* Frames Grid */}
        {frames && frames.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {frames.map((frame, index) => (
                  <motion.div
                    key={frame._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleOpenFrame(frame.frameId)}
                    className="group relative cursor-pointer overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5"
                  >
                    {/* Preview */}
                    <div className="aspect-[21/9] w-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center relative overflow-hidden">
                      {frame.designCode ? (
                        <div className="absolute inset-0 scale-[0.25] origin-top-left w-[400%] h-[400%] pointer-events-none select-none overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity">
                          <iframe
                            title={`Preview of ${frame.frameId}`}
                            srcDoc={`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body style="margin:0; overflow:hidden;">${frame.designCode}</body></html>`}
                            className="w-full h-full border-none"
                            scrolling="no"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <FileCode className="w-10 h-10 text-neutral-300 dark:text-neutral-700 transition-transform group-hover:scale-110" />
                          <span className="text-xs font-medium text-neutral-400">
                            No preview
                          </span>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Frame Badge */}
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        Frame
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleConfirmDelete(frame.frameId, e)}
                        className="absolute top-2 left-2 text-red-500 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Delete frame"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-3 flex items-center justify-between bg-white dark:bg-neutral-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                          <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                            {frame.frameName}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {formatDistanceToNow(new Date(frame._creationTime), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-4">
                  <FileCode className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  No designs yet
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2 max-w-sm mx-auto text-base">
                  Start creating beautiful UI designs with AI assistance.
                </p>
                <Button
                  onClick={handleCreateNewDesign}
                  variant="outline"
                  className="mt-6 px-6 py-2.5 rounded-lg border-2 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Design
                </Button>
              </div>
            )}
      </div>

      {/* Frame Naming Dialog */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="sm:max-w-md p-6 gap-5">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold text-neutral-300">
              Name Your Design
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-600 dark:text-neutral-400">
              Enter a name for this frame.
            </DialogDescription>
          </DialogHeader>
          
          <Input
            id="frameName"
            placeholder="Landing Page"
            value={newFrameName}
            onChange={(e) => setNewFrameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFrameName.trim()) {
                handleConfirmCreateFrame();
              }
            }}
            className="h-11"
            autoFocus
          />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNameDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCreateFrame}
              disabled={!newFrameName.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md p-6 gap-5">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold">
              Delete Frame?
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-600 dark:text-neutral-400">
              This will permanently delete the frame and all chat history.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setFrameToDelete(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteFrame}
              variant="destructive"
              className="flex-1"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UIUXStudioPage;
