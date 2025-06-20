
// ==========================================================================================
// !! CRITICAL SUPABASE SETUP FOR PIN CREATION !!
// ==========================================================================================
// THIS PAGE REQUIRES A SUPABASE STORAGE BUCKET NAMED 'pins'.
//
// 1. CREATE 'pins' BUCKET IN SUPABASE STORAGE:
//    - Go to your Supabase Project Dashboard -> Storage -> Buckets.
//    - Click 'Create new bucket'.
//    - Bucket name: pins (all lowercase)
//    - Toggle 'Public bucket' to ON. (This allows public read access for images).
//    - Click 'Create bucket'.
//
// 2. APPLY ROW LEVEL SECURITY (RLS) POLICIES FOR STORAGE UPLOADS:
//    - The `sql/schema.sql` file in this project contains the necessary RLS policies
//      for the `storage.objects` table, specifically to allow authenticated users
//      to UPLOAD (INSERT) into the 'pins' bucket.
//    - Ensure you have run the LATEST version of `sql/schema.sql` in your Supabase SQL Editor.
//    - Also ensure RLS is ENABLED on the `storage.objects` table using:
//      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
//      (This is also included in `sql/schema.sql`).
//
// 3. REFRESH SUPABASE SCHEMA CACHE:
//    - After applying SQL changes, go to Supabase Dashboard -> API section -> Click "Reload schema".
//
// IF YOU ENCOUNTER "Bucket not found" ERRORS: You missed step 1.
// IF YOU ENCOUNTER "new row violates row-level security policy" or "permission denied" ERRORS for storage:
//   You missed step 2 or 3, or your RLS policies for storage are not correctly applied.
//   Check the policies in `sql/schema.sql` for `storage.objects` related to the 'pins' bucket.
// ==========================================================================================
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createPin } from "@/services/pinService";
import Image from "next/image";
import { UploadCloud, XCircle, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const pinFormSchema = z.object({
  title: z
    .string()
    .max(100, "Title can be at most 100 characters.")
    .optional()
    .nullable(),
  description: z
    .string()
    .max(500, "Description can be at most 500 characters.")
    .optional()
    .nullable(),
  imageFile: z
    .custom<FileList>((val) => val instanceof FileList, "Image is required.")
    .refine((files) => files.length > 0, "Image is required.")
    .refine(
      (files) => files?.[0]?.size <= MAX_FILE_SIZE_BYTES,
      `Max image size is ${MAX_FILE_SIZE_MB}MB.`,
    )
    .refine(
      (files) =>
        ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          files?.[0]?.type,
        ),
      "Only .jpg, .jpeg, .png, .webp and .gif formats are supported.",
    ),
});

type PinFormValues = z.infer<typeof pinFormSchema>;

export default function CreatePinPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "You must be logged in to create a pin.",
        });
        router.push("/login?redirect=/create");
      } else {
        setCurrentUser(session.user);
      }
    };
    getUser();
  }, [supabase, router, toast]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PinFormValues>({
    resolver: zodResolver(pinFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const imageFile = watch("imageFile");

  useEffect(() => {
    if (imageFile && imageFile.length > 0) {
      const file = imageFile[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      const img = document.createElement("img");
      img.onload = () => {
        setImageDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => {
        console.error("Error loading image for dimensions.");
        setImageDimensions(null);
      };
      img.src = URL.createObjectURL(file);

      return () => {
        if (img.src.startsWith("blob:")) {
          URL.revokeObjectURL(img.src);
        }
      };
    } else {
      setImagePreview(null);
      setImageDimensions(null);
    }
  }, [imageFile]);

  const onSubmit = async (data: PinFormValues) => {
    if (
      !currentUser ||
      !data.imageFile ||
      data.imageFile.length === 0 ||
      !imageDimensions ||
      imageDimensions.width === 0 ||
      imageDimensions.height === 0
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "User not authenticated or image data (including dimensions) missing or invalid.",
      });
      return;
    }
    setIsSubmitting(true);
    setIsUploading(true);

    const file = data.imageFile[0];
    const fileExt = file.name.split(".").pop();
    const filePath = `public/${currentUser.id}/${Date.now()}.${fileExt}`; 

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pins") 
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false, 
          contentType: file.type,
        });

      setIsUploading(false);
      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        let userMessage = "Image upload failed. Please try again.";
        if (uploadError.message.includes("Bucket not found")) {
          userMessage =
            "Image upload failed: Bucket not found. Ensure 'pins' bucket exists and is public (or RLS configured).";
        } else if (uploadError.message.includes("security policy") || uploadError.message.includes("permission denied")) {
          userMessage =
            "Image upload failed: Permission denied. Please check storage security rules (RLS) for the 'pins' bucket in your Supabase dashboard (SQL Editor > `schema.sql`).";
        } else {
          userMessage = `Image upload failed: ${uploadError.message}.`;
        }
        throw new Error(userMessage);
      }

      if (!uploadData || !uploadData.path) {
        throw new Error(
          "Image upload succeeded but no path returned from storage.",
        );
      }

      const { data: urlData } = supabase.storage
        .from("pins")
        .getPublicUrl(uploadData.path);
      const imageUrl = urlData.publicUrl;

      const pinDetails = {
        image_url: imageUrl,
        title: data.title || null,
        description: data.description || null,
        width: imageDimensions.width,
        height: imageDimensions.height,
      };

      const { pin: createdPin, error: createPinError } =
        await createPin(pinDetails);

      if (createPinError || !createdPin) {
        await supabase.storage.from("pins").remove([uploadData.path]);
        console.error("Create pin service error:", createPinError);
        throw new Error(
          createPinError || "Failed to save pin details to database.",
        );
      }

      toast({
        title: "Pin Created!",
        description: "Your pin has been successfully published.",
      });
      reset();
      setImagePreview(null);
      setImageDimensions(null);
      router.refresh(); // Invalidate client-side cache for Server Components
      router.push(`/pin/${createdPin.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading user session...</p>
      </div>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 animate-fade-in-up">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold font-headline text-foreground">
            Create a New Pin
          </h1>
          <p className="text-muted-foreground mt-1">
            Share your inspiration with the world.
          </p>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-card p-6 sm:p-8 rounded-2xl shadow-xl space-y-8"
        >
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="lg:w-1/2 flex flex-col items-center">
              <Controller
                name="imageFile"
                control={control}
                render={({ field: { onChange, onBlur, name, ref } }) => (
                  <Label htmlFor="imageUpload" className="w-full">
                    <div
                      className={`relative aspect-[3/4] w-full border-2 border-dashed rounded-xl flex flex-col justify-center items-center cursor-pointer hover:border-primary transition-colors group
                        ${errors.imageFile ? "border-destructive" : "border-muted-foreground/30"}
                        ${imagePreview ? "border-solid" : ""}`}
                    >
                      {imagePreview ? (
                        <>
                          <Image
                            src={imagePreview}
                            alt="Pin preview"
                            fill
                            sizes="(max-width: 1023px) 100vw, 50vw"
                            style={{ objectFit: "cover" }}
                            className="rounded-xl"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 z-10 rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.preventDefault();
                              setValue("imageFile", new DataTransfer().files, {
                                shouldValidate: true,
                              });
                              setImagePreview(null);
                              setImageDimensions(null);
                            }}
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <UploadCloud
                            className={`h-12 w-12 mx-auto mb-3 transition-colors ${errors.imageFile ? "text-destructive" : "text-muted-foreground/70 group-hover:text-primary"}`}
                          />
                          <p
                            className={`font-medium transition-colors ${errors.imageFile ? "text-destructive" : "text-foreground group-hover:text-primary"}`}
                          >
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, GIF, WEBP up to {MAX_FILE_SIZE_MB}MB
                          </p>
                        </div>
                      )}
                      <Input
                        id="imageUpload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          onChange(e.target.files);
                        }}
                        onBlur={onBlur}
                        name={name}
                        ref={ref}
                        disabled={isSubmitting}
                      />
                    </div>
                  </Label>
                )}
              />
              {errors.imageFile && (
                <p className="text-sm text-destructive mt-2">
                  {errors.imageFile.message}
                </p>
              )}
            </div>

            <div className="lg:w-1/2 space-y-6">
              <div>
                <Label
                  htmlFor="title"
                  className="text-sm font-medium text-foreground/90"
                >
                  Title (Optional)
                </Label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="title"
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Add a title for your pin"
                      className="mt-1 h-11 focus-ring"
                      disabled={isSubmitting}
                    />
                  )}
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-foreground/90"
                >
                  Description (Optional)
                </Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="description"
                      {...field}
                      value={field.value ?? ""}
                      rows={5}
                      className="mt-1 focus-ring resize-none"
                      placeholder="Tell everyone what your pin is about..."
                      maxLength={500}
                      disabled={isSubmitting}
                    />
                  )}
                />
                {errors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-6 mr-3 focus-ring"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              className="rounded-full px-8 bg-primary hover:bg-primary/90 focus-ring"
              disabled={
                isSubmitting ||
                !imageFile ||
                imageFile.length === 0 ||
                !!errors.imageFile ||
                !imageDimensions ||
                imageDimensions.width === 0 ||
                imageDimensions.height === 0
              }
            >
              {(isUploading || isSubmitting) && (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              )}
              {isUploading
                ? "Uploading..."
                : isSubmitting
                  ? "Saving..."
                  : "Publish Pin"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
