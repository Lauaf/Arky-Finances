import { Injectable, inject } from '@angular/core';

import { Goal, GoalPayload } from '../models/finance.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get<Goal[]>('/goals');
  }

  create(payload: GoalPayload) {
    return this.api.post<Goal, GoalPayload>('/goals', payload);
  }

  update(id: number, payload: GoalPayload) {
    return this.api.put<Goal, GoalPayload>(`/goals/${id}`, payload);
  }

  remove(id: number) {
    return this.api.delete(`/goals/${id}`);
  }
}
