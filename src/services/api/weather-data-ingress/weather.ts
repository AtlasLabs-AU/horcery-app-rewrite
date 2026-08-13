import GenericService from '../../base/generic-service';

export interface IWeather {
  id?: string;
  organizationId?: string;
  deletedByCascade?: boolean;
  createdAt?: string;
  updatedAt?: string;
  cityId?: number;
  cityName?: string;
  temperature?: number;
  humidity?: number;
  aqi?: number;
  weather_type?: string;
  weather_description?: string;
  weather_image?: string;
}

class WeatherService extends GenericService<IWeather> {
  endPointURL: string =
    'weather_data_management/api/weather_data_ingress/weather_data';
}

export const weatherService = new WeatherService();
