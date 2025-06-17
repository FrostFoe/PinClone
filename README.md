# Pinclone - A Pinterest-style Web Application

This project is a web application built with Next.js, React, ShadCN UI, Tailwind CSS, Supabase for backend and database, and Genkit for AI features.

## Project Setup

### 1. Environment Variables

- Create a `.env.local` file in the root of your project.
- Add your Supabase project URL and Anon Key:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  ```
  Replace `your_supabase_url` and `your_supabase_anon_key` with your actual Supabase project credentials.

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup (SQL Schema)

- Go to your Supabase project dashboard.
- Navigate to the **SQL Editor**.
- Copy the entire content of the `sql/schema.sql` file from this project.
- Paste it into the Supabase SQL Editor and run the query. This will set up the necessary tables, functions, and basic RLS policies.

### 4. Supabase Storage Buckets (CRITICAL FOR IMAGE UPLOADS)

**Your application WILL NOT WORK correctly without creating these Storage buckets.** The error "Image upload failed: Bucket not found" directly indicates these buckets are missing.

You MUST create two Supabase Storage buckets manually in your Supabase dashboard:
  - `pins`
  - `avatars`

**Steps to Create Buckets:**

1.  Go to your Supabase Project Dashboard.
2.  In the left sidebar, click on **Storage**.
3.  Click the **"Create new bucket"** button.

    *   **Create the `pins` bucket:**
        *   **Bucket name:** `pins` (all lowercase, exactly this name)
        *   Toggle **"Public bucket"** to **ON**. This allows images to be directly accessible via their URL, which is suitable for this application.
        *   Click **"Create bucket"**.

    *   **Create the `avatars` bucket:**
        *   Click **"Create new bucket"** again.
        *   **Bucket name:** `avatars` (all lowercase, exactly this name)
        *   Toggle **"Public bucket"** to **ON**.
        *   Click **"Create bucket"**.

**Why "Public bucket: ON"?**
Making the buckets public is generally simpler for applications like this where images (pins, avatars) are meant to be widely viewable.

**Alternative: Private Buckets with RLS Policies (More Complex)**
If you choose *not* to make the buckets public, you will need to configure Row Level Security (RLS) policies for these Storage buckets to allow access:
  *   For the `pins` bucket:
      *   Allow authenticated users to `insert` (upload).
      *   Allow everyone to `select` (read/view).
  *   For the `avatars` bucket:
      *   Allow the authenticated user whose `id` matches the path to `insert` and `update`.
      *   Allow everyone to `select`.

For most use cases of this app, setting "Public bucket: ON" is recommended for simplicity.

### 5. Refresh Supabase Schema Cache

- After setting up the database (Step 3) and storage buckets (Step 4), it's often necessary to refresh Supabase's internal schema cache.
- In your Supabase project dashboard, go to the **API** section (usually under "Project Settings" or in the main left sidebar).
- Look for a button like **"Reload schema"** or **"Refresh database"** and click it. This step is important for Supabase to recognize new tables, relationships, and bucket policies.

### 6. Regenerate Supabase TypeScript Types (Recommended)

Ensure your local TypeScript types match your Supabase schema:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/types/supabase.ts
```
Replace `YOUR_PROJECT_ID` with your actual Supabase project ID.

### 7. Run the Development Server

```bash
npm run dev
```

The application should now be running on `http://localhost:9002` (or the port specified in your `package.json` dev script).

## Available Scripts

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts a Next.js production server.
- `npm run lint`: Lints the project files.
- `npm run typecheck`: Checks TypeScript types.

## Tech Stack

- **Framework:** Next.js (App Router)
- **UI Components:** React, ShadCN UI
- **Styling:** Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage)
- **AI Features:** Genkit (for integrating with AI models)
- **Language:** TypeScript

## Project Structure

- `src/app/`: Next.js App Router pages and layouts.
- `src/components/`: Reusable UI components.
  - `src/components/ui/`: ShadCN UI components.
- `src/lib/`: Utility functions, Supabase client setup, auth helpers.
- `src/services/`: Server Actions and functions for interacting with Supabase.
- `src/types/`: TypeScript type definitions.
- `src/ai/`: Genkit related code, flows, and configuration.
- `sql/`: SQL scripts for database schema setup.
- `public/`: Static assets.
```