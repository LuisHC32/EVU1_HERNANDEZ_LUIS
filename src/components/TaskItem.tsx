import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Card, Icon, IconButton, Text } from 'react-native-paper';

import { palette } from '../theme/theme';
import type { Task } from '../types/Task';

type TaskItemProps = {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

const TOUCH = 48;

function PhotoModal({
  uris,
  title,
  visible,
  onClose,
}: {
  uris: string[];
  title: string;
  visible: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      setIndex(0);
    }
  }, [visible]);

  const photo = uris[index] ?? uris[0];
  if (!photo) {
    return null;
  }

  const step = (delta: number) => {
    if (uris.length < 2) {
      return;
    }
    setIndex((current) => (current + delta + uris.length) % uris.length);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Cerrar modal"
        />
        <View style={styles.sheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Icon source="image" size={22} color={palette.primary} />
              <Text variant="titleMedium" numberOfLines={1} style={styles.modalTitle}>
                {title}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Cerrar modal"
              style={styles.closeBtn}
              hitSlop={6}
            >
              <Icon source="close" size={20} color={palette.onSurfaceVariant} />
            </Pressable>
          </View>
          <View style={styles.viewerWrap}>
            <View style={styles.viewer}>
              <Image
                source={{ uri: photo }}
                accessibilityLabel={`Foto adjunta a ${title}`}
                style={styles.viewerImage}
                resizeMode="cover"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Imagen anterior"
                onPress={() => step(-1)}
                style={[styles.nav, styles.navPrev]}
              >
                <Icon source="chevron-left" size={20} color={palette.onSurface} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Siguiente imagen"
                onPress={() => step(1)}
                style={[styles.nav, styles.navNext]}
              >
                <Icon source="chevron-right" size={20} color={palette.onSurface} />
              </Pressable>
              <View style={styles.counter} pointerEvents="none">
                <View style={styles.counterPill}>
                  <Text style={styles.counterText}>
                    {Math.min(index, uris.length - 1) + 1} / {uris.length}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const photos = task.photoUris ?? [];
  const photoLabel = photos.length === 1 ? '1 foto adjunta' : `${photos.length} fotos adjuntas`;
  const address = task.location
    ? task.location.address ||
      `${task.location.latitude.toFixed(5)}, ${task.location.longitude.toFixed(5)}`
    : '';

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title
        title={task.titulo}
        titleVariant="titleMedium"
        titleNumberOfLines={1}
        titleStyle={styles.title}
        style={styles.header}
        leftStyle={styles.left}
        left={() => (
          <Pressable
            onPress={() => onToggle(task)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.completada }}
            accessibilityLabel={
              task.completada
                ? `Marcar ${task.titulo} como pendiente`
                : `Marcar ${task.titulo} como completada`
            }
            style={styles.check}
          >
            <Icon
              source={task.completada ? 'check-circle' : 'circle-outline'}
              size={24}
              color={task.completada ? palette.primary : palette.outline}
            />
          </Pressable>
        )}
        rightStyle={styles.right}
        right={() => (
          <View style={styles.actions}>
            <IconButton
              icon="pencil"
              iconColor={palette.onSurfaceVariant}
              size={22}
              style={styles.iconButton}
              onPress={() => onEdit(task)}
              accessibilityLabel={`Editar tarea ${task.titulo}`}
            />
            <IconButton
              icon="delete"
              iconColor={palette.tertiary}
              rippleColor={palette.errorContainer}
              size={22}
              style={styles.iconButton}
              onPress={() => onDelete(task)}
              accessibilityLabel={`Eliminar tarea ${task.titulo}`}
            />
          </View>
        )}
      />
      {photos.length > 0 || task.descripcion.length > 0 || task.location ? (
        <Card.Content style={styles.content}>
          {task.descripcion.length > 0 ? (
            <Text variant="bodyMedium" numberOfLines={2} style={styles.description}>
              {task.descripcion}
            </Text>
          ) : null}
          {photos.length > 0 || task.location ? (
            <View style={styles.chips}>
          {photos.length > 0 ? (
            <Pressable
              onPress={() => setPhotoOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${photoLabel}`}
              style={styles.photoChip}
            >
              <Icon source="image" size={16} color={palette.primary} />
              <Text style={styles.photoChipText}>{photoLabel}</Text>
              <Icon source="eye" size={14} color={palette.onSurfaceVariant} />
            </Pressable>
          ) : null}
          {task.location ? (
            <View style={styles.locationChip}>
              <Icon source="map-marker" size={16} color={palette.primary} />
              <Text numberOfLines={1} style={styles.chipText}>
                {address}
              </Text>
            </View>
          ) : null}
            </View>
          ) : null}
        </Card.Content>
      ) : null}
      {photos.length > 0 ? (
        <PhotoModal
          uris={photos}
          title={task.titulo}
          visible={photoOpen}
          onClose={() => setPhotoOpen(false)}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    minHeight: 64,
    paddingLeft: 8,
  },
  left: {
    width: TOUCH,
    height: TOUCH,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    marginRight: 4,
  },
  title: {
    color: palette.onSurface,
    fontWeight: '500',
    letterSpacing: 0.15,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: TOUCH,
    height: TOUCH,
    margin: 0,
  },
  content: {
    paddingLeft: 8 + TOUCH + 8,
    paddingBottom: 16,
    marginTop: -8,
    gap: 8,
  },
  description: {
    color: palette.onSurfaceVariant,
    letterSpacing: 0.25,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  photoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: palette.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(203, 196, 210, 0.4)',
  },
  photoChipText: {
    color: palette.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  chipText: {
    flexShrink: 1,
    color: palette.onSecondaryFixed,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '100%',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: palette.secondaryContainer,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheet: {
    width: '100%',
    maxWidth: 384,
    alignSelf: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(203, 196, 210, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  modalTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  modalTitle: {
    flex: 1,
    color: palette.onSurface,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerWrap: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  viewer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: palette.surfaceContainer,
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  nav: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  navPrev: {
    left: 10,
  },
  navNext: {
    right: 10,
  },
  counter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    alignItems: 'center',
  },
  counterPill: {
    backgroundColor: 'rgba(50, 47, 55, 0.7)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  counterText: {
    color: palette.inverseOnSurface,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
});
