import { config } from '@acme/config/env';
import { authRn } from '@acme/config/firebase-rn';

import {
  IAdditionalParam,
  IGenericResponse,
} from '../../base/generic-interfaces';

export interface IQuery {
  metric: {
    __name__?: string;
    handler?: string;
    instance?: string;
    job?: string;
    range?: string;
  };
  value: [number, string];
}

export interface IQueryRange {
  metric: {
    handler?: string;
    instance?: string;
    job?: string;
  };
  values: Array<[number, string]>;
}

export interface IFederatedPrometheus {
  resultType: string;
  result: Array<IQuery | IQueryRange>;
}

class FederatedPrometheusService {
  async fetch(
    endpoint: string,
    query?: string,
    additionalParams?: IAdditionalParam[],
    organizationID?: string,
  ): Promise<IGenericResponse<IFederatedPrometheus>> {
    const url: string = `${config.web.FEDERATED_PROMETHEUS_BASE_URL}/${endpoint}${this.constructPrometheusQueryParams(
      additionalParams,
      query,
    )}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getHeaders(organizationID),
    });
    return this.handleResponse<IFederatedPrometheus>(response);
  }

  private async getHeaders(organizationID?: string): Promise<Headers> {
    const headers = new Headers();
    const user = authRn.currentUser;
    const token = await user?.getIdToken();

    headers.set('Accept', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (organizationID) {
      headers.set('x-organization-id', organizationID);
    }

    return headers;
  }

  protected constructPrometheusQueryParams(
    additionalParams?: IAdditionalParam[],
    query?: string,
  ): string {
    const params = new URLSearchParams();

    additionalParams?.forEach(({ key, value }) => {
      params.append(key, value);
    });

    if (query) {
      params.append('query', query);
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  // TODO - Reuse handleResponse function from base service in a common file
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

export const federatedPrometheusService = new FederatedPrometheusService();
