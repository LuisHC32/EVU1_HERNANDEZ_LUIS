import * as Location from 'expo-location';
import { PermissionsAndroid, Platform } from 'react-native';

import type { TaskLocation } from '../types/Task';

export type LocationCapture = {
  location: TaskLocation | null;
  denied: boolean;
};

function formatAddress(place: Location.LocationGeocodedAddress | undefined): string | undefined {
  const formatted = place?.formattedAddress?.trim();
  if (formatted) {
    return formatted;
  }
  if (!place) {
    return undefined;
  }

  const street = [place.street, place.streetNumber]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');
  const parts = [street, place.city?.trim(), place.region?.trim()].filter(
    (part): part is string => Boolean(part),
  );

  return parts.length > 0 ? parts.join(', ') : undefined;
}

async function requestAndroidLocation(): Promise<boolean> {
  const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
  const result = await PermissionsAndroid.requestMultiple([fine, coarse]);
  return result[fine] === PermissionsAndroid.RESULTS.GRANTED || result[coarse] === PermissionsAndroid.RESULTS.GRANTED;
}

export async function getCurrentLocation(): Promise<LocationCapture> {
  try {
    if (Platform.OS === 'android') {
      const nativeGranted = await requestAndroidLocation();
      if (!nativeGranted) {
        return { location: null, denied: true };
      }
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return { location: null, denied: true };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;
    let address: string | undefined;
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      address = formatAddress(places[0]);
    } catch {
      address = undefined;
    }

    return {
      location: address ? { latitude, longitude, address } : { latitude, longitude },
      denied: false,
    };
  } catch {
    return { location: null, denied: false };
  }
}
