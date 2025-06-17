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
  Building2,
  MapPin,
} from "lucide-react";
// AppHeader is globally available
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import {
  fetchProfileById,
  updateProfile,
  checkUsernameAvailability,
} from "@/services/profileService";
import type { TablesUpdate } from "@/types/supabase";

export const dynamic = 'force-dynamic'; // Ensure this page is dynamically rendered

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();

  const [userData, setUserData] = useState<Partial<Profile>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [initialUsername, setInitialUsername] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    const getUserAndProfile = async () => {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        setCurrentUserEmail(session.user.email || null);
        const { profile, error } = await fetchProfileById(session.user.id);
        if (error && error !== "Profile not found for this user ID." && error !== "PGRST116") { // PGRST116 means no row found
          toast({
            variant: "destructive",
            title: "Error fetching profile",
            description: error || "Could not load your profile data.",
          });
        } else if (profile) {
          setUserData(profile);
          setAvatarPreview(profile.avatar_url || null);
          setInitialUsername(profile.username || null);
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
    };
    getUserAndProfile();
  }, [supabase.auth, router, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
    if (name === "username") {
      setUsernameError(null);
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
    if (userData.username && userData.username.trim() !== initialUsername) {
      setIsSaving(true); // Show loader for username check
      const { available, error } = await checkUsernameAvailability(
        userData.username.trim(),
      );
      if (error) {
        setUsernameError(error);
      } else if (!available) {
        setUsernameError("This username is already taken.");
      } else {
        setUsernameError(null);
      }
      setIsSaving(false);
    } else if (
      userData.username &&
      userData.username.trim() === initialUsername
    ) {
      setUsernameError(null); // Clear error if username is back to initial
    } else if (!userData.username || userData.username.trim().length === 0) {
      setUsernameError("Username cannot be empty.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User session not found.",
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
    if (usernameError) {
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
      const fileName = `${currentUserId}/avatar-${Date.now()}.${fileExt}`; // Ensure unique path per user.
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars") // Ensure you have an 'avatars' bucket in Supabase Storage
        .upload(fileName, avatarFile, {
          upsert: true, // Use upsert to overwrite if user uploads new avatar with same conventional name
          contentType: avatarFile.type,
        });

      if (uploadError) {
        toast({
          variant: "destructive",
          title: "Avatar Upload Failed",
          description: uploadError.message,
        });
        setIsSaving(false);
        return;
      }
      // Get public URL (ensure RLS allows public read or create signed URL for private)
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);
      avatarPublicUrl = urlData.publicUrl;
    }

    const updates: TablesUpdate<"profiles"> = {
      full_name: userData.full_name?.trim() || null,
      username: userData.username?.trim() || null, // Username should be mandatory from trigger
      bio: userData.bio?.trim() || null,
      website: userData.website?.trim() || null,
      avatar_url: avatarPublicUrl || null,
    };

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    );

    const { profile, error: updateError } = await updateProfile(
      currentUserId,
      filteredUpdates,
    );

    if (updateError) {
      toast({
        variant: "destructive",
        title: "Profile Update Failed",
        description: updateError,
      });
    } else if (profile) {
      setUserData(profile);
      setInitialUsername(profile.username || null); // Update initialUsername after successful save
      if (avatarPublicUrl && avatarPublicUrl !== userData.avatar_url)
        setAvatarPreview(avatarPublicUrl);
      setAvatarFile(null);
      toast({ title: "Profile Updated Successfully!" });
      router.refresh(); // Refresh server components if any depend on this
    }
    setIsSaving(false);
  };

  if (isLoading) {
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
                    alt={userData.full_name || userData.username || "User"}
                    data-ai-hint="profile avatar large settings"
                  />
                  <AvatarFallback className="text-4xl">
                    {userData.full_name?.[0]?.toUpperCase() ||
                      userData.username?.[0]?.toUpperCase() ||
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
                    value={userData.full_name || ""}
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
                    value={userData.username || ""}
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
                  value={userData.bio || ""}
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
                    value={userData.website || ""}
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
              disabled={isSaving || !!usernameError}
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
