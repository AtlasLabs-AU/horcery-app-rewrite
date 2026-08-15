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
  values: [number, string][];
}

export interface IPrometheus {
  resultType: string;
  result: (IQuery | IQueryRange)[];
}

class PrometheusService {
  async fetch(
    baseURL: string,
    urlAppender: string,
    query?: string,
    additionalParams?: IAdditionalParam[],
    signal?: AbortSignal,
  ): Promise<IGenericResponse<IPrometheus>> {
    const url: string = `${baseURL}${urlAppender}${this.constructPrometheusQueryParams(
      additionalParams,
      query,
    )}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getHeaders(),
      signal,
    });
    return this.handleResponse<IPrometheus>(response);
  }

  private async getHeaders(): Promise<Record<string, string>> {
    return {
      Accept: 'application/json',
    };
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

export const prometheusService = new PrometheusService();
