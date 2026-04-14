import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private readonly storageKey = 'arky-finances-active-user-id';
  readonly activeUserId = signal<number | null>(this.readStoredUserId());

  setActiveUserId(userId: number | null): void {
    this.activeUserId.set(userId);
    if (typeof window === 'undefined') {
      return;
    }

    if (userId === null) {
      window.localStorage.removeItem(this.storageKey);
      return;
    }

    window.localStorage.setItem(this.storageKey, String(userId));
  }

  private readStoredUserId(): number | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const rawValue = window.localStorage.getItem(this.storageKey);
    if (!rawValue) {
      return null;
    }
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
