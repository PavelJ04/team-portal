import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Sleduje, zda je zařízení připojené k internetu. */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  private readonly onlineState = signal(navigator.onLine);

  readonly online = this.onlineState.asReadonly();

  constructor() {
    const update = (): void => this.onlineState.set(navigator.onLine);

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    });
  }
}
