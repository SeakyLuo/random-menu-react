import { useCallback } from 'react';
import { useMenu } from './MenuProvider';
import type { MenuData } from './menu';

export interface ImportStatus {
  phase: 'idle' | 'extracting' | 'validating' | 'completed' | 'failed';
  jobId?: string;
  files?: number;
  bytes?: number;
  totalFiles?: number;
  totalBytes?: number;
  error?: string;
}
export interface LibraryInfo {
  available: boolean;
  generation?: string;
  counts: Record<string, number>;
  import: ImportStatus;
}
export interface AuraiFiles {
  info(): Promise<LibraryInfo>;
  importArchive(): Promise<ImportStatus & { cancelled?: boolean }>;
  importStatus(): Promise<ImportStatus>;
  readDocument(name: string): Promise<MenuData>;
}

export const fileHost = () => window.AuraiHTML?.files;

/** The UI execution boundary preserves original error text and reports via toast. */
export function useFileAction() {
  const { notify } = useMenu();
  return useCallback(async (action: () => Promise<void>, onFailure?: () => void) => {
    try { await action(); }
    catch (error) { notify(error instanceof Error ? error.message : String(error)); onFailure?.(); }
  }, [notify]);
}
