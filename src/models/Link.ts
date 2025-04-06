export interface Link {
  id: string;
  name: string;
  url: string;
  description: string;
  imageUrl?: string; // Optional image URL provided by the user
  createdAt: number;
  updatedAt: number;
} 