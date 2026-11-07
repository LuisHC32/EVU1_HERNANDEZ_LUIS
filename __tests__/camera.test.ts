import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as ImagePicker from 'expo-image-picker';

import { pickFromGallery, takePhoto } from '../src/services/camera';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const granted = {
  granted: true,
  canAskAgain: true,
  status: 'granted',
  expires: 'never',
} as ImagePicker.MediaLibraryPermissionResponse;
const denied = {
  granted: false,
  canAskAgain: false,
  status: 'denied',
  expires: 'never',
} as ImagePicker.MediaLibraryPermissionResponse;
const photo = { canceled: false as const, assets: [{ uri: 'file://photo.jpg', width: 1, height: 1 }] };
const cancelled = { canceled: true as const, assets: null };

const cases = [
  {
    name: 'cámara',
    run: takePhoto,
    request: jest.mocked(ImagePicker.requestCameraPermissionsAsync),
    launch: jest.mocked(ImagePicker.launchCameraAsync),
  },
  {
    name: 'galería',
    run: pickFromGallery,
    request: jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync),
    launch: jest.mocked(ImagePicker.launchImageLibraryAsync),
  },
] as const;

beforeEach(() => {
  jest.clearAllMocks();
});

describe.each(cases)('$name', ({ run, request, launch }) => {
  it('con permiso concedido devuelve la uri', async () => {
    request.mockResolvedValue(granted);
    launch.mockResolvedValue(photo);

    await expect(run()).resolves.toEqual({ uris: ['file://photo.jpg'] });
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it('con permiso negado no lanza y devuelve null', async () => {
    request.mockResolvedValue(denied);

    await expect(run()).resolves.toEqual({ uris: null, reason: 'denied' });
    expect(launch).not.toHaveBeenCalled();
  });

  it('si el usuario cancela devuelve null y no cambia la foto', async () => {
    request.mockResolvedValue(granted);
    launch.mockResolvedValue(cancelled);

    await expect(run()).resolves.toEqual({ uris: null, reason: 'cancelled' });
  });
});

it('si la cámara falla no lanza', async () => {
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue(granted);
  jest.mocked(ImagePicker.launchCameraAsync).mockRejectedValue(new Error('camera'));

  await expect(takePhoto()).resolves.toEqual({ uris: null, reason: 'error' });
});

it('la galería devuelve todas las fotos elegidas', async () => {
  jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue(granted);
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: 'file://a.jpg', width: 1, height: 1 },
      { uri: 'file://b.jpg', width: 1, height: 1 },
    ],
  });

  await expect(pickFromGallery()).resolves.toEqual({ uris: ['file://a.jpg', 'file://b.jpg'] });
});
