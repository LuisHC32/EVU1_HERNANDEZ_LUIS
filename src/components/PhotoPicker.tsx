import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { pickFromGallery, takePhoto, type PhotoCapture } from '../services/camera';
import { palette } from '../theme/theme';

type PhotoPickerProps = {
  uris: string[];
  onChange: (uris: string[]) => void;
  onNotice: (message: string) => void;
  disabled?: boolean;
};

const CAMERA_DENIED = 'Permiso de cámara denegado. La tarea se puede guardar sin foto.';
const GALLERY_DENIED = 'Permiso de galería denegado. La tarea se puede guardar sin foto.';
const PHOTO_ERROR = 'No se pudo obtener la foto. La tarea se puede guardar sin foto.';

export function PhotoPicker({ uris, onChange, onNotice, disabled = false }: PhotoPickerProps) {
  const [busy, setBusy] = useState(false);
  const locked = disabled || busy;

  const run = async (action: () => Promise<PhotoCapture>, deniedMessage: string) => {
    if (locked) {
      return;
    }
    setBusy(true);
    try {
      const result = await action();
      if (result.uris) {
        onChange([...uris, ...result.uris]);
        return;
      }
      if (result.reason === 'denied') {
        onNotice(deniedMessage);
      } else if (result.reason === 'error') {
        onNotice(PHOTO_ERROR);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>
        Imagen o comprobante <Text style={styles.optional}>(opcional)</Text>
      </Text>
      <View style={styles.card}>
        {uris.length > 0 ? (
          <View style={styles.thumbs}>
            {uris.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.thumb}>
                <Image
                  source={{ uri }}
                  style={styles.image}
                  resizeMode="cover"
                  accessibilityLabel="Vista previa de la foto"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quitar foto"
                  accessibilityState={{ disabled: locked }}
                  disabled={locked}
                  hitSlop={8}
                  onPress={() => onChange(uris.filter((_, item) => item !== index))}
                  style={styles.remove}
                >
                  <Icon source="close" size={14} color={palette.onSurface} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.lead}>
            <View style={styles.iconBox}>
              <Icon source="camera-plus" size={24} color={palette.primary} />
            </View>
            <View style={styles.leadText}>
              <Text style={styles.leadTitle} numberOfLines={1}>
                Agregar foto o captura
              </Text>
              <Text style={styles.leadHint} numberOfLines={1}>
                JPG, PNG hasta 5MB
              </Text>
            </View>
          </View>
        )}
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tomar foto"
            accessibilityState={{ disabled: locked }}
            disabled={locked}
            onPress={() => {
              void run(takePhoto, CAMERA_DENIED);
            }}
            style={[styles.action, locked && styles.locked]}
          >
            <Icon source="camera" size={18} color={palette.primary} />
            <Text style={styles.actionText}>Tomar foto</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Galería"
            accessibilityState={{ disabled: locked }}
            disabled={locked}
            onPress={() => {
              void run(pickFromGallery, GALLERY_DENIED);
            }}
            style={[styles.action, locked && styles.locked]}
          >
            <Icon source="image-multiple" size={18} color={palette.primary} />
            <Text style={styles.actionText}>Galería</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  section: {
    color: palette.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  optional: {
    color: 'rgba(73, 69, 81, 0.7)',
    fontSize: 11,
    fontWeight: '400',
  },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.outlineVariant,
    backgroundColor: palette.surfaceContainerLow,
  },
  lead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceContainerHighest,
  },
  leadText: {
    flex: 1,
    minWidth: 0,
  },
  leadTitle: {
    color: palette.onSurface,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  leadHint: {
    color: palette.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: palette.surfaceContainer,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceContainerLowest,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.outlineVariant,
    backgroundColor: palette.surface,
  },
  actionText: {
    color: palette.primary,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  locked: {
    opacity: 0.5,
  },
});
