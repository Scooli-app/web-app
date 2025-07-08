### **Phase 1: MVP - "O Gerador de Conteúdo Essencial"**

**Goal:** Launch the core product that solves the main user problem: generating educational content quickly. Focus on functionality over polish.

#### **Module 1: 🏗️ Foundation & Setup**

- **Set Up Supabase Project:**
  - Create a new Supabase project.
  - Design the initial database schema:
    - `users`: Handled by `auth.users` in Supabase.
    - `user_profiles`: Public table linked to `auth.users` for `credits_remaining` and `xp_points`.
    - `generated_content`: Stores `user_id`, `content_type`, `prompt`, and `generated_text`.
- **Configure Next.js Environment:**
  - Install the Supabase client library.
  - Store Supabase and OpenAI keys in `.env.local`.
- **Build Core UI Components:**
  - Create reusable components (`Button`, `Input`, `Card`, `Layout`) based on your style guide. This components should be installed from shadcn and then adapted.

#### **Module 2: 🔐 User Authentication & Onboarding**

- **Implement Authentication Flow:**
  - Build login, sign-up, and log-out using the Supabase client (email/password).
- **Create Protected Routes:**
  - Make the main dashboard/workspace accessible only to authenticated users.
- **Automate the "Welcome Package":**
  - Create a Supabase database trigger to automatically populate `user_profiles` for new users and set their initial `credits_remaining` to 100.

#### **Module 3: 🤖 The Core AI Generation Engine**

- **Build the Generation UI:**
  - Create a form for users to submit generation prompts.
- **Create the Backend API Route:**
  - Set up a secure backend endpoint at `src/app/api/generate/route.ts`.
- **Implement Core API Logic:**
  1.  **Check Authentication:** Verify the user is logged in.
  2.  **Check Credits:** Ensure the user has enough credits.
  3.  **Call OpenAI API:** Send the prompt to the GPT model.
  4.  **Deduct Credits & Save:** On success, decrement user credits and save the output to the `generated_content` table.
  5.  **Return Response:** Send the generated content to the frontend.

#### **Module 4: 🗂️ Private Workspace**

- **Create the Dashboard Page:**
  - The main landing page for logged-in users.
- **Display Generated Content:**
  - Fetch and display a list of the user's previously generated content.
- **Show User Status:**
  - Display the user's remaining credits clearly in the UI.

---

### **Phase 2: "O Ecossistema Comunitário"**

**Goal:** Build community features, create a network effect, and introduce monetization.

#### **Module 1: 💰 Monetization & Scooli Pro**

- **Integrate Payment Gateway:**
  - Integrate Stripe for handling subscriptions.
- **Build Subscription Flow:**
  - Create a pricing page and a checkout flow with Stripe Checkout.
  - Use Stripe webhooks to update user roles to `pro` in Supabase upon successful payment.
- **Update API Logic:**
  - Modify the generation API to bypass credit checks for `pro` users.

#### **Module 2: 🌐 The Community Library**

- **Enhance Database Schema:**
  - Add `is_public` (boolean) and `community_rating` (number) columns to `generated_content`.
- **Implement Sharing:**
  - Add a "Share to Community" button that sets `is_public` to `true`.
- **Build the Library UI:**
  - Create a public `/community` page to display all shared content, with search and filtering.

#### **Module 3: ✨ Gamification & Engagement**

- **Track Engagement:**
  - Create tables for `downloads` and `ratings` on community content.
- **Implement XP System:**
  - Use database triggers to award `xp_points` to users when their content is downloaded or highly rated.
- **Implement "Earn Credits" Feature:**
  - Create a scheduled function to periodically award credits for high-performing community contributions.

---

### **Phase 3: "A Plataforma Integrada"**

**Goal:** Expand the platform's reach through integrations and enter the B2B market.

- **Third-Party Integrations:**
  - Implement OAuth for Google/Microsoft to enable "Export to Google Docs" or "Save to OneDrive."
- **Teacher Analytics:**
  - Build a dashboard for users to see analytics on their content's performance.
- **B2B School Model:**
  - Design a new data model for "Organizations" or "Schools" to allow admin management of teacher accounts.
