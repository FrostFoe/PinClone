
# Pinclone with Firebase Studio & Supabase

This is a Next.js starter project for Pinclone, integrated with Supabase for backend services.

## Getting Started

1.  **Set up Supabase:**

    - Create a Supabase project.
    - In the Supabase Dashboard, navigate to the SQL Editor.
    - Open the `sql/schema.sql` file from this project.
    - **Important**: The script includes `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` commands. These will delete your existing `public` schema and all its data. Ensure you have backups if needed or remove these lines if applying to an existing schema you wish to preserve and modify.
    - Copy its entire content and paste it into the Supabase SQL Editor.
    - Run the script to create all necessary tables, indexes, RLS policies, and triggers.
    - **Storage Buckets**:
      - The SQL script includes comments in "SECTION 7" with guidance and example RLS for creating `pins` and `avatars` storage buckets. Please review these and set up your buckets accordingly in the Supabase Storage UI.
    - Review and ensure Row Level Security (RLS) policies (defined in `sql/schema.sql`) are active for your tables.
    - **Refresh Schema Cache**: After running the SQL script, it's crucial to refresh Supabase's schema cache. You can often do this in the Supabase Dashboard (e.g., API section -> "Reload schema") or by making a minor, trivial change to a table via the UI (like adding/removing a column comment) and saving.

2.  **Environment Variables:**

    - Create a `.env.local` file in the root of your project.
    - Add your Supabase project URL and Anon key:
      ```
      NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
      NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
      ```

3.  **Generate Supabase TypeScript Types (Highly Recommended after schema changes):**
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

The complete database schema, including tables for profiles, pins, tags, likes, comments, boards, follows, RLS policies, indexes, and the new user trigger, is defined in the `sql/schema.sql` file. Please run this script in your Supabase project's SQL Editor.

## Project Structure

- `src/app/`: Next.js App Router pages.
- `src/components/`: Shared React components.
- `src/components/ui/`: ShadCN UI components.
- `src/lib/supabase/`: Supabase client and server configurations.
- `src/services/`: Functions for interacting with Supabase (fetching data, etc.).
- `src/types/`: TypeScript type definitions.
- `sql/schema.sql`: The complete SQL script to set up the database.

## Key Features (Targeted by New Schema)

- **Supabase Auth**: User signup, login, logout.
- **User Profiles**: Extended user profile data.
- **Pin Management**: Create, display, update, delete pins.
- **Tagging**: Pins can be tagged and searched/filtered by tags.
- **Likes**: Users can like/unlike pins.
- **Comments**: Users can comment on pins.
- **Boards/Collections**: Users can create boards and save pins to them.
- **Follows**: Users can follow other users.
- **Search**: Functionality for searching users and pins (backend services exist, UI for pin search TBD).
- **Responsive Design**: Masonry layout for pins, mobile-friendly UI.
- **Loading & Error States**: Skeletons, spinners, and toasts for better UX.

## Next Steps / To-Do (Post Schema Update)

- Implement UI and services for all new features:
    - Tag creation and association with pins.
    - Liking/unliking pins.
    - Commenting on pins (viewing, adding, editing, deleting).
    - Board creation, adding/removing pins from boards.
    - Following/unfollowing users.
    - Displaying follower/following counts.
    - Integrating pin search results into UI.
- Implement "forgot password" functionality.
- Add OAuth providers (Google, GitHub, etc.).
- Refine infinite scrolling with more robust error handling and end-of-list indicators for all relevant feeds.
- Implement optimistic updates for actions like liking, commenting, saving to boards.
- Expand RLS policies for more complex scenarios (e.g., collaborative boards, private messages).
- Add more sophisticated search filters (e.g., by tags, colors for pins).
- Add Framer Motion for more advanced animations if desired.
- Enhance the `handle_new_user` trigger for more robust unique username generation if needed, though app-level profile settings provide a good fallback.
- Write comprehensive tests.
