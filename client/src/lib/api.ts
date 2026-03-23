import type { ApiResponse } from '../types/api';

export interface ApiEnvelope<T> {
  data: ApiResponse<T>;
}

export function apiSuccess<T>(data: T, meta?: ApiResponse<T>['meta'], message?: string): ApiEnvelope<T> {
  return {
    data: {
      success: true,
      data,
      meta,
      message,
    },
  };
}
