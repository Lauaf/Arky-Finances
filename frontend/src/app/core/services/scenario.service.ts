import { Injectable, inject } from '@angular/core';

import { Scenario, ScenarioPayload } from '../models/finance.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ScenarioService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get<Scenario[]>('/scenarios');
  }

  update(id: number, payload: ScenarioPayload) {
    return this.api.put<Scenario, ScenarioPayload>(`/scenarios/${id}`, payload);
  }
}
