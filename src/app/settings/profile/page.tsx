// ==========================================================================================
// !! CRITICAL SUPABASE SETUP FOR PROFILE AVATARS !!
// ==========================================================================================
// THIS PAGE REQUIRES A SUPABASE STORAGE BUCKET NAMED 'avatars'.
//
// 1. CREATE 'avatars' BUCKET IN SUPABASE STORAGE:
//    - Go to your Supabase Project Dashboard -> Storage -> Buckets.
//    - Click 'Create new bucket'.
//    - Bucket name: avatars (all lowercase)
//    - Toggle 'Public bucket' to ON. (This allows public read access for images).
//    - Click 'Create bucket'.
//
// 2. APPLY ROW LEVEL SECURITY (RLS) POLICIES FOR STORAGE UPLOADS:
//    - The `sql/schema.sql` file in this project contains the necessary RLS policies
//      for the `storage.objects` table, specifically to allow authenticated users
//      to UPLOAD (INSERT) into the 'avatars' bucket.
//    - Ensure you have run the LATEST version of `sql/schema.sql` in your Supabase SQL Editor.
//    - Also ensure RLS is ENABLED on the `storage.objects` table using:
//      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
//      (This is also included in `sql/schema.sql`).
//
// 3. REFRESH SUPABASE SCHEMA CACHE:
//    - After applying SQL changes, go to Supabase Dashboard -> API section -> Click "Reload schema".
//
// IF YOU ENCOUNTER "Bucket not found" ERRORS: You missed step 1.
// IF YOU ENCOUNTER "new row violates row-level security policy" ERRORS: You missed step 2 or 3,
// or your RLS policies for storage are not correctly applied.
// ==========================================================================================
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Camera,
  Save,
  UserCircle,
  Mail,
  Globe,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import {
  fetchProfileById,
  updateProfile,
  checkUsernameAvailability,
} from "@/services/profileService";
import type { TablesUpdate } from "@/types/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const generateDefaultUsername = (email: string): string => {
  const emailPrefix = email.split("@")[0];
  let baseUsername = emailPrefix.replace(/[^a-zA-Z0-9_.]/g, "");
  if (baseUsername.length < 3) {
    baseUsername = `${baseUsername}user`;
  }
  // Append a few random chars to reduce immediate collision likelihood
  // A more robust solution might involve checking DB and iterating
  baseUsername =
    baseUsername.substring(0, 15) + Math.random().toString(36).substring(2, 6);
  return baseUsername.substring(0, 20);
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();

  const [userData, setUserData] = useState<Partial<Profile> | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [initialUsername, setInitialUsername] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isInitialProfileLoad, setIsInitialProfileLoad] = useState(true);

  useEffect(() => {
    const getUserAndProfile = async () => {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const user = session.user;
        setCurrentUserId(user.id);
        setCurrentUserEmail(user.email || null);

        const { profile, error } = await fetchProfileById(user.id);

        if (profile) {
          setUserData(profile);
          setAvatarPreview(profile.avatar_url || null);
          setInitialUsername(profile.username || null);
        } else if (
          error === "Profile not found for this user ID." ||
          error?.includes("PGRST116") // More generic check for "no rows found"
        ) {
          const defaultUsernameBase = user.email
            ? generateDefaultUsername(user.email)
            : `user${Date.now().toString().slice(-5)}`;

          setUserData({
            id: user.id,
            username: defaultUsernameBase,
            full_name: user.user_metadata?.full_name || "",
            avatar_url: user.user_metadata?.avatar_url || null,
            bio: "",
            website: "",
          });
          setAvatarPreview(user.user_metadata?.avatar_url || null);
          setInitialUsername(null);
          toast({
            title: "Complete Your Profile",
            description:
              "It looks like your profile is new. Please review and save your details.",
          });
        } else if (error) {
          toast({
            variant: "destructive",
            title: "Error fetching profile",
            description: error || "Could not load your profile data.",
          });
          setUserData(null);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Not Authenticated",
          description: "Please log in to edit your profile.",
        });
        router.push("/login?next=/settings/profile");
      }
      setIsLoading(false);
      setIsInitialProfileLoad(false);
    };
    getUserAndProfile();
  }, [supabase, router, toast]); // Added supabase to dependency array

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setUserData((prev) => (prev ? { ...prev, [name]: value } : null));
    if (name === "username") {
      setUsernameError(null); // Clear username error on change
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Avatar image must be less than 2MB.",
        });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUsernameBlur = async () => {
    if (!userData || !userData.username) {
      setUsernameError("Username cannot be empty.");
      return;
    }
    const trimmedUsername = userData.username.trim();
    if (trimmedUsername === initialUsername && initialUsername !== null) {
      setUsernameError(null);
      return;
    }
    if (trimmedUsername.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(trimmedUsername)) {
      setUsernameError(
        "Username can only contain letters, numbers, underscores, and periods.",
      );
      return;
    }

    setIsSaving(true);
    const { available, error } =
      await checkUsernameAvailability(trimmedUsername);
    if (error) {
      setUsernameError(error);
    } else if (!available) {
      setUsernameError("This username is already taken.");
    } else {
      setUsernameError(null);
    }
    setIsSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !userData) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User session not found or user data is missing.",
      });
      return;
    }
    if (!userData.username || userData.username.trim().length === 0) {
      setUsernameError("Username cannot be empty.");
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Username cannot be empty.",
      });
      return;
    }
    if (
      userData.username.trim().length < 3 &&
      userData.username.trim() !== initialUsername
    ) {
      setUsernameError("Username must be at least 3 characters.");
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Username must be at least 3 characters.",
      });
      return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(userData.username.trim())) {
      setUsernameError(
        "Username can only contain letters, numbers, underscores, and periods.",
      );
      toast({
        variant: "destructive",
        title: "Validation Error",
        description:
          "Username can only contain letters, numbers, underscores, and periods.",
      });
      return;
    }
    if (usernameError && userData.username.trim() !== initialUsername) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: usernameError,
      });
      return;
    }

    setIsSaving(true);
    let avatarPublicUrl = userData.avatar_url;

    if (avatarFile) {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${currentUserId}/avatar-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        console.error("Supabase storage upload error (avatars):", uploadError);
        let userMessage = "Avatar upload failed. Please try again.";
        if (uploadError.message.includes("Bucket not found")) {
          userMessage =
            "Avatar upload failed: Bucket not found. Ensure 'avatars' bucket exists and is public (or RLS configured).";
        } else if (uploadError.message.includes("security policy")) {
          userMessage =
            "Avatar upload failed: Permission denied. Please check storage security rules (RLS).";
        } else {
          userMessage = `Avatar upload failed: ${uploadError.message}.`;
        }
        toast({
          variant: "destructive",
          title: "Avatar Upload Failed",
          description: userMessage,
        });
        setIsSaving(false);
        return;
      }

      if (!uploadData || !uploadData.path) {
        throw new Error(
          "Avatar upload succeeded but no path returned from storage.",
        );
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);
      avatarPublicUrl = urlData.publicUrl;
    }

    const updates: TablesUpdate<"profiles"> = {
      full_name: userData.full_name?.trim() || null,
      username: userData.username?.trim(),
      bio: userData.bio?.trim() || null,
      website: userData.website?.trim() || null,
      avatar_url: avatarPublicUrl || null,
      updated_at: new Date().toISOString(),
    };

    const { profile: updatedProfile, error: updateError } = await updateProfile(
      currentUserId,
      updates,
    );

    if (updateError) {
      toast({
        variant: "destructive",
        title: "Profile Update Failed",
        description: updateError,
      });
      if (
        updateError.toLowerCase().includes("username") &&
        updateError.toLowerCase().includes("taken")
      ) {
        setUsernameError("This username is already taken.");
      }
    } else if (updatedProfile) {
      setUserData(updatedProfile);
      setInitialUsername(updatedProfile.username || null);
      if (avatarPublicUrl && avatarPublicUrl !== userData.avatar_url) {
        setAvatarPreview(avatarPublicUrl);
      }
      setAvatarFile(null);
      toast({ title: "Profile Saved Successfully!" });
      router.refresh();
    }
    setIsSaving(false);
  };

  if (isLoading || isInitialProfileLoad) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 animate-fade-in-up">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-10 w-1/2 mb-10 rounded-lg bg-muted" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 bg-card rounded-2xl shadow-card mb-10">
              <Skeleton className="h-6 w-1/3 mb-6 rounded-md bg-muted" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-md bg-muted" />
                <Skeleton className="h-10 w-full rounded-md bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (!userData && !isLoading) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive">
          Could not load profile data
        </h2>
        <p className="text-muted-foreground">
          Please try again later or contact support.
        </p>
        <Button onClick={() => router.push("/")} className="mt-6">
          Go to Homepage
        </Button>
      </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 animate-fade-in-up">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold font-headline text-foreground">
            Profile Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your public profile information.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          <section className="p-6 bg-card rounded-2xl shadow-card">
            <h2 className="text-xl font-semibold mb-1 text-foreground">
              Profile Picture
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Displayed on your profile and next to your pins.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-secondary">
                  <AvatarImage
                    src={avatarPreview || undefined}
                    alt={userData?.full_name || userData?.username || "User"}
                    data-ai-hint="profile avatar large settings"
                  />
                  <AvatarFallback className="text-4xl">
                    {userData?.full_name?.[0]?.toUpperCase() ||
                      userData?.username?.[0]?.toUpperCase() ||
                      currentUserEmail?.[0]?.toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full h-10 w-10 border-2 border-card shadow-md hover:bg-muted focus-ring"
                  onClick={() =>
                    document.getElementById("avatarUpload")?.click()
                  }
                  aria-label="Change profile picture"
                  disabled={isSaving}
                >
                  <Camera className="h-5 w-5" />
                </Button>
                <Input
                  id="avatarUpload"
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  onChange={handleAvatarChange}
                  disabled={isSaving}
                />
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full focus-ring"
                  onClick={() =>
                    document.getElementById("avatarUpload")?.click()
                  }
                  disabled={isSaving}
                >
                  Upload New Picture
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG, GIF, WEBP. Max 2MB.
                </p>
              </div>
            </div>
          </section>

          <section className="p-6 bg-card rounded-2xl shadow-card">
            <h2 className="text-xl font-semibold mb-6 text-foreground">
              Public Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
              <div>
                <Label
                  htmlFor="full_name"
                  className="text-sm font-medium text-foreground/90"
                >
                  Full Name
                </Label>
                <div className="relative mt-1">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="full_name"
                    name="full_name"
                    value={userData?.full_name || ""}
                    onChange={handleChange}
                    className="pl-10 h-11 focus-ring"
                    placeholder="E.g. Jane Doe"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div>
                <Label
                  htmlFor="username"
                  className="text-sm font-medium text-foreground/90"
                >
                  Username
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    @
                  </span>
                  <Input
                    id="username"
                    name="username"
                    value={userData?.username || ""}
                    onChange={handleChange}
                    onBlur={handleUsernameBlur}
                    className={`pl-7 h-11 focus-ring ${usernameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    placeholder="yourusername"
                    aria-describedby="username-error"
                    disabled={isSaving}
                    required
                  />
                </div>
                {usernameError && (
                  <p
                    id="username-error"
                    className="text-xs text-destructive mt-1"
                  >
                    {usernameError}
                  </p>
                )}
                {!usernameError &&
                  userData?.username &&
                  userData.username.trim().length > 0 &&
                  userData.username.trim().length < 3 && (
                    <p className="text-xs text-destructive mt-1">
                      Username must be at least 3 characters.
                    </p>
                  )}
                {!usernameError &&
                  userData?.username &&
                  !/^[a-zA-Z0-9_.]+$/.test(userData.username.trim()) && (
                    <p className="text-xs text-destructive mt-1">
                      Username can only contain letters, numbers, underscores,
                      and periods.
                    </p>
                  )}
              </div>
              <div className="md:col-span-2">
                <Label
                  htmlFor="bio"
                  className="text-sm font-medium text-foreground/90"
                >
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={userData?.bio || ""}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 focus-ring"
                  placeholder="Tell us a little about yourself..."
                  disabled={isSaving}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Appears on your profile. Max 160 characters.
                </p>
              </div>
              <div>
                <Label
                  htmlFor="website"
                  className="text-sm font-medium text-foreground/90"
                >
                  Website
                </Label>
                <div className="relative mt-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    value={userData?.website || ""}
                    onChange={handleChange}
                    className="pl-10 h-11 focus-ring"
                    placeholder="https://yourwebsite.com"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="p-6 bg-card rounded-2xl shadow-card">
            <h2 className="text-xl font-semibold mb-6 text-foreground">
              Account Information
            </h2>
            <div>
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground/90"
              >
                Email
              </Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={currentUserEmail || "Loading..."}
                  className="pl-10 h-11 bg-muted/50 border-muted/30 cursor-not-allowed"
                  placeholder="your.email@example.com"
                  disabled
                  readOnly
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your email is not shown on your public profile. Contact support
                to change it.
              </p>
            </div>
          </section>

          <div className="flex justify-end pt-6 border-t mt-8">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-6 mr-3 focus-ring"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              className="rounded-full px-8 bg-primary hover:bg-primary/90 focus-ring"
              disabled={
                isSaving ||
                (!!usernameError && userData?.username !== initialUsername) ||
                (userData?.username &&
                  userData.username.trim().length < 3 &&
                  userData.username.trim() !== initialUsername) ||
                (userData?.username &&
                  !/^[a-zA-Z0-9_.]+$/.test(userData.username.trim()))
              }
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Save className="mr-2 h-5 w-5" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
