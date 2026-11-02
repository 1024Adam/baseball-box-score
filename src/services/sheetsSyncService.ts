import {
  SheetFormatterOptions,
  toCsvDocument,
  toTsvRow,
  toWebhookPayload,
  WebhookRowPayload,
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

export interface WebhookPushResult {
  ok: boolean;
  rowNumber?: number;
  sheetName?: string;
  message: string;
  payload: WebhookRowPayload;
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
    rows.length === 1 && rows[0].date
      ? rows[0].date
      : new Date().toISOString().slice(0, 10);
  const filename =
    options.filename ?? `baseball-box-score-${dateSuffix}.csv`;

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

/**
 * Pushes a 23-column game row to a deployed Google Apps Script Web App URL via HTTPS POST.
 */
export async function pushGameToWebhook(
  row: SheetGameRow,
  webhookUrl: string,
  options: SheetFormatterOptions = {},
  fetchImpl: typeof fetch = fetch
): Promise<WebhookPushResult> {
  const trimmedUrl = webhookUrl.trim();
  const payload = toWebhookPayload(row, {
    formulaMode: options.formulaMode ?? 'webhook_preserve_formulas',
  });

  if (!trimmedUrl) {
    return {
      ok: false,
      message:
        'No Google Apps Script Webhook URL configured yet. Paste your URL below or use Copy Row.',
      payload,
    };
  }

  if (!/^https?:\/\//i.test(trimmedUrl)) {
    return {
      ok: false,
      message: 'Webhook URL must start with https://',
      payload,
    };
  }

  try {
    const response = await fetchImpl(trimmedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Webhook returned HTTP ${response.status}`,
        payload,
      };
    }

    let parsed: {
      ok?: boolean;
      rowNumber?: number;
      sheetName?: string;
      error?: string;
    } | null = null;
    try {
      const text = await response.text();
      parsed = JSON.parse(text) as {
        ok?: boolean;
        rowNumber?: number;
        sheetName?: string;
        error?: string;
      };
    } catch {
      // Apps Script redirects on web can return opaque/HTML responses if misconfigured
    }

    if (parsed && parsed.ok === false) {
      return {
        ok: false,
        message: parsed.error || 'Apps Script reported an error.',
        payload,
      };
    }

    const rowSuffix = parsed?.rowNumber ? ` (Row #${parsed.rowNumber})` : '';
    return {
      ok: true,
      rowNumber: parsed?.rowNumber,
      sheetName: parsed?.sheetName,
      message: `Pushed 23-column row to Google Sheets${rowSuffix}!`,
      payload,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `Failed to reach Google Sheets webhook: ${errMsg}`,
      payload,
    };
  }
}

/**
 * Tests connectivity to a Google Apps Script Webhook URL without inserting a row.
 */
export async function testWebhookConnection(
  webhookUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: boolean; message: string }> {
  const trimmedUrl = webhookUrl.trim();
  if (!trimmedUrl || !/^https?:\/\//i.test(trimmedUrl)) {
    return {
      ok: false,
      message: 'Enter a valid https:// Apps Script Web App URL first.',
    };
  }

  try {
    const response = await fetchImpl(trimmedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action: 'ping' }),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Webhook returned HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      ok?: boolean;
      message?: string;
      error?: string;
    };
    if (data.ok) {
      return {
        ok: true,
        message: data.message ?? 'Connected to Google Sheets webhook!',
      };
    }
    return {
      ok: false,
      message: data.error ?? 'Webhook responded with an error.',
    };
  } catch (err) {
    return {
      ok: false,
      message: `Connection failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}
