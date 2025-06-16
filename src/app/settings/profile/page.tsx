
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, UserCircle, Mail, Globe, Briefcase, MapPin, Loader2 } from 'lucide-react';
import AppHeader from '@/components/app-header';
import { useToast } from '@/hooks/use-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { fetchProfileById, updateProfile, checkUsernameAvailability } from '@/services/profileService';
import type { TablesUpdate } from '@/types/supabase';

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
  const [initialUsername, setInitialUsername] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);


  useEffect(() => {
    const getUserAndProfile = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        const { profile, error } = await fetchProfileById(session.user.id);
        if (error || !profile) {
          toast({ variant: 'destructive', title: 'Error fetching profile', description: error || 'Could not load your profile.' });
        } else {
          setUserData(profile);
          setAvatarPreview(profile.avatar_url || null);
          setInitialUsername(profile.username || null);
        }
      } else {
        toast({ variant: 'destructive', title: 'Not Authenticated', description: 'Please log in.' });
        router.push('/login');
      }
      setIsLoading(false);
    };
    getUserAndProfile();
  }, [supabase.auth, router, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
    if (name === 'username') {
      setUsernameError(null); // Clear error on change
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: 'destructive', title: 'File too large', description: 'Avatar image must be less than 2MB.' });
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
    if (userData.username && userData.username !== initialUsername) {
      const { available, error } = await checkUsernameAvailability(userData.username);
      if (error) {
        setUsernameError(error);
      } else if (!available) {
        setUsernameError('This username is already taken.');
      } else {
        setUsernameError(null);
      }
    } else {
      setUsernameError(null);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      toast({ variant: 'destructive', title: 'Error', description: 'User session not found.' });
      return;
    }
     if (usernameError) {
      toast({ variant: 'destructive', title: 'Validation Error', description: usernameError });
      return;
    }

    setIsSaving(true);
    let avatarPublicUrl = userData.avatar_url;

    if (avatarFile) {
      const fileName = `${currentUserId}/${Date.now()}_${avatarFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars') // Ensure you have an 'avatars' bucket in Supabase Storage
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) {
        toast({ variant: 'destructive', title: 'Avatar Upload Failed', description: uploadError.message });
        setIsSaving(false);
        return;
      }
      // Get public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
      avatarPublicUrl = urlData.publicUrl;
    }

    const updates: TablesUpdate<'profiles'> = {
      full_name: userData.full_name || null,
      username: userData.username || null,
      bio: userData.bio || null,
      website: userData.website || null,
      avatar_url: avatarPublicUrl || null,
      // id and created_at are not updated here
    };
    
    // Filter out undefined values to avoid sending them in the update
    const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));


    const { profile, error: updateError } = await updateProfile(currentUserId, filteredUpdates);

    if (updateError) {
      toast({ variant: 'destructive', title: 'Profile Update Failed', description: updateError });
    } else if (profile) {
      setUserData(profile);
      setInitialUsername(profile.username || null);
      if(avatarPublicUrl && avatarPublicUrl !== userData.avatar_url) setAvatarPreview(avatarPublicUrl);
      setAvatarFile(null); // Clear staged file
      toast({ title: 'Profile Updated Successfully!' });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col animate-fade-in-up">
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-10 w-1/2 mb-10 rounded-lg" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 bg-card rounded-2xl shadow-card mb-10">
                <Skeleton className="h-6 w-1/3 mb-6 rounded-md" />
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in-up">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold font-headline text-foreground">Profile Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your public profile information.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-10">
            <section className="p-6 bg-card rounded-2xl shadow-card">
              <h2 className="text-xl font-semibold mb-1 text-foreground">Profile Picture</h2>
              <p className="text-sm text-muted-foreground mb-6">Displayed on your profile and next to your pins.</p>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-secondary">
                    <AvatarImage src={avatarPreview || undefined} alt={userData.full_name || userData.username || 'User'} data-ai-hint="profile avatar large settings"/>
                    <AvatarFallback className="text-4xl">{userData.full_name?.[0]?.toUpperCase() || userData.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-10 w-10 border-2 border-card shadow-md hover:bg-muted focus-ring"
                    onClick={() => document.getElementById('avatarUpload')?.click()}
                    aria-label="Change profile picture"
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                  <Input
                    id="avatarUpload"
                    type="file"
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <Button type="button" variant="outline" className="rounded-full focus-ring" onClick={() => document.getElementById('avatarUpload')?.click()}>
                    Upload New Picture
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">PNG, JPG, GIF. Max 2MB.</p>
                </div>
              </div>
            </section>

            <section className="p-6 bg-card rounded-2xl shadow-card">
              <h2 className="text-xl font-semibold mb-6 text-foreground">Public Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <Label htmlFor="full_name" className="text-sm font-medium text-foreground/90">Full Name</Label>
                   <div className="relative mt-1">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input id="full_name" name="full_name" value={userData.full_name || ''} onChange={handleChange} className="pl-10 h-11 focus-ring" placeholder="E.g. Jane Doe" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="username" className="text-sm font-medium text-foreground/90">Username</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">@</span>
                    <Input 
                      id="username" 
                      name="username" 
                      value={userData.username || ''} 
                      onChange={handleChange} 
                      onBlur={handleUsernameBlur}
                      className={`pl-7 h-11 focus-ring ${usernameError ? 'border-destructive' : ''}`} 
                      placeholder="yourusername" 
                      aria-describedby="username-error"
                    />
                  </div>
                  {usernameError && <p id="username-error" className="text-xs text-destructive mt-1">{usernameError}</p>}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="bio" className="text-sm font-medium text-foreground/90">Bio</Label>
                  <Textarea id="bio" name="bio" value={userData.bio || ''} onChange={handleChange} rows={3} className="mt-1 focus-ring" placeholder="Tell us a little about yourself..." />
                  <p className="text-xs text-muted-foreground mt-1">Appears on your profile.</p>
                </div>
                <div>
                  <Label htmlFor="website" className="text-sm font-medium text-foreground/90">Website</Label>
                   <div className="relative mt-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input id="website" name="website" type="url" value={userData.website || ''} onChange={handleChange} className="pl-10 h-11 focus-ring" placeholder="https://yourwebsite.com" />
                  </div>
                </div>
              </div>
            </section>
            
            {/* Optional Section - could be expanded or removed based on need */}
            <section className="p-6 bg-card rounded-2xl shadow-card">
              <h2 className="text-xl font-semibold mb-6 text-foreground">Account Information</h2>
               <div>
                  <Label htmlFor="email" className="text-sm font-medium text-foreground/90">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input id="email" name="email" type="email" value={currentUserId ? supabase.auth.getUser().then(u => u.data.user?.email || '') : 'Loading...'} className="pl-10 h-11 bg-muted/50 cursor-not-allowed" placeholder="your.email@example.com" disabled readOnly />
                  </div>
                   <p className="text-xs text-muted-foreground mt-1">Your email is not shown on your public profile. Contact support to change it.</p>
                </div>
            </section>

            <div className="flex justify-end pt-4 border-t mt-8">
              <Button type="button" variant="outline" className="rounded-full px-6 mr-3 focus-ring" onClick={() => router.back()} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" size="lg" className="rounded-full px-8 bg-primary hover:bg-primary/90 focus-ring" disabled={isSaving || !!usernameError}>
                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
