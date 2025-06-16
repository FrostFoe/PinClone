
export interface Uploader {
  name: string;
  avatarUrl: string;
  username: string;
}

export interface Pin {
  id: string;
  alt: string;
  width: number;
  height: number;
  placeholderId: string; 
  aiHint: string;
  title?: string;
  description?: string;
  uploader?: Uploader;
  likes?: number;
}
