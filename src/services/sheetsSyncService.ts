import { getTodayDateString } from '../domain/liveGameHelpers';
import {
  SheetFormatterOptions,
  toCsvDocument,
  toTsvRow,
} from '../domain/sheetFormatter';
import { SheetGameRow } from '../domain/types';

function isWebBrowserEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    !(typeof navigator !== 'undefined' && navigator.product === 'ReactNative')
  );
}

export interface CopyRowResult {
  tsv: string;
  copiedToClipboard: boolean;
  message: string;
}

export interface CsvExportResult {
  filename: string;
  csvContent: string;
  sharedOrDownloaded: boolean;
  message: string;
}

export interface ClipboardAdapter {
  setStringAsync(text: string): Promise<boolean>;
}

const defaultClipboardAdapter: ClipboardAdapter = {
  async setStringAsync(text: string): Promise<boolean> {
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(text);
      return true;
    } catch {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      return false;
    }
  },
};

/**
 * Copies a single 23-column tab-separated (`\t`) game row to the device/browser clipboard.
 */
export async function copyRowToClipboard(
  row: SheetGameRow,
  options: SheetFormatterOptions = { formulaMode: 'blank_for_arrayformula' },
  clipboard: ClipboardAdapter = defaultClipboardAdapter
): Promise<CopyRowResult> {
  const tsv = toTsvRow(row, options);
  const copiedToClipboard = await clipboard.setStringAsync(tsv);

  return {
    tsv,
    copiedToClipboard,
    message: copiedToClipboard
      ? 'Copied 23-column row! Paste into Column A in Google Sheets.'
      : 'Generated 23-column TSV row (clipboard access unavailable).',
  };
}

/**
 * Exports one or more `SheetGameRow` records as a `.csv` file:
 * - On Web: triggers a browser file download.
 * - On Native iOS/Android: writes to cache directory via `expo-file-system` and opens the Share Sheet via `expo-sharing`.
 */
export async function exportGamesToCsv(
  rows: readonly SheetGameRow[],
  options: SheetFormatterOptions & { filename?: string } = {}
): Promise<CsvExportResult> {
  const csvContent = toCsvDocument(rows, options);
  const dateSuffix =
    rows.length === 1 && rows[0].date ? rows[0].date : getTodayDateString();
  const filename = options.filename ?? `baseball-box-score-${dateSuffix}.csv`;

  if (isWebBrowserEnvironment()) {
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.setAttribute('download', filename);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      return {
        filename,
        csvContent,
        sharedOrDownloaded: true,
        message: `Downloaded ${filename} (${rows.length} game${
          rows.length === 1 ? '' : 's'
        }).`,
      };
    } catch {
      return {
        filename,
        csvContent,
        sharedOrDownloaded: false,
        message: `Prepared CSV export (${rows.length} game${
          rows.length === 1 ? '' : 's'
        }).`,
      };
    }
  }

  try {
    const { File, Paths } = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    const file = new File(Paths.cache, filename);
    await file.write(csvContent);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Baseball Box Score CSV',
        UTI: 'public.comma-separated-values-text',
      });
      return {
        filename,
        csvContent,
        sharedOrDownloaded: true,
        message: `Shared ${filename}.`,
      };
    }
  } catch {
    // Fallback when running in headless Node tests
  }

  return {
    filename,
    csvContent,
    sharedOrDownloaded: false,
    message: `Prepared ${filename} (${rows.length} game${
      rows.length === 1 ? '' : 's'
    }).`,
  };
}
