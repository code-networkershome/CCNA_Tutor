# CCNA Tutor - Technical Documentation & Developer Guide

**Version**: 1.0.0
**Last Updated**: January 31, 2026
**Tech Stack**: Next.js 14 (App Router), TypeScript, Drizzle ORM, PostgreSQL (Neon/Supabase), Tailwind CSS

---

## 1. Executive Summary

### 1.1 Project Overview
**CCNA Tutor** is an advanced, AI-powered educational platform designed to help students master computer networking concepts, specifically targeting the Cisco Certified Network Associate (CCNA) curriculum. It goes beyond static content by offering an interactive, deterministic CLI simulator that mimics real Cisco IOS devices, adaptive quizzes, and personalized learning paths.

The platform bridges the gap between theoretical knowledge and practical application, providing a safe, browser-based environment for configuring routers and switches without the need for heavy emulation software like GNS3 or EVE-NG.

### 1.2 Core Features
*   **Interactive CLI Simulator**: A robust, zero-latency simulation engine running entirely in the browser (or server-side for verification), supporting complex configuration workflows, dynamic routing (RIP/OSPF), and realistic error handling.
*   **Adaptive Learning System**: Knowledge nodes with dependency tracking, prerequisites, and AI-generated explanations tailored to the user's difficulty preference.
*   **Gamification**: XP system, streak tracking, leaderboards, and achievements to maintain user engagement.
*   **Admin Dashboard**: Comprehensive tools for content management (labs, quizzes, flashcards), user oversight, and system analytics.
*   **Study Groups**: Collaborative learning features allowing students to join groups, discuss topics, and compete in challenges.
*   **Premium User Experience**: A completely redesigned, "Glassmorphism" UI with dark mode support, fluid animations, and a dedicated User Profile page.
*   **Multi-Device Simulation**: Drag-and-drop topology builder allowing users to connect multiple routers/switches and simulate end-to-end connectivity (Ping/Trace).

---

## 2. Technical Architecture

### 2.1 High-Level Overview
The application is built on a **Modern Monolith** architecture using Next.js 14. This allows for seamless integration of frontend UI and backend API logic within a single codebase, leveraging Server Actions and React Server Components (RSC) for performance and SEO.

*   **Frontend**: React 18 with Tailwind CSS for styling. Uses client-side state for the interactive CLI to ensure zero latency.
*   **Backend**: Next.js API Routes and Server Actions. Handles authentication, database interactions, and AI generation requests.
*   **Database**: PostgreSQL managed via Drizzle ORM. Provides strong type safety and schema validation.
*   **AI Engine**: Integrates with Groq SDK (LLama 3 / Mixtral) for high-speed text generation (explanations, hints) but **NOT** for critical logic like CLI execution, which is strictly deterministic.

### 2.2 CLI Simulation Engine (The "Core")
The crown jewel of the platform is the custom-built CLI Simulator, designed to replicate Cisco IOS behavior with high fidelity.

#### Architecture: The 3-Layer Model
To ensure reliability and determinism, the simulator uses a strictly layered architecture:

1.  **Layer 1: State Engine (`state-engine.ts`)**
    *   **Role**: The purely functional heart of the system.
    *   **Responsibility**: Manages the immutable state of the simulated device. It defines the "Truth" of the simulation (Interfaces, IP Addresses, Routing Table, VLANs).
    *   **Logic**: All state mutations (e.g., `updateHostname`, `addRoute`) are pure functions that take `(CurrentState, Arguments)` and return `NewState`.
    *   **Key Feature**: Includes a `calculateRoutingTable` function that dynamically processes Static, Connected, RIP, and OSPF configurations to rebuild the Routing Information Base (RIB) logic-on-demand.

2.  **Layer 2: Command Processor (`command-processor.ts` & `grammar.ts`)**
    *   **Role**: The brain that understands user intent.
    *   **Responsibility**: Parses raw text input, validates it against a strict Grammar Tree, and executes the corresponding efficient state updates.
    *   **Features**:
        *   **Smart Abbreviation Resolver**: Uses a Trie-like lookup to handle abbreviated commands (e.g., `sh ip int br` -> `show ip interface brief`) and detect ambiguities.
        *   **`do` Command Support**: Allows execution of Privileged EXEC commands from configuration modes, mimicking real IOS convenience.
        *   **Mode Enforcement**: Strictly prevents running commands in the wrong context (e.g., cannot run `interface g0/0` from User EXEC mode).

3.  **Layer 3: Lab Validation & Persistence (`ai-interpreter.ts` / API)**
    *   **Role**: The bridge between the simulator and the Learning Management System (LMS).
    *   **Responsibility**: It wraps the raw processor to handle persistence. When a user runs a command:
        1.  The command is processed by Layer 2.
        2.  The result (Output + New State) is returned.
        3.  The API persists this new state to the database (or temporary session storage).
        4.  Lab objectives are checked against this new state to verify completion (e.g., "Goal: Assign IP 10.0.0.1 to g0/0").

---

## 3. Data Models & Database Schema

The application uses **PostgreSQL** as the primary datastore, managed via **Drizzle ORM** for type-safe interaction. The schema is normalized and relational.

### 3.1 Core User Tables
*   **`users`**: The central identity table (ID, Email, Role, Avatar).
    *   *Roles*: `student`, `faculty_reviewer`, `content_admin`, `super_admin`.
*   **`sessions`**: Manages user session tokens (if not using JWT only).
*   **`preferences`**: Stores user-specific UI settings (JSONB).

### 3.2 Knowledge & Learning
The content is structured as a graph of "Knowledge Nodes" rather than linear chapters.
*   **`knowledge_nodes`**: Represents a single concept (e.g., "OSPF Areas").
    *   *Fields*: `topic`, `difficulty`, `core_explanation`, `mental_model`, `cli_example`.
    *   *Metadata*: `prerequisites` (array) used to build the learning path DAG.
*   **`syllabus`**: Defines the ordered curriculum structure.
*   **`learning_paths`**: Custom paths grouping topics (e.g., "Full CCNA", "Subnetting Deep Dive").

### 3.3 Assessment & Progress
*   **`user_progress`**: Tracks high-level stats (XP, Level, Streak) per user per module.
*   **`topic_progress`**: Granular tracking of user mastery for each topic.
*   **`quizzes`** & **`questions`**: Full assessment engine.
    *   *Question Types*: Multiple Choice, Drag & Drop, Hotspot, Simulation.
*   **`quiz_attempts`**: Records every quiz taken, including detailed answer logs and scoring.

### 3.4 Lab & CLI Models
*   **`labs`**: Defines full-scale guided labs.
    *   *Content*: `topology` (JSON), `initial_configs` (JSON), `objectives` (JSON list of tasks).
*   **`lab_attempts`**: Tracks a user's progress through a specific lab session.
*   **`cli_exercises`**: Smaller, targeted commands tasks (e.g., "Configure hostname").
    *   *Validation*: usage of regex or state matching rules (`validation_rules` JSONB).

### 3.5 Social & Gamification
*   **`achievements`**: Definitions of badges (e.g., "7 Day Streak").
*   **`user_achievements`**: Unlocks for specific users.
*   **`study_groups`**: Communities for users.
*   **`group_discussions`** & **`group_messages`**: Forum-like communication tables.

---

## 4. Key Features & Functionality

### 4.1 CLI Simulator Details
The simulator is 100% deterministic, meaning the same sequence of commands will **always** produce the same state, unlike LLM-based simulators which can hallucinate.

*   **Mode Handling**: Supports `User EXEC` (>), `Privileged EXEC` (#), `Global Config` ((config)), `Interface Config` ((config-if)), `Router Config` ((config-router)), and `VLAN Config` ((config-vlan)).
*   **Networking Logic**:
    *   **IP Addressing**: Validates masks, calculates network IDs, simulates overlapping check.
    *   **Routing Protocols**:
    *   **Routing Protocols**:
        *   **RIPv2**: `version 2`, `no auto-summary`, `network`.
        *   **OSPF**: Multi-area support, neighbor states.
        *   **EIGRP**: AS-based routing, composite metric logic.
        *   **BGP**: eBGP peering, path attribute simulation.
        *   **Static**: Recursive lookups, default routes.
    *   **Switching & L2**:
        *   **VLANs**: Database, Access/Trunk ports (`switchport mode`).
        *   **STP**: PVST+, Rapid-PVST simulation.
        *   **EtherChannel**: LACP/PaGP negotiation and load balancing.
    *   **Security & Services**:
        *   **ACLs**: Standard & Extended Access Lists (Stateful matching).
        *   **NAT**: Inside Source (Static/Dynamic/Overload).
        *   **DHCP**: Server/Client simulation, Pools, Exclusions.
        *   **Port Security**: Violation modes, Sticky MACs.
*   **Validation**:
    *   **State-Based**: Checks if the internal state object matches the goal (e.g., `state.interfaces['g0/0'].ip == '10.0.0.1'`).
    *   **Output-Based**: Checks if the `show` command output contains specific strings.

### 4.2 Admin Dashboard
Located at `/admin`, this secured area allows Content Admins to:
*   **Manage Labs**: Visual editor for lab topologies and objectives.
*   **Review Content**: Approve/Reject AI-generated questions or explanations.
*   **Analytics**: View system-wide user engagement (DAU/MAU) and content popularity.

### 4.3 AI Integration
The platform uses Generative AI strictly for:
*   **Content Generation**: Drafting new quiz questions or explanations (reviewed by humans).
*   **Socratic Tutor**: A chat interface that guides students to answers without giving them away.
*   **Hint Generation**: Context-aware hints if a user fails a CLI command multiple times.

---

## 5. Developer Guide

### 5.1 Installation & Setup
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/ccna-tutor.git
    cd ccna-tutor
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Variables**:
    Create a `.env.local` file with the following keys:
    ```env
    DATABASE_URL=postgresql://user:password@host/db
    GROQ_API_KEY=your_groq_api_key
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```
4.  **Database Migration**:
    Initialize the database using Drizzle Kit:
    ```bash
    npm run db:generate
    npm run db:migrate
    ```

### 5.2 Running Locally
*   **Development Server**: `npm run dev` (Runs on http://localhost:3000)
    *   This includes Hot Module Replacement (HMR) for both UI and API.
*   **Database Studio**: `npm run db:studio` (Opens Drizzle Studio UI to inspect DB).

### 5.3 Scripts Reference
*   `npm run build`: Generates the production build.
*   `npm run start`: Starts the production server.
*   `npm run lint`: Runs ESLint check.
*   `npm run db:push`: Pushes schema changes directly to DB (Development only).

---

## 6. Deployment & Operations

### 6.1 Vercel Deployment
The project is optimized for deployment on Vercel.
1.  Connect your GitHub repository to Vercel.
2.  Configure the **Build Command** as `npm run build`.
3.  Add the Environment Variables in the Vercel Dashboard.
4.  **Edge Functions**: Ensure your database provider (e.g., Neon) supports serverless connections, as API routes may run on the edge.

### 6.2 Monitoring
*   **Vercel Analytics**: Enable for UI performance tracking.
*   **Error Logging**: The `error_log` table captures API-level failures.
*   **Audit**: Critical actions (like deleting content) are logged in `audit_log`.

### 6.3 Future Roadmap
*   **Real-Time Collaboration**: Websockets for live study groups.
*   **Mobile App**: React Native port for on-the-go learning.

---

## 7. Version History

### v1.0.0 (January 2026) - The "Gold" Release
*   **Full CLI Support**: Completed implementation of all major CCNA protocols (EIGRP, BGP, STP, ACLs).
*   **UI Overhaul**: Applied "Modern Cisco Premium" design language across all pages.
*   **System Integration**:
    *   Unified Admin/Student Dashboards.
    *   Implemented `ProfilePage` with dynamic stats.
    *   Fixed Vercel build pipeline and deployment configs.
*   **Admin Tools**: Restored Flashcards, fixed Sidebar layout, and cleaned up mock data.

---

**End of Documentation**
