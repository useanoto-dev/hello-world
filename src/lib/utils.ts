import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a URL-safe slug from store name + unique ID
 * Format: nome-do-estabelecimento-abc123
 * @param name - Store name
 * @param storeId - Store UUID (uses first 6 chars for uniqueness)
 */
export function generateStoreSlug(name: string, storeId?: string): string {
  const nameSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  // Add unique ID suffix (first 6 chars of store ID or random)
  const uniqueId = storeId?.slice(0, 6) || Math.random().toString(36).slice(2, 8);
  return `${nameSlug}-${uniqueId}`;
}
