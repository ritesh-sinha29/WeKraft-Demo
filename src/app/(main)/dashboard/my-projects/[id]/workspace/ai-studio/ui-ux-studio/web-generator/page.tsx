"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  Brain,
  Link as LinkIcon,
  Loader2,
  Download,
  Copy,
  Save,
  Monitor,
  Smartphone,
  Code,
  Eye,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Id } from "@convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useSidebar } from "@/components/ui/sidebar";

// Types
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const UIUXStudio = () => {
  const params = useParams();
  const projectId = params.id as Id<"projects">;
  
  // State
  const { setOpen } = useSidebar();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [designCode, setDesignCode] = useState("");
  const [selectedScreen, setSelectedScreen] = useState<"web" | "mobile">("web");
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-hide sidebar on mount
  useEffect(() => {
    setOpen(false);
  }, []);

  // Get frameId from URL params
  const searchParams = useSearchParams();
  const urlFrameId = searchParams.get("frameId");

  // Convex queries and mutations
  const user = useQuery(api.users.getCurrentUser);
  const project = useQuery(api.projects.getProjectById, { projectId });
  const frames = useQuery(api.uiStudio.getFrames, { projectId });
  const frame = useQuery(
    api.uiStudio.getFrame,
    urlFrameId ? { frameId: urlFrameId } : "skip"
  );
  const chatHistory = useQuery(
    api.uiStudio.getChatHistory,
    urlFrameId ? { frameId: urlFrameId } : "skip"
  );
  const createFrame = useMutation(api.uiStudio.createFrame);
  const updateFrame = useMutation(api.uiStudio.updateFrame);
  const saveChat = useMutation(api.uiStudio.saveChat);

  // Auto-load saved design from database
  useEffect(() => {
    if (frame && urlFrameId) {
      setCurrentFrameId(urlFrameId);
      setDesignCode(frame.designCode || "");
    }
  }, [frame, urlFrameId]);

  // Auto-load chat history from database
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      const loadedMessages: ChatMessage[] = chatHistory.map((chat, index) => ({
        id: `${chat._id}-${index}`,
        role: chat.role,
        content: chat.content,
      }));
      setMessages(loadedMessages);
    }
  }, [chatHistory]);

  // Detect URL in input
  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = input.match(urlRegex);
    if (match && match[0]) {
      setDetectedUrl(match[0]);
    } else {
      setDetectedUrl(null);
    }
  }, [input]);

  // Handle URL Scraping
  const handleScrapeUrl = async () => {
    if (!detectedUrl || !user) return;

    try {
      setIsScrapingUrl(true);
      
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: `Recreate this website: ${detectedUrl}`,
      };
      setMessages(prev => [...prev, userMessage]);

      toast.loading("🎯 Processing website...", { id: "scrape" });

      // Call backend API
      const response = await fetch("/api/ui-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scrape",
          url: detectedUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process website");
      }

      toast.dismiss("scrape");
      toast.success("✨ Generating code...");

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let lastCodeLength = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          accumulatedText += chunk;

          // Extract HTML code
          const match = accumulatedText.match(/```html\n([\s\S]*?)(```|$)/);
          if (match && match[1]) {
            const codeLength = match[1].length;
            if (codeLength > lastCodeLength) {
              setDesignCode(match[1]);
              lastCodeLength = codeLength;
            }
          }
        }
      }

      // Add assistant message
      if (lastCodeLength > 0) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `✅ I've analyzed ${detectedUrl} and generated ${lastCodeLength} characters of pixel-perfect HTML/Tailwind code. The recreation is now displaying in the preview panel.`,
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Save chat to Convex
        if (currentFrameId) {
          await saveChat({
            frameId: currentFrameId,
            role: "user",
            content: userMessage.content,
            
          });
          await saveChat({
            frameId: currentFrameId,
            role: "assistant",
            content: assistantMessage.content,
          });
        }

        toast.success("🎨 Website recreated!");
      } else {
        toast.error("⚠️ No code generated");
      }

      setInput("");
      setDetectedUrl(null);
    } catch (error: any) {
      console.error("💥 Error:", error);
      toast.error(error.message || "Failed to process website");
    } finally {
      setIsScrapingUrl(false);
      toast.dismiss("scrape");
    }
  };

  // Handle AI Generation
  const handleSendMessage = async () => {
    if (!input.trim() || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/ui-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let assistantMessageId = (Date.now() + 1).toString();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          accumulatedText += chunk;

          // Update assistant message in real-time
          setMessages(prev => {
            const filtered = prev.filter(m => m.id !== assistantMessageId);
            return [
              ...filtered,
              {
                id: assistantMessageId,
                role: "assistant",
                content: accumulatedText,
              },
            ];
          });

          // Extract code
          const match = accumulatedText.match(/```html\n([\s\S]*?)(```|$)/);
          if (match && match[1]) {
            setDesignCode(match[1]);
          }
        }
      }

      // Save to Convex
      if (currentFrameId) {
        await saveChat({
          frameId: currentFrameId,
          role: "user",
          content: userMessage.content,
        });
        await saveChat({
          frameId: currentFrameId,
          role: "assistant",
          content: accumulatedText,
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate");
    } finally {
      setIsGenerating(false);
    }
  };

  // Save current frame
  const handleSaveFrame = async () => {
    if (!designCode || !user) {
      toast.error("No design to save");
      return;
    }

    try {
      if (currentFrameId) {
        // Update existing frame
        await updateFrame({
          frameId: currentFrameId,
          designCode,
        });
        toast.success("✅ Design updated!");
      } else {
        // Create new frame
        const frameId = `frame-${Date.now()}`;
        await createFrame({
          projectId,
          frameId,
          frameName: `New Design ${new Date().toLocaleTimeString()}`,
          designCode,
        });
        setCurrentFrameId(frameId);
        toast.success("✅ Design saved!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  // Download as React Component
  const handleDownload = () => {
    if (!designCode) {
      toast.error("No design to download");
      return;
    }

    // Convert HTML to JSX
    let jsxCode = designCode
      // Convert class to className
      .replace(/class=/g, "className=")
      // Convert style strings to objects (basic conversion)
      .replace(/style="([^"]*)"/g, (match, styleString) => {
        const styleObj = styleString
          .split(";")
          .filter((s: string) => s.trim())
          .map((s: string) => {
            const [key, value] = s.split(":").map((p: string) => p.trim());
            const camelKey = key.replace(/-([a-z])/g, (g: string) => g[1].toUpperCase());
            return `${camelKey}: "${value}"`;
          })
          .join(", ");
        return `style={{${styleObj}}}`;
      })
      // Convert boolean attributes
      .replace(/\s(disabled|checked|selected|readonly|required)(?==)/g, " $1={true}")
      // Convert self-closing tags
      .replace(/<(img|br|hr|input|meta|link)([^>]*?)>/g, "<$1$2 />")
      // Convert for to htmlFor
      .replace(/for=/g, "htmlFor=");

    const reactComponent = `import React from 'react';

export default function GeneratedComponent() {
  return (
    <>
${jsxCode}
    </>
  );
}

// NOTE: To use this component, you need to install Tailwind CSS:
// npm install -D tailwindcss postcss autoprefixer
// npx tailwindcss init -p
//
// Add to tailwind.config.js:
// content: ["./src/**/*.{js,jsx,ts,tsx}"]
//
// Add to your CSS file:
// @tailwind base;
// @tailwind components;
// @tailwind utilities;
//
// Optional: Install Flowbite for additional components
// npm install flowbite flowbite-react
`;

    const blob = new Blob([reactComponent], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Component-${Date.now()}.jsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("📥 React Component Downloaded!");
  };

  // Copy code
  const handleCopyCode = async () => {
    if (!designCode) {
      toast.error("No code to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(designCode);
      toast.success("📋 Code copied!");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  // Open Full View
  const handleFullView = () => {
    if (!designCode) {
      toast.error("No design to view");
      return;
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Full Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
</head>
<body class="bg-gray-50">
${designCode}
<script src="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.js"></script>
</body>
</html>`;

    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(fullHtml);
      newWindow.document.close();
    } else {
      toast.error("Pop-up blocked");
    }
  };

  // Full HTML for iframe
  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
    <style>
      body { margin: 0; padding: 0; min-height: 100vh; }
      .hover-outline { outline: 2px dotted #3b82f6 !important; outline-offset: -2px !important; }
      .selected-outline { outline: 2px solid #ef4444 !important; outline-offset: -2px !important; }
    </style>
</head>
<body class="bg-gray-50">
${designCode}
</body>
</html>
`;

  // Interactive iframe editing
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !designCode) return;

    const handleIframeLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc || !doc.body) return;

      let hoverEl: HTMLElement | null = null;
      let selectedEl: HTMLElement | null = null;

      const handleMouseOver = (e: MouseEvent) => {
        if (selectedEl) return;
        const target = e.target as HTMLElement;
        if (target === doc.body || target === doc.documentElement) return;

        if (hoverEl && hoverEl !== target) {
          hoverEl.classList.remove("hover-outline");
        }
        hoverEl = target;
        hoverEl.classList.add("hover-outline");
      };

      const handleMouseOut = () => {
        if (selectedEl) return;
        if (hoverEl) {
          hoverEl.classList.remove("hover-outline");
          hoverEl = null;
        }
      };

      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target === doc.body || target === doc.documentElement) return;

        e.preventDefault();
        e.stopPropagation();

        if (selectedEl && selectedEl !== target) {
          selectedEl.classList.remove("selected-outline");
          selectedEl.removeAttribute("contenteditable");
        }

        selectedEl = target;
        selectedEl.classList.add("selected-outline");
        selectedEl.setAttribute("contenteditable", "true");
        selectedEl.focus();
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && selectedEl) {
          selectedEl.classList.remove("selected-outline");
          selectedEl.removeAttribute("contenteditable");
          selectedEl = null;
        }
      };

      doc.body.addEventListener("mouseover", handleMouseOver);
      doc.body.addEventListener("mouseout", handleMouseOut);
      doc.body.addEventListener("click", handleClick);
      doc.addEventListener("keydown", handleKeyDown);

      return () => {
        doc.body.removeEventListener("mouseover", handleMouseOver);
        doc.body.removeEventListener("mouseout", handleMouseOut);
        doc.body.removeEventListener("click", handleClick);
        doc.removeEventListener("keydown", handleKeyDown);
      };
    };

    iframe.addEventListener("load", handleIframeLoad);
    if (iframe.contentDocument?.readyState === "complete") {
      handleIframeLoad();
    }

    return () => {
      iframe.removeEventListener("load", handleIframeLoad);
    };
  }, [designCode]);

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col bg-background">
      {/* Top Toolbar */}
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/my-projects/${projectId}/workspace`}>
            <Button variant="ghost" size="sm" className="text-xs">
              <ChevronLeft className="h-4 w-4" />
              Back to Workspace
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold">UI/UX Studio</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullView}
            disabled={!designCode}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Full View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            disabled={!designCode}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Code
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!designCode}
          >
            <Download className="h-4 w-4 mr-2" />
            Download as React
          </Button>
          <Button
            size="sm"
            onClick={handleSaveFrame}
            disabled={!designCode}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Design
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div className="w-[400px] border-r bg-muted/30 flex flex-col h-full">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {isGenerating && (
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p>AI is generating your design...</p>
              </div>
            )}
            {isScrapingUrl && (
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-4 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p>Processing website...</p>
              </div>
            )}

            <Conversation>
              <ConversationContent>
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    icon={<MessageSquare className="size-12" />}
                    title="Start Creating"
                    description="Describe your UI or paste a URL to recreate a website"
                  />
                ) : (
                  messages.map((message) => (
                    <Message
                      from={message.role as "user" | "assistant"}
                      key={message.id}
                    >
                      <MessageContent>
                        <MessageResponse>{message.content}</MessageResponse>
                      </MessageContent>
                    </Message>
                  ))
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-background shadow-lg flex-shrink-0">
            {detectedUrl && (
              <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                  <LinkIcon className="w-4 h-4" />
                  <span className="font-medium">URL detected:</span>
                  <span className="truncate max-w-[200px]">{detectedUrl}</span>
                </div>
                <Button
                  size="sm"
                  onClick={handleScrapeUrl}
                  disabled={isScrapingUrl}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isScrapingUrl ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Recreate"
                  )}
                </Button>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="resize-none min-h-[40px] flex-1 border-2 focus:border-blue-500"
                placeholder="Describe your UI or paste a URL to clone..."
                rows={2}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isGenerating}
                size="icon"
                className="h-[40px] w-[40px] bg-blue-600 hover:bg-blue-700 flex-shrink-0"
              >
                <Brain className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col bg-background min-h-0">
          {/* Preview Toolbar */}
          <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30 flex-shrink-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-[200px] grid-cols-2">
                <TabsTrigger value="preview" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="text-xs">
                  <Code className="h-3 w-3 mr-1" />
                  Code
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button
                variant={selectedScreen === "web" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedScreen("web")}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedScreen === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedScreen("mobile")}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-900 p-4">
            {activeTab === "preview" ? (
              designCode ? (
                <motion.div
                  className={`h-full transition-all duration-500 ease-in-out bg-white dark:bg-neutral-800 overflow-hidden
                    ${
                      selectedScreen === "web"
                        ? "w-full mx-auto"
                        : "w-[375px] mx-auto ring-4 ring-neutral-800 rounded-2xl"
                    }`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full border-none"
                    srcDoc={fullHtml}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                    title="UI Preview"
                  />
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                  <Brain className="w-12 h-12" />
                  <p className="text-sm font-medium">
                    Your design will appear here...
                  </p>
                  <p className="text-xs text-center max-w-md">
                    Start chatting to generate UI, or paste a URL to clone a website
                  </p>
                </div>
              )
            ) : (
              <div className="bg-neutral-900 text-white p-4 rounded-lg h-full overflow-auto">
                <pre className="text-xs font-mono">
                  <code>{designCode || "// No code generated yet"}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIUXStudio;