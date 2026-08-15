import {
  ALLOW_PRODUCTION_WRITES,
  config,
  IS_PRODUCTION_API,
} from '@acme/config/env';
import { authRn } from '@acme/config/firebase-rn';

import {
  IAdditionalParam,
  IFilterSortParams,
  IGenericResponse,
} from './generic-interfaces';

export interface IRequestOptions {
  contentType?: string;
  additionalHeaders?: Record<string, string>;
}

export default abstract class GenericService<T> {
  protected abstract endPointURL: string;
  protected baseURL = config.web.BASE_SERVICE_URL;

  private async getHeaders(
    options?: IRequestOptions,
    forceFreshToken = false,
  ): Promise<Record<string, string>> {
    const user = authRn.currentUser;
    const token = await user?.getIdToken(forceFreshToken);
    const contentType = options?.contentType || 'application/json';

    return {
      Accept: 'application/json',
      'Content-Type': contentType,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.additionalHeaders || {}),
    };
  }

  /**
   * Sends a request, and retries it exactly once with a freshly minted token if
   * the backend answers 401.
   *
   * Expiry is otherwise judged from the device clock, so a clock running behind
   * the issuer makes every request go out with a token the server has already
   * rejected — and nothing here used to notice, leaving every screen stuck on a
   * cached error while the app still looked signed in. A 401 is the server's
   * verdict on the token, so it is worth one forced refresh. If the refresh
   * itself fails the auth layer clears the session and the app signs out; if
   * the retry still 401s the error surfaces to the caller rather than looping.
   */
  private async request(
    url: string,
    init: { method: string; body?: string | FormData },
    options?: IRequestOptions,
  ): Promise<Response> {
    const send = async (forceFreshToken: boolean) =>
      fetch(url, {
        ...init,
        headers: await this.getHeaders(options, forceFreshToken),
      });

    const response = await send(false);
    return response.status === 401 ? send(true) : response;
  }

  private formatRequestBody<B>(
    body: B,
    options?: IRequestOptions,
  ): string | FormData {
    if (options?.contentType === 'multipart/form-data') {
      return body as unknown as FormData;
    } else {
      return JSON.stringify(body);
    }
  }

  /**
   * Write guard for the rewrite.
   *
   * The development environment points at the PRODUCTION API
   * (`EXPO_PUBLIC_BASE_SERVICE_URL=https://api.magichoof.com/`), so the org
   * data we develop against is live customer data. The For You work is
   * read-only by agreement, and this makes that structural: any write against
   * the production backend throws before it reaches the network.
   *
   * Remove this once the rewrite has a non-production backend to write to, or
   * set `EXPO_PUBLIC_ALLOW_PRODUCTION_WRITES=true` for a deliberate, supervised
   * exception.
   */
  private assertWriteAllowed(method: string) {
    if (IS_PRODUCTION_API && !ALLOW_PRODUCTION_WRITES) {
      throw new Error(
        `Blocked ${method} ${this.endPointURL}: the rewrite is pointed at the ` +
          `production API and is read-only for now. See generic-service.ts.`,
      );
    }
  }

  async create(
    body: T,
    options?: IRequestOptions,
  ): Promise<IGenericResponse<T>> {
    this.assertWriteAllowed('POST');
    const response = await this.request(
      `${this.baseURL}${this.endPointURL}`,
      { method: 'POST', body: this.formatRequestBody(body, options) },
      options,
    );
    return this.handleResponse<T>(response);
  }

  async update(
    id: string,
    body: T,
    options?: IRequestOptions,
  ): Promise<IGenericResponse<T>> {
    this.assertWriteAllowed('PUT');
    const response = await this.request(
      `${this.baseURL}${this.endPointURL}/${id}/`,
      { method: 'PUT', body: this.formatRequestBody(body, options) },
      options,
    );
    return this.handleResponse<T>(response);
  }

  async updatePatch(
    id: string,
    body: Partial<T>,
    options?: IRequestOptions,
  ): Promise<IGenericResponse<T>> {
    this.assertWriteAllowed('PATCH');
    const response = await this.request(
      `${this.baseURL}${this.endPointURL}/${id}/`,
      { method: 'PATCH', body: this.formatRequestBody(body, options) },
      options,
    );
    return this.handleResponse<T>(response);
  }

  async delete(id: string, options?: IRequestOptions) {
    this.assertWriteAllowed('DELETE');
    const response = await this.request(
      `${this.baseURL}${this.endPointURL}/${id}/`,
      { method: 'DELETE' },
      options,
    );
    if (response.ok && response.status === 204) {
      return {};
    }
    throw response;
  }

  async fetch(
    id: string,
    filterSortObject?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
    options?: IRequestOptions,
  ): Promise<IGenericResponse<T>> {
    const queryParams = this.constructQueryParams(
      filterSortObject,
      additionalParams,
      query,
    );
    const url = `${this.baseURL}${this.endPointURL}/${id}/${queryParams}`;
    const response = await this.request(url, { method: 'GET' }, options);
    return this.handleResponse<T>(response);
  }

  async fetchAll(
    filterSortObject?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
    options?: IRequestOptions,
  ): Promise<IGenericResponse<T[]>> {
    const queryParams = this.constructQueryParams(
      filterSortObject,
      additionalParams,
      query,
    );
    const url = `${this.baseURL}${this.endPointURL}/${queryParams}`;
    const response = await this.request(url, { method: 'GET' }, options);
    return this.handleResponse<T[]>(response);
  }

  protected constructQueryParams(
    filterSortObject?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ): string {
    const params = new URLSearchParams();

    if (filterSortObject) {
      Object.entries(filterSortObject).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }

    additionalParams?.forEach(({ key, value }) => {
      params.append(key, value);
    });

    if (query) {
      params.append('fields', query.join(','));
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  private async handleResponse<R>(
    response: Response,
  ): Promise<IGenericResponse<R>> {
    const resp = response as any;

    if (!resp.ok && (resp.status < 200 || resp.status >= 300)) {
      throw resp;
    }
    return (await resp.json?.()) as IGenericResponse<R>;
  }
}
