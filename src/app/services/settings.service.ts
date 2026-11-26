import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

interface StoredSettings {
  darkMode: boolean;
  lastEmail: string;
  reminders: boolean;
}

/** Nastavení uložené v zařízení pomocí Capacitor Preferences. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storageKey = 'team-portal-settings';
  private readonly darkModeState = signal(false);
  private readonly lastEmailState = signal('');
  private readonly remindersState = signal(false);
  private initializationPromise: Promise<void> | null = null;

  readonly darkMode = this.darkModeState.asReadonly();
  /** E-mail posledního přihlášení; předvyplní přihlašovací formulář. */
  readonly lastEmail = this.lastEmailState.asReadonly();
  /** Zda posílat připomínky akcí, na které hráč potvrdil účast. */
  readonly reminders = this.remindersState.asReadonly();

  initialize(): Promise<void> {
    this.initializationPromise ??= this.load();
    return this.initializationPromise;
  }

  async setDarkMode(enabled: boolean): Promise<void> {
    await this.initialize();
    this.darkModeState.set(enabled);
    this.applyTheme();
    await this.persist();
  }

  async setLastEmail(email: string): Promise<void> {
    await this.initialize();
    this.lastEmailState.set(email);
    await this.persist();
  }

  async setReminders(enabled: boolean): Promise<void> {
    await this.initialize();
    this.remindersState.set(enabled);
    await this.persist();
  }

  private async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: this.storageKey });
      if (value !== null) {
        const parsed = JSON.parse(value) as Partial<StoredSettings>;
        this.darkModeState.set(parsed.darkMode === true);
        this.lastEmailState.set(typeof parsed.lastEmail === 'string' ? parsed.lastEmail : '');
        this.remindersState.set(parsed.reminders === true);
      }
    } catch (error) {
      console.error('Nastavení se nepodařilo načíst.', error);
    }

    this.applyTheme();
  }

  private async persist(): Promise<void> {
    const settings: StoredSettings = {
      darkMode: this.darkModeState(),
      lastEmail: this.lastEmailState(),
      reminders: this.remindersState(),
    };

    await Preferences.set({ key: this.storageKey, value: JSON.stringify(settings) });
  }

  /** Třídu `ion-palette-dark` používá Ionic paleta `dark.class.css`. */
  private applyTheme(): void {
    document.documentElement.classList.toggle('ion-palette-dark', this.darkModeState());
  }
}
