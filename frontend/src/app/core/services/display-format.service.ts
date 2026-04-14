import { Injectable, inject } from '@angular/core';

import { UserContextService } from './user-context.service';

@Injectable({ providedIn: 'root' })
export class DisplayFormatService {
  private readonly userContext = inject(UserContextService);

  formatCurrency(value: number, currency?: string): string {
    const locale = this.userContext.locale();
    const resolvedCurrency = (currency || this.userContext.baseCurrency() || 'ARS').toUpperCase();

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: resolvedCurrency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${this.formatNumber(value)} ${resolvedCurrency}`;
    }
  }

  formatMonth(value: string): string {
    const [year, month] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(this.userContext.locale(), {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat(this.userContext.locale(), {
      maximumFractionDigits: 0,
    }).format(value);
  }
}
