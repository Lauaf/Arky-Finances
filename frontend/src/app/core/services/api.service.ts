import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UserContextService } from './user-context.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly userContext = inject(UserContextService);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(
    path: string,
    params?: Record<string, string | number | boolean | null | undefined>,
    includeUserContext = true,
  ): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      params: this.buildParams(params),
      headers: this.buildHeaders(includeUserContext),
    });
  }

  post<T, P>(path: string, payload: P, includeUserContext = true): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, payload, {
      headers: this.buildHeaders(includeUserContext),
    });
  }

  put<T, P>(path: string, payload: P, includeUserContext = true): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, payload, {
      headers: this.buildHeaders(includeUserContext),
    });
  }

  delete(path: string, includeUserContext = true): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${path}`, {
      headers: this.buildHeaders(includeUserContext),
    });
  }

  private buildHeaders(includeUserContext: boolean): HttpHeaders {
    if (!includeUserContext) {
      return new HttpHeaders();
    }

    const activeUserId = this.userContext.activeUserId();
    if (!activeUserId) {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      'X-Arky-User': String(activeUserId),
    });
  }

  private buildParams(params?: Record<string, string | number | boolean | null | undefined>): HttpParams {
    let httpParams = new HttpParams();

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return httpParams;
  }
}
