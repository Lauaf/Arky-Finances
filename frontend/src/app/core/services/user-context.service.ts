import { Injectable, signal } from '@angular/core';

import { WorkspaceUser } from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private readonly storageKey = 'arky-finances-active-user-id';
  private readonly userStorageKey = 'arky-finances-active-user';
  private readonly currencyStorageKeyPrefix = 'arky-finances-base-currency';
  readonly activeUserId = signal<number | null>(this.readStoredUserId());
  readonly activeUser = signal<WorkspaceUser | null>(this.readStoredUser());
  readonly baseCurrency = signal<string>(this.readStoredBaseCurrency(this.readStoredUserId()));

  setActiveUserId(userId: number | null): void {
    this.activeUserId.set(userId);
    this.baseCurrency.set(this.readStoredBaseCurrency(userId));
    if (typeof window === 'undefined') {
      return;
    }

    if (userId === null) {
      this.activeUser.set(null);
      window.localStorage.removeItem(this.storageKey);
      window.localStorage.removeItem(this.userStorageKey);
      return;
    }

    window.localStorage.setItem(this.storageKey, String(userId));
  }

  setActiveUser(user: WorkspaceUser | null): void {
    this.activeUser.set(user);
    if (typeof window === 'undefined') {
      return;
    }

    if (user === null) {
      window.localStorage.removeItem(this.userStorageKey);
      return;
    }

    window.localStorage.setItem(this.userStorageKey, JSON.stringify(user));
  }

  setBaseCurrency(currency: string | null): void {
    const userId = this.activeUserId();
    const normalizedCurrency = (currency ?? '').trim().toUpperCase() || 'ARS';
    this.baseCurrency.set(normalizedCurrency);

    if (typeof window === 'undefined' || userId === null) {
      return;
    }

    window.localStorage.setItem(this.currencyStorageKey(userId), normalizedCurrency);
  }

  locale(): string {
    return this.activeUser()?.locale || 'en-US';
  }

  timezone(): string {
    return this.activeUser()?.timezone || 'America/Argentina/Buenos_Aires';
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

  private readStoredUser(): WorkspaceUser | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const rawValue = window.localStorage.getItem(this.userStorageKey);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as WorkspaceUser;
    } catch {
      return null;
    }
  }

  private readStoredBaseCurrency(userId: number | null): string {
    if (typeof window === 'undefined' || userId === null) {
      return 'ARS';
    }

    return window.localStorage.getItem(this.currencyStorageKey(userId)) || 'ARS';
  }

  private currencyStorageKey(userId: number): string {
    return `${this.currencyStorageKeyPrefix}:${userId}`;
  }
}
