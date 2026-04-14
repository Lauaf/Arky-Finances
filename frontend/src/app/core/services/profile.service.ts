import { Injectable, inject } from '@angular/core';

import { Profile, ProfilePayload } from '../models/finance.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ApiService);

  getProfile() {
    return this.api.get<Profile>('/profile');
  }

  updateProfile(payload: ProfilePayload) {
    return this.api.put<Profile, ProfilePayload>('/profile', payload);
  }
}
