export interface Pin {
  id: string;
  alt: string;
  width: number;
  height: number;
  // The actual src will be constructed using width and height for placeholders
  // For real images, this would be the direct URL
  placeholderId: string; // Unique identifier for placeholder generation if needed
  aiHint: string;
}
