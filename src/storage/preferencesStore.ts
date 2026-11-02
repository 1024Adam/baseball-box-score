import { getStorageDriver, StorageDriver } from './database';

export interface UserPreferences {
  lastUsedPosition: string;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  lastUsedPosition: 'RCF',
};

const PREF_KEYS = {
  lastUsedPosition: 'lastUsedPosition',
} as const;

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
    const lastUsedPosition = await store.getPreference(
      PREF_KEYS.lastUsedPosition
    );

    return {
      lastUsedPosition:
        lastUsedPosition?.trim() || DEFAULT_USER_PREFERENCES.lastUsedPosition,
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
        patch.lastUsedPosition.trim() ||
          DEFAULT_USER_PREFERENCES.lastUsedPosition,
        now
      );
    }

    return this.getPreferences();
  }

  async setLastUsedPosition(position: string): Promise<void> {
    await this.updatePreferences({ lastUsedPosition: position });
  }
}

export const defaultPreferencesStore = new PreferencesStore();
