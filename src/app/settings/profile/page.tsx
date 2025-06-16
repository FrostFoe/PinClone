
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, UserCircle, Mail, Globe, Briefcase, MapPin } from 'lucide-react';
import AppHeader from '@/components/app-header'; // Assuming AppHeader is used on internal pages

// Mock user data for settings
const initialUserData = {
  name: 'FrostFoe',
  username: 'frostfoe',
  email: 'frost.foe@example.com',
  avatarUrl: 'https://placehold.co/160x160.png?text=FF',
  bio: 'Exploring the digital frontiers, one pixel at a time. Collector of ideas and creator of things.',
  website: 'frostfoe.example.com',
  pronouns: 'they/them',
  location: 'Digital Realm',
  occupation: 'Idea Curator'
};

export default function ProfileSettingsPage() {
  const [userData, setUserData] = useState(initialUserData);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userData.avatarUrl);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        // setUserData(prev => ({ ...prev, avatarUrl: reader.result as string })); // Or upload and set URL
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Profile settings saved:', userData);
    // Here you would typically send data to a backend API
    // Add a toast notification for success
  };

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
            {/* Profile Picture Section */}
            <section className="p-6 bg-card rounded-2xl shadow-card">
              <h2 className="text-xl font-semibold mb-1 text-foreground">Profile Picture</h2>
              <p className="text-sm text-muted-foreground mb-6">This will be displayed on your profile and next to your pins.</p>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-secondary">
                    <AvatarImage src={avatarPreview || undefined} alt={userData.name} data-ai-hint="profile avatar large settings"/>
                    <AvatarFallback className="text-4xl">{userData.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
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
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <Button type="button" variant="outline" className="rounded-full focus-ring" onClick={() => document.getElementById('avatarUpload')?.click()}>
                    Upload New Picture
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. Max size of 800K.</p>
                </div>
              </div>
            </section>

            {/* Public Profile Section */}
            <section className="p-6 bg-card rounded-2xl shadow-card">
              <h2 className="text-xl font-semibold mb-6 text-foreground">Public Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-foreground/90">Full Name</Label>
                   <div className="relative mt-1">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input id="name" name="name" value={userData.name} onChange={handleChange} className="pl-10 h-11 focus-ring" placeholder="E.g. Jane Doe" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="username" className="text-sm font-medium text-foreground/90">Username</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">@</span>
                    <Input id="username" name="username" value={userData.username} onChange={handleChange} className="pl-7 h-11 focus-ring" placeholder="yourusername" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="bio" className="text-sm font-medium text-foreground/90">Bio</Label>
                  <Textarea id="bio" name="bio" value={userData.bio} onChange={handleChange} rows={3} className="mt-1 focus-ring" placeholder="Tell us a little about yourself..." />
                  <p className="text-xs text-muted-foreground mt-1">Appears on your profile.</p>
                </div>
                 <div>
                  <Label htmlFor="pronouns" className="text-sm font-medium text-foreground/90">Pronouns</Label>
                  <Input id="pronouns" name="pronouns" value={userData.pronouns} onChange={handleChange} className="mt-1 h-11 focus-ring" placeholder="E.g. she/her, he/him, they/them" />
                </div>
                <div>
                  <Label htmlFor="website" className="text-sm font-medium text-foreground/90">Website</Label>
                   <div className="relative mt-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input id="website" name="website" type="url" value={userData.website} onChange={handleChange} className="pl-10 h-11 focus-ring" placeholder="https.yourwebsite.com" />
                  </div>
                </div>
              </div>
            </section>
            
            {/* Personal Information Section (can be optional) */}
             <section className="p-6 bg-card rounded-2xl shadow-card">
              <h2 className="text-xl font-semibold mb-6 text-foreground">Personal Information (Optional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-foreground/90">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input id="email" name="email" type="email" value={userData.email} onChange={handleChange} className="pl-10 h-11 focus-ring" placeholder="your.email@example.com" />
                  </div>
                   <p className="text-xs text-muted-foreground mt-1">This will not be shown on your public profile.</p>
                </div>
                 <div>
                  <Label htmlFor="location" className="text-sm font-medium text-foreground/90">Location</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input id="location" name="location" value={userData.location} onChange={handleChange} className="pl-10 h-11 focus-ring" placeholder="City, Country" />
                  </div>
                </div>
                 <div className="md:col-span-2">
                  <Label htmlFor="occupation" className="text-sm font-medium text-foreground/90">Occupation</Label>
                  <div className="relative mt-1">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input id="occupation" name="occupation" value={userData.occupation} onChange={handleChange} className="pl-10 h-11 focus-ring" placeholder="What do you do?" />
                  </div>
                </div>
              </div>
            </section>


            <div className="flex justify-end pt-4 border-t mt-8">
              <Button type="button" variant="outline" className="rounded-full px-6 mr-3 focus-ring">
                Cancel
              </Button>
              <Button type="submit" size="lg" className="rounded-full px-8 bg-primary hover:bg-primary/90 focus-ring">
                <Save className="mr-2 h-5 w-5" /> Save Changes
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
