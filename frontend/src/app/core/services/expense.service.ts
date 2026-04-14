import { Injectable, inject } from '@angular/core';

import { Expense, ExpensePayload } from '../models/finance.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get<Expense[]>('/expenses');
  }

  create(payload: ExpensePayload) {
    return this.api.post<Expense, ExpensePayload>('/expenses', payload);
  }

  update(id: number, payload: ExpensePayload) {
    return this.api.put<Expense, ExpensePayload>(`/expenses/${id}`, payload);
  }

  remove(id: number) {
    return this.api.delete(`/expenses/${id}`);
  }
}
