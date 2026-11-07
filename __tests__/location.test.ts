import { beforeEach, expect, it, jest } from '@jest/globals';
import * as Location from 'expo-location';

import { getCurrentLocation } from '../src/services/location';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const granted = {
  granted: true,
  canAskAgain: true,
  status: 'granted',
  expires: 'never',
} as Location.LocationPermissionResponse;
const denied = {
  granted: false,
  canAskAgain: false,
  status: 'denied',
  expires: 'never',
} as Location.LocationPermissionResponse;

const requestPermission = jest.mocked(Location.requestForegroundPermissionsAsync);
const currentPosition = jest.mocked(Location.getCurrentPositionAsync);
const reverseGeocode = jest.mocked(Location.reverseGeocodeAsync);

beforeEach(() => {
  jest.clearAllMocks();
});

it('con permiso concedido devuelve latitud, longitud y dirección', async () => {
  requestPermission.mockResolvedValue(granted);
  currentPosition.mockResolvedValue({
    coords: {
      latitude: -33.45,
      longitude: -70.66,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1,
  });
  reverseGeocode.mockResolvedValue([
    {
      formattedAddress: 'Av. Siempre Viva 742, Santiago',
      city: 'Santiago',
      country: 'Chile',
      district: null,
      isoCountryCode: 'CL',
      name: null,
      postalCode: null,
      region: 'Metropolitana',
      street: 'Av. Siempre Viva',
      streetNumber: '742',
      subregion: null,
      timezone: null,
    },
  ]);

  await expect(getCurrentLocation()).resolves.toEqual({
    location: {
      latitude: -33.45,
      longitude: -70.66,
      address: 'Av. Siempre Viva 742, Santiago',
    },
    denied: false,
  });
});

it('si no hay dirección formateada arma una con calle y ciudad', async () => {
  requestPermission.mockResolvedValue(granted);
  currentPosition.mockResolvedValue({
    coords: {
      latitude: 1,
      longitude: 2,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1,
  });
  reverseGeocode.mockResolvedValue([
    {
      formattedAddress: null,
      city: 'Santiago',
      country: null,
      district: null,
      isoCountryCode: null,
      name: null,
      postalCode: null,
      region: 'Metropolitana',
      street: 'Av. Providencia',
      streetNumber: '123',
      subregion: null,
      timezone: null,
    },
  ]);

  await expect(getCurrentLocation()).resolves.toEqual({
    location: {
      latitude: 1,
      longitude: 2,
      address: 'Av. Providencia 123, Santiago, Metropolitana',
    },
    denied: false,
  });
});

it('con permiso negado no lanza y no devuelve ubicación', async () => {
  requestPermission.mockResolvedValue(denied);

  await expect(getCurrentLocation()).resolves.toEqual({ location: null, denied: true });
  expect(currentPosition).not.toHaveBeenCalled();
});

it('si el gps falla devuelve null sin lanzar', async () => {
  requestPermission.mockResolvedValue(granted);
  currentPosition.mockRejectedValue(new Error('gps'));

  await expect(getCurrentLocation()).resolves.toEqual({ location: null, denied: false });
});

it('si el geocodificado falla igual devuelve las coordenadas', async () => {
  requestPermission.mockResolvedValue(granted);
  currentPosition.mockResolvedValue({
    coords: {
      latitude: 4,
      longitude: 5,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1,
  });
  reverseGeocode.mockRejectedValue(new Error('geocode'));

  await expect(getCurrentLocation()).resolves.toEqual({
    location: { latitude: 4, longitude: 5 },
    denied: false,
  });
});
