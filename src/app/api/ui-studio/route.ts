import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, url, messages } = body;

    // ============================================
    // ACTION 1: URL SCRAPING & RECREATION
    // ============================================
    if (action === "scrape") {
      if (!url) {
        return NextResponse.json({ error: "URL required" }, { status: 400 });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }

      if (!process.env.SCREENSHOTONE_API_KEY) {
        return NextResponse.json(
          { error: "Screenshot API not configured" },
          { status: 500 }
        );
      }

      console.log("📸 Taking screenshot of:", url);

      // Take high-quality screenshot with ScreenshotOne
      const screenshotParams = new URLSearchParams({
        access_key: process.env.SCREENSHOTONE_API_KEY,
        url: url,
        viewport_width: "1920",
        viewport_height: "1080",
        device_scale_factor: "2", // Retina quality
        format: "png",
        full_page: "true",
        block_ads: "true",
        block_cookie_banners: "true",
        block_trackers: "true",
        cache: "false",
      });

      const screenshotUrl = `https://api.screenshotone.com/take?${screenshotParams.toString()}`;

      const screenshotResponse = await fetch(screenshotUrl);

      if (!screenshotResponse.ok) {
        const errorText = await screenshotResponse.text();
        console.error("❌ Screenshot failed:", screenshotResponse.status, errorText);
        return NextResponse.json(
          { error: `Failed to capture screenshot: ${errorText}` },
          { status: 500 }
        );
      }

      // Convert to base64
      const imageBuffer = await screenshotResponse.arrayBuffer();
      const base64Screenshot = Buffer.from(imageBuffer).toString("base64");

      console.log("✅ Screenshot captured, length:", base64Screenshot.length);

      // Send to Gemini Vision for pixel-perfect recreation
      console.log("🧠 Analyzing with Gemini Vision...");

      const result = streamText({
      model: google('gemini-3-pro-preview'),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an EXPERT frontend developer with PHOTOGRAPHIC ATTENTION TO DETAIL. Analyze this HIGH-RESOLUTION screenshot and recreate it with 99% VISUAL ACCURACY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CRITICAL MISSION: PIXEL-PERFECT RECREATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Original URL:** ${url}
**Screenshot Quality:** High-resolution (1920x1080 @2x Retina)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔬 DETAILED VISUAL ANALYSIS REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. COLOR EXTRACTION (CRITICAL):**
   - Primary brand color (hex code): Examine buttons, links, accents
   - Secondary colors: Headers, backgrounds, highlights
   - Text colors: Body text, headings, muted text (exact hex)
   - Background colors: Main bg, section backgrounds, cards
   - Gradient colors: Start color, end color, direction
   - Border colors: Dividers, card borders
   - Shadow colors: Box shadows, text shadows

**2. TYPOGRAPHY PRECISION:**
   - Font families: Sans-serif, serif, monospace
   - Heading sizes: H1 (text-6xl?), H2 (text-4xl?), H3 (text-2xl?)
   - Body text size: text-base, text-lg?
   - Font weights: Light (300), Normal (400), Medium (500), Bold (700)
   - Line heights: Tight, normal, relaxed
   - Letter spacing: Tracking values

**3. LAYOUT STRUCTURE:**
   - Container max-width: max-w-7xl, max-w-6xl?
   - Section padding: py-16, py-20, py-24?
   - Grid columns: grid-cols-2, grid-cols-3, grid-cols-4?
   - Flex layouts: justify-between, items-center
   - Gap spacing: gap-4, gap-8, gap-12?

**4. SPACING SYSTEM:**
   - Margins: mt-8, mb-12, my-16
   - Paddings: p-6, px-8, py-10
   - Gaps: gap-4, gap-x-6, gap-y-8
   - Consistent spacing scale: 4px, 8px, 12px, 16px, 24px

**5. VISUAL EFFECTS:**
   - Border radius: rounded-lg, rounded-xl, rounded-2xl
   - Box shadows: shadow-sm, shadow-md, shadow-lg, shadow-xl
   - Hover effects: hover:bg-*, hover:scale-105
   - Transitions: transition-all, duration-300
   - Opacity: text-opacity-*, bg-opacity-*

**6. COMPONENT STYLES:**
   - Button styles: Size, padding, radius, shadow, hover state
   - Card styles: Background, border, shadow, padding
   - Form inputs: Border, focus ring, placeholder color
   - Icons: Size, color, positioning

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ IMPLEMENTATION REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**MANDATORY RULES:**
✅ Extract EXACT hex colors from screenshot - no guessing!
✅ Match font sizes PRECISELY using Tailwind classes
✅ Replicate spacing with EXACT Tailwind values
✅ Copy layout structure IDENTICALLY
✅ Use Tailwind CSS EXCLUSIVELY for all styling
✅ Include Flowbite components where they match the design
✅ Make fully responsive (mobile-first approach)
✅ Add smooth hover effects and transitions
✅ Use semantic HTML5 elements
✅ Output ONLY complete HTML document
✅ Wrap ALL code in \`\`\`html blocks

**TECHNICAL STACK:**
- Tailwind CSS v3 (CDN: https://cdn.tailwindcss.com)
- Flowbite UI v2.3.0 (CDN)
- FontAwesome v6.5.2 (CDN)
- Smooth animations (transition-all duration-300)

**COLOR USAGE:**
If you detect a specific brand color (e.g., purple #7C3AED, blue #3B82F6):
- Use it consistently throughout
- Apply to buttons, links, accents, borders
- Use lighter/darker variants for hover states

**PLACEHOLDER IMAGES:**
Use: https://placehold.co/WIDTHxHEIGHT/BGCOLOR/TEXTCOLOR?text=Description
Example: https://placehold.co/800x600/7C3AED/FFFFFF?text=Hero+Image

**OUTPUT FORMAT:**
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recreated Page</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
</head>
<body>
    [Your pixel-perfect HTML here]
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.js"></script>
</body>
</html>
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOW: Study the HIGH-RESOLUTION screenshot with EXTREME ATTENTION TO DETAIL. Extract EXACT colors, fonts, spacing. Generate PIXEL-PERFECT code:`,
            },
            {
              type: "image",
              image: base64Screenshot,
            },
          ],
        },
      ],
    });

    console.log("✅ Streaming pixel-perfect code generation...");

    return result.toTextStreamResponse();

  } 

    // ============================================
    // ACTION 2: AI CODE GENERATION FROM CHAT
    // ============================================
    if (action === "generate") {
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json(
          { error: "Messages array required" },
          { status: 400 }
        );
      }

      console.log("🧠 Generating UI from chat messages...");

      const result = streamText({
        model: google("gemini-3-pro-preview"),
        system: `You are an expert UI/UX designer and frontend developer specializing in Tailwind CSS and modern web design.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 YOUR ROLE: PROFESSIONAL UI DESIGNER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When the user asks you to create UI components, follow these rules:

**1. CODE GENERATION TRIGGERS:**
If user mentions ANY of these keywords, generate HTML code:
- "create", "build", "make", "design", "generate"
- "landing page", "dashboard", "form", "button", "card", "navbar"
- "website", "app", "component", "section", "layout"

**2. OUTPUT FORMAT:**
ALWAYS wrap your code in markdown code blocks:
\`\`\`html
<!-- Your code here -->
\`\`\`

**3. TECHNICAL REQUIREMENTS:**
✅ Use Tailwind CSS ONLY (no custom CSS)
✅ Use Flowbite components for complex UI (modals, dropdowns, tabs)
✅ Use FontAwesome icons: <i class="fa fa-icon-name"></i>
✅ Make it fully responsive (mobile-first)
✅ Add smooth transitions and hover effects
✅ Use modern design patterns (gradients, shadows, rounded corners)
✅ Use blue (#3B82F6) as primary color theme
✅ Only output <body> content (NO <!DOCTYPE>, <html>, or <head>)

**4. DESIGN PRINCIPLES:**
- Clean, modern, professional aesthetics
- Proper spacing (p-4, p-6, p-8 for sections)
- Consistent typography hierarchy
- Accessible color contrast
- Clear visual hierarchy
- Smooth animations (transition-all duration-300)

**5. PLACEHOLDER IMAGES:**
Use: https://placehold.co/WIDTHxHEIGHT/3B82F6/FFFFFF?text=Description
Examples:
- Hero: https://placehold.co/1200x600/3B82F6/FFFFFF?text=Hero+Image
- Avatar: https://placehold.co/100x100/3B82F6/FFFFFF?text=User
- Card: https://placehold.co/400x300/3B82F6/FFFFFF?text=Card+Image

**6. COMPONENT LIBRARY:**
Use Flowbite components for:
- Buttons: Primary (bg-blue-600), Secondary (bg-gray-600)
- Cards: shadow-md, rounded-lg, border
- Forms: Focus rings, validation states
- Modals: backdrop-blur, slide-in animations
- Dropdowns: Hover effects, smooth transitions
- Alerts: Color-coded (success, error, warning, info)
- Tabs: Active state styling
- Accordions: Expand/collapse animations

**7. CONVERSATIONAL MODE:**
If user just greets or asks non-code questions:
- Respond naturally and helpfully
- Don't generate code unless explicitly requested
- Offer to help with UI design tasks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Examples:

User: "Hi"
Response: "Hello! I'm your UI/UX designer. I can help you create beautiful, responsive web components using Tailwind CSS. What would you like to build today?"

User: "Create a landing page hero section"
Response: 
\`\`\`html
<section class="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
  <div class="container mx-auto px-6 py-20">
    <div class="flex flex-col md:flex-row items-center justify-between">
      <div class="md:w-1/2 mb-8 md:mb-0">
        <h1 class="text-5xl font-bold mb-4">Welcome to Our Platform</h1>
        <p class="text-xl mb-6">Build amazing things with our tools</p>
        <button class="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300">
          Get Started
        </button>
      </div>
      <div class="md:w-1/2">
        <img src="https://placehold.co/600x400/3B82F6/FFFFFF?text=Hero+Image" alt="Hero" class="rounded-lg shadow-2xl">
      </div>
    </div>
  </div>
</section>
\`\`\`
`,
        messages: messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      console.log("✅ Streaming AI-generated code...");

      return result.toTextStreamResponse();
    }

    // Unknown action
    return NextResponse.json(
      { error: "Invalid action. Use 'scrape' or 'generate'" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("💥 API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}