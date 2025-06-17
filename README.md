
# Pinclone with Firebase Studio & Supabase

This is a Next.js starter project for Pinclone, integrated with Supabase for backend services.

## Getting Started

1.  **Set up Supabase:**

    - Create a Supabase project.
    - In the Supabase Dashboard, navigate to the SQL Editor.
    - Open the `sql/schema.sql` file from this project.
    - **Important**: If you are running this on an existing database with previous Pinclone tables, the script includes `DROP TABLE IF EXISTS ... CASCADE;` commands. These will delete your existing `pins` and `profiles` tables and their data. Ensure you have backups if needed.
    - Copy its entire content and paste it into the Supabase SQL Editor.
    - Run the script to create all necessary tables, indexes, RLS policies, and triggers.
    - **Storage Buckets**:
      - Go to Storage -> Create Bucket. Name it `pins`. Make it public or set appropriate access policies as suggested in the comments of `sql/schema.sql`.
      - Go to Storage -> Create Bucket. Name it `avatars`. Make it public or set appropriate access policies as suggested in the comments of `sql/schema.sql`.
    - Review and ensure Row Level Security (RLS) policies (defined in `sql/schema.sql`) are active for your tables.
    - **Refresh Schema Cache**: After running the SQL script, it's a good practice to refresh Supabase's schema cache. You can often do this in the Supabase Dashboard (e.g., API section -> "Reload schema") or by making a minor, trivial change to a table via the UI (like adding/removing a column comment) and saving.

2.  **Environment Variables:**

    - Create a `.env.local` file in the root of your project.
    - Add your Supabase project URL and Anon key:
      ```
      NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
      NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
      ```

3.  **Generate Supabase TypeScript Types (Recommended after schema changes):**
    ```bash
    npx supabase gen types typescript --project-id <your-project-id> --schema public > src/types/supabase.ts
    ```
    Replace `<your-project-id>` with your actual Supabase project ID. While types are included, regenerating them ensures they perfectly match your database schema.

4.  **Install Dependencies:**

    ```bash
    npm install
    ```

5.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:9002` (or your configured port).

## Supabase Schema

The complete database schema, including tables for `pins` and `profiles`, RLS policies, indexes, and the new user trigger, is defined in the `sql/schema.sql` file. Please run this script in your Supabase project's SQL Editor.

## Project Structure

- `src/app/`: Next.js App Router pages.
- `src/components/`: Shared React components.
- `src/components/ui/`: ShadCN UI components.
- `src/lib/supabase/`: Supabase client and server configurations.
- `src/services/`: Functions for interacting with Supabase (fetching data, etc.).
- `src/types/`: TypeScript type definitions.
- `sql/schema.sql`: The complete SQL script to set up the database.

## Key Features

- **Supabase Auth**: User signup, login, logout.
- **Pin Display**: Fetches and displays pins from Supabase on the homepage and individual pin pages.
- **Create Pin**: Users can upload images and create new pins, saved to Supabase.
- **User Profiles**: Fetches and displays user profile information. Profile editing page allows updates to Supabase, including avatar uploads.
- **User Search**: Search for users by username or full name. Pin search service also exists.
- **Responsive Design**: Masonry layout for pins, mobile-friendly UI.
- **Loading & Error States**: Skeletons, spinners, and toasts for better UX.

## Next Steps / To-Do

- Implement "forgot password" functionality.
- Add OAuth providers (Google, GitHub, etc.).
- Implement liking, saving/collecting pins into boards, and commenting features.
- Refine infinite scrolling with more robust error handling and end-of-list indicators.
- Implement optimistic updates for actions like creating pins or updating profiles.
- Expand RLS policies for more complex features (e.g., sharing, private boards).
- Add more sophisticated search filters (e.g., by tags, colors).
- Implement UI for pin search results.
- Add Framer Motion for more advanced animations.
