import { Injectable, inject } from '@angular/core';

import { WorkspaceUser, WorkspaceUserPayload } from '../models/finance.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get<WorkspaceUser[]>('/users');
  }

  create(payload: WorkspaceUserPayload) {
    return this.api.post<WorkspaceUser, WorkspaceUserPayload>('/users', payload, false);
  }

  update(id: number, payload: WorkspaceUserPayload) {
    return this.api.put<WorkspaceUser, WorkspaceUserPayload>(`/users/${id}`, payload, false);
  }

  remove(id: number) {
    return this.api.delete(`/users/${id}`, false);
  }
}
