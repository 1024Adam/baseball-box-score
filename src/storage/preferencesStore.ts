import { SheetFormulaMode } from '../domain/types';
import { getStorageDriver, StorageDriver } from './database';

export interface UserPreferences {
  lastUsedPosition: string;
  sheetFormulaMode: SheetFormulaMode;
  appsScriptWebhookUrl: string;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  lastUsedPosition: 'SS',
  sheetFormulaMode: 'blank_for_arrayformula',
  appsScriptWebhookUrl: '',
};

const PREF_KEYS = {
  lastUsedPosition: 'lastUsedPosition',
  sheetFormulaMode: 'sheetFormulaMode',
  appsScriptWebhookUrl: 'appsScriptWebhookUrl',
} as const;

function isValidFormulaMode(val: string | null): val is SheetFormulaMode {
  return (
    val === 'computed_values' ||
    val === 'blank_for_arrayformula' ||
    val === 'webhook_preserve_formulas'
  );
}

export class PreferencesStore {
  private customDriver?: StorageDriver;

  constructor(driver?: StorageDriver) {
    this.customDriver = driver;
  }

  private async driver(): Promise<StorageDriver> {
    if (this.customDriver) {
      await this.customDriver.init();
      return this.customDriver;
    }
    return getStorageDriver();
  }

  async getPreferences(): Promise<UserPreferences> {
    const store = await this.driver();
    const [lastUsedPosition, sheetFormulaMode, appsScriptWebhookUrl] =
      await Promise.all([
        store.getPreference(PREF_KEYS.lastUsedPosition),
        store.getPreference(PREF_KEYS.sheetFormulaMode),
        store.getPreference(PREF_KEYS.appsScriptWebhookUrl),
      ]);

    return {
      lastUsedPosition:
        lastUsedPosition?.trim() || DEFAULT_USER_PREFERENCES.lastUsedPosition,
      sheetFormulaMode: isValidFormulaMode(sheetFormulaMode)
        ? sheetFormulaMode
        : DEFAULT_USER_PREFERENCES.sheetFormulaMode,
      appsScriptWebhookUrl:
        appsScriptWebhookUrl?.trim() ??
        DEFAULT_USER_PREFERENCES.appsScriptWebhookUrl,
    };
  }

  async updatePreferences(
    patch: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const store = await this.driver();
    const now = new Date().toISOString();

    if (patch.lastUsedPosition !== undefined) {
      await store.setPreference(
        PREF_KEYS.lastUsedPosition,
        patch.lastUsedPosition.trim() || DEFAULT_USER_PREFERENCES.lastUsedPosition,
        now
      );
    }

    if (patch.sheetFormulaMode !== undefined) {
      await store.setPreference(
        PREF_KEYS.sheetFormulaMode,
        patch.sheetFormulaMode,
        now
      );
    }

    if (patch.appsScriptWebhookUrl !== undefined) {
      await store.setPreference(
        PREF_KEYS.appsScriptWebhookUrl,
        patch.appsScriptWebhookUrl.trim(),
        now
      );
    }

    return this.getPreferences();
  }

  async setLastUsedPosition(position: string): Promise<void> {
    await this.updatePreferences({ lastUsedPosition: position });
  }

  async setSheetFormulaMode(mode: SheetFormulaMode): Promise<void> {
    await this.updatePreferences({ sheetFormulaMode: mode });
  }

  async setAppsScriptWebhookUrl(url: string): Promise<void> {
    await this.updatePreferences({ appsScriptWebhookUrl: url });
  }
}

export const defaultPreferencesStore = new PreferencesStore();
