import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

export interface WeatherForecast {
  place: string;
  date: string;
  tempMax: number;
  tempMin: number;
  /** Pravděpodobnost srážek v procentech; null, pokud ji API nevrátilo. */
  precipitation: number | null;
  description: string;
}

interface GeocodingResponse {
  results?: { name: string; latitude: number; longitude: number }[];
}

interface ForecastResponse {
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
  };
}

/** Předpověď počasí z veřejného REST API Open-Meteo (bez API klíče). */
@Injectable({ providedIn: 'root' })
export class WeatherApiService {
  private readonly http = inject(HttpClient);
  private readonly geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
  private readonly forecastUrl = 'https://api.open-meteo.com/v1/forecast';

  /**
   * Vrátí předpověď pro město a den (YYYY-MM-DD).
   * null znamená, že město nebylo nalezeno nebo pro daný den nejsou data.
   */
  async getForecast(city: string, date: string): Promise<WeatherForecast | null> {
    const geocoding = await firstValueFrom(
      this.http
        .get<GeocodingResponse>(this.geocodingUrl, {
          params: { name: city, count: 1, language: 'cs', format: 'json' },
        })
        .pipe(timeout(10000)),
    );

    const place = geocoding.results?.[0];
    if (!place) {
      return null;
    }

    const forecast = await firstValueFrom(
      this.http
        .get<ForecastResponse>(this.forecastUrl, {
          params: {
            latitude: place.latitude,
            longitude: place.longitude,
            daily:
              'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
            timezone: 'auto',
            start_date: date,
            end_date: date,
          },
        })
        .pipe(timeout(10000)),
    );

    const daily = forecast.daily;
    if (!daily || daily.time.length === 0) {
      return null;
    }

    return {
      place: place.name,
      date: daily.time[0],
      tempMax: Math.round(daily.temperature_2m_max[0]),
      tempMin: Math.round(daily.temperature_2m_min[0]),
      precipitation: daily.precipitation_probability_max[0] ?? null,
      description: describeWeather(daily.weather_code[0]),
    };
  }
}

/** Převod kódu počasí WMO na krátký český popis. */
export function describeWeather(code: number): string {
  if (code === 0) {
    return 'Jasno';
  }
  if (code <= 2) {
    return 'Polojasno';
  }
  if (code === 3) {
    return 'Zataženo';
  }
  if (code <= 48) {
    return 'Mlha';
  }
  if (code <= 57) {
    return 'Mrholení';
  }
  if (code <= 67) {
    return 'Déšť';
  }
  if (code <= 77) {
    return 'Sněžení';
  }
  if (code <= 82) {
    return 'Přeháňky';
  }
  if (code <= 86) {
    return 'Sněhové přeháňky';
  }
  return 'Bouřky';
}
