import type { IPrometheus } from '@acme/services/api/prometheus-management/prometheus';
import type { IGenericResponse } from '@acme/services/base/generic-interfaces';
import {
  metricPointReading,
  singlePointReading,
} from '@/services/prometheus/horse-readings';

function response(
  result: IPrometheus['result'],
): IGenericResponse<IPrometheus> {
  return {
    status: 'success',
    status_code: 200,
    type: 'success',
    params: [],
    data: { resultType: 'vector', result },
  };
}

describe('singlePointReading', () => {
  it('returns the value and observation time for one horse-tagged result', () => {
    expect(
      singlePointReading(
        response([
          {
            metric: { instance: 'localhost:9898' },
            value: [1_776_460_800, '112.5'],
          },
        ]),
      ),
    ).toEqual({ value: 112.5, observedAt: 1_776_460_800 });
  });

  it('does not guess when more than one horse result is present', () => {
    expect(
      singlePointReading(
        response([
          { metric: { instance: 'horse-0' }, value: [1_776_460_800, '80'] },
          { metric: { instance: 'horse-1' }, value: [1_776_460_800, '240'] },
        ]),
      ),
    ).toBeUndefined();
  });

  it('rejects missing and non-numeric results', () => {
    expect(singlePointReading(response([]))).toBeUndefined();
    expect(
      singlePointReading(
        response([{ metric: {}, value: [1_776_460_800, 'NaN'] }]),
      ),
    ).toBeUndefined();
  });
});

describe('metricPointReading', () => {
  it('selects a sensor by metric name rather than response order', () => {
    const data = response([
      {
        metric: { __name__: 'average_volume' },
        value: [1_776_460_800, '45'],
      },
      {
        metric: { __name__: 'external_temperature' },
        value: [1_776_460_801, '20'],
      },
    ]);

    expect(metricPointReading(data, 'external_temperature')).toEqual({
      value: 20,
      observedAt: 1_776_460_801,
    });
  });
});
