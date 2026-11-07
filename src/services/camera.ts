import * as ImagePicker from 'expo-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
};

export type PhotoCapture =
  | { uris: string[] }
  | { uris: null; reason: 'denied' | 'cancelled' | 'error' };

async function capture(
  requestPermission: () => Promise<ImagePicker.PermissionResponse>,
  launch: () => Promise<ImagePicker.ImagePickerResult>,
): Promise<PhotoCapture> {
  try {
    const permission = await requestPermission();
    if (!permission.granted) {
      return { uris: null, reason: 'denied' };
    }

    const result = await launch();
    const uris = result.assets?.flatMap((asset) => (asset.uri ? [asset.uri] : [])) ?? [];
    if (result.canceled || uris.length === 0) {
      return { uris: null, reason: 'cancelled' };
    }

    return { uris };
  } catch {
    return { uris: null, reason: 'error' };
  }
}

export async function takePhoto(): Promise<PhotoCapture> {
  if (Platform.OS === 'android') {
    try {
      const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (status !== PermissionsAndroid.RESULTS.GRANTED) {
        return { uris: null, reason: 'denied' };
      }
    } catch {
      return { uris: null, reason: 'error' };
    }
  }

  return capture(
    () => ImagePicker.requestCameraPermissionsAsync(),
    () => ImagePicker.launchCameraAsync(OPTIONS),
  );
}

export function pickFromGallery(): Promise<PhotoCapture> {
  return capture(
    () => ImagePicker.requestMediaLibraryPermissionsAsync(),
    () => ImagePicker.launchImageLibraryAsync({ ...OPTIONS, allowsMultipleSelection: true }),
  );
}
