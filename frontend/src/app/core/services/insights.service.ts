import { Injectable, inject } from '@angular/core';

import { DashboardResponse, ProjectionResponse, RecommendationResponse } from '../models/finance.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly api = inject(ApiService);

  getDashboard(scenarioId?: number | null) {
    return this.api.get<DashboardResponse>('/insights/dashboard', {
      scenario_id: scenarioId ?? undefined,
    });
  }

  getProjection(months = 12, scenarioId?: number | null) {
    return this.api.get<ProjectionResponse>('/insights/projection', {
      scenario_id: scenarioId ?? undefined,
      months,
    });
  }

  getRecommendation(scenarioId?: number | null) {
    return this.api.get<RecommendationResponse>('/insights/recommendation', {
      scenario_id: scenarioId ?? undefined,
    });
  }
}
