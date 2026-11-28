import { describe, expect, it } from 'vitest';
import { describeWeather } from './weather-api.service';

describe('describeWeather', () => {
  it('should translate WMO weather codes to Czech', () => {
    expect(describeWeather(0)).toBe('Jasno');
    expect(describeWeather(2)).toBe('Polojasno');
    expect(describeWeather(3)).toBe('Zataženo');
    expect(describeWeather(45)).toBe('Mlha');
    expect(describeWeather(61)).toBe('Déšť');
    expect(describeWeather(71)).toBe('Sněžení');
    expect(describeWeather(80)).toBe('Přeháňky');
    expect(describeWeather(95)).toBe('Bouřky');
  });
});
