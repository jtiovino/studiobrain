import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripMarkdown(text: string): string {
  if (!text) return text;

  return (
    text
      // Remove headers (# ## ### etc)
      .replace(/^#{1,6}\s+/gm, '')

      // Remove bold and italic markers
      .replace(/\*\*(.*?)\*\*/g, '$1') // **bold** -> bold
      .replace(/\*(.*?)\*/g, '$1') // *italic* -> italic

      // Clean up any remaining emphasis markers at start/end of lines
      .replace(/^\*+\s*/gm, '• ') // Convert leading * to bullet points
      .replace(/\s*\*+$/gm, '') // Remove trailing *

      // Clean up multiple consecutive spaces while preserving structure
      .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
      .replace(/^\s+$/gm, '') // Remove lines with only whitespace

      // Ensure proper line spacing around sections
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines

      .trim()
  );
}
