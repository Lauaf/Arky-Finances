import { Injectable, inject } from '@angular/core';

import { Income, IncomePayload } from '../models/finance.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get<Income[]>('/incomes');
  }

  create(payload: IncomePayload) {
    return this.api.post<Income, IncomePayload>('/incomes', payload);
  }

  update(id: number, payload: IncomePayload) {
    return this.api.put<Income, IncomePayload>(`/incomes/${id}`, payload);
  }

  remove(id: number) {
    return this.api.delete(`/incomes/${id}`);
  }
}
