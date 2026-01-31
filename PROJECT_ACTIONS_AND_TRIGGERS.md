# Project Actions & Triggers Documentation

**Project**: WeKraft-Demo
**Last Updated**: January 29, 2026

This document details every actionable capability within the WeKraft system, including user interactions, backend triggers, AI workflows, and API endpoints.

---

## 🚀 1. User Actions (Frontend → Backend)

These are actions initiated by the user through the User Interface (UI).

### A. Authentication & Onboarding

| Action                  | Trigger Point      | Backend Operation         | Description                                                                    |
| :---------------------- | :----------------- | :------------------------ | :----------------------------------------------------------------------------- |
| **Sign In**             | `(auth)/sign-in`   | `clerk/webhook`           | Authenticates user via GitHub/Google; syncs user data to Convex `users` table. |
| **Complete Onboarding** | `onboard/[userid]` | `convex:users.updateUser` | Updates user profile with role/preferences after initial sign-up.              |

### B. Project Management

| Action               | Trigger Point           | Backend Operation                                       | Description                                                                       |
| :------------------- | :---------------------- | :------------------------------------------------------ | :-------------------------------------------------------------------------------- |
| **Create Project**   | Dashboard "New Project" | `convex:projects.create`                                | Creates a new project entry, links it to a GitHub repository.                     |
| **Update Settings**  | Project Settings Tab    | `convex:projects.updateProject`                         | Modifies description, tags, visibility (Public/Private), and "Looking for" roles. |
| **Update About**     | Project About Tab       | `convex:projects.updateAbout`                           | Updates the detailed markdown description of the project.                         |
| **Update Thumbnail** | Project Header          | `POST /api/objects` + `convex:projects.updateThumbnail` | Uploads image to AWS S3 and updates the project record with the URL.              |
| **Calculate Health** | Automatic/Manual        | `convex:projects.updateHealthScore`                     | Updates the calculated project health metrics (Momentum, Quality, Trust).         |

### C. AI Studio & Web Generator

| Action             | Trigger Point        | Backend Operation                             | Description                                                                     |
| :----------------- | :------------------- | :-------------------------------------------- | :------------------------------------------------------------------------------ |
| **Generate UI**    | "Generate" Button    | `POST /api/ui-studio`                         | Sends user prompt + history to Gemini AI; returns streamed HTML/Tailwind code.  |
| **Scrape Website** | "Recreate" Button    | `POST /api/ui-studio` (action=`scrape`)       | Scrapes provided URL, analyzes screenshot with AI Vision, and regenerates code. |
| **Save Design**    | "Save Design" Button | `convex:uiStudio.createFrame` / `updateFrame` | Persists the current HTML/CSS code as a "Frame" in the database.                |
| **Chat Assistant** | Chat Panel           | `convex:uiStudio.saveChat`                    | Saves user/assistant message history for context-aware conversations.           |
| **Download Code**  | "Download" Button    | _Client-side_                                 | Converts current HTML to a `.jsx` React component file for download.            |

### D. Workspace Operations

| Action            | Trigger Point   | Backend Operation  | Description                                                                                   |
| :---------------- | :-------------- | :----------------- | :-------------------------------------------------------------------------------------------- |
| **Upload Schema** | ER Diagram Tool | `POST /api/upload` | Parses SQL/Prisma schema string, validates it, and generates an interactive node graph.       |
| **Ask Question**  | Sidebar Chat    | `POST /api/chat`   | Queries the RAG pipeline; retrieves relevant code snippets from Pinecone to answer questions. |

---

## ⚡ 2. System Triggers (Automations)

These are recurring or event-driven actions performed automatically by the background workers (Inngest).

### A. Repository Indexing (RAG Pipeline)

- **Trigger Event**: `repository-connected`
- **Source**: Triggered when a User creates a project with a valid GitHub repository.
- **Function**: `src/inngest/functions/index.ts` ("index-repo")
- **Workflow**:
  1.  **Fetch Files**: Connects to GitHub API using user's token.
  2.  **Extract Content**: Downloads code files (ignoring binary/lockfiles).
  3.  **Generate Embeddings**: Sends code chunks to Embedding Model.
  4.  **Upsert Vectors**: Stores vectors in **Pinecone** database.
  5.  **Result**: Enables semantic search and "Chat with Codebase" features.

---

## 🔌 3. API Capabilities (Endpoints)

External or internal API routes available in the system.

### `POST /api/chat`

- **Purpose**: Main AI Chatbot endpoint.
- **Capabilities**:
  - **Streaming**: Returns response token-by-token.
  - **Schema Awareness**: Can parse SQL schemas if detected in the prompt.
  - **Context**: Uses `schemaContext` or RAG context to inform answers.

### `POST /api/objects`

- **Purpose**: File management (AWS S3 wrapper).
- **Capabilities**:
  - **Upload**: Accepts multipart form data (Images/Files) -> S3.
  - **Delete**: Accepts `oldUrl` to cleanup replaced files.
  - **Validation**: Enforces 1MB size limit.

### `POST /api/upload` (Schema Parser)

- **Purpose**: Specialized endpoint for ER Diagrams.
- **Capabilities**:
  - Parses raw text schemas (SQL, Prisma).
  - Validates relationships and types using AI.
  - Returns React Flow node/edge structure.

### `POST /api/ui-studio` (Internal)

- **Purpose**: dedicated AI generation for the Web Generator.
- **Capabilities**:
  - **`action: generate`**: Text-to-UI generation.
  - **`action: scrape`**: URL-to-UI cloning (Vision API).

---

## 💾 4. Database Mutations (Convex)

Direct database operations available to the client (secured by Row Level Security).

### Users

- `users.getCurrentUser`: Get authenticated user profile.
- `users.updateUser`: Modify user settings.

### Projects

- `projects.create`: Initialize new project.
- `projects.getProjects`: List user's projects.
- `projects.updateProject`: Edit project metadata.
- `projects.delete`: _Administrative/Owner only removal._

### UI Studio

- `uiStudio.getFrames`: List saved designs.
- `uiStudio.createFrame`: Save new design.
- `uiStudio.deleteFrame`: Remove a design.
- `uiStudio.saveChat`: Append message to history.

### Repositories

- `repos.create`: Link a GitHub repo ID to a user.
