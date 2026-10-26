import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTasks } from '../context/TasksContext';
import { palette } from '../theme/theme';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskForm'>;

export function TaskFormScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { tasks, addTask, updateTask } = useTasks();
  const taskId = route.params?.taskId;
  const existing = taskId ? tasks.find((task) => task.id === taskId) : undefined;
  const isEditing = Boolean(existing);

  const [titulo, setTitulo] = useState(existing?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(existing?.descripcion ?? '');
  const [tituloError, setTituloError] = useState(false);
  const [tituloFocused, setTituloFocused] = useState(false);
  const [descripcionFocused, setDescripcionFocused] = useState(false);

  const goBack = () => navigation.goBack();

  const handleTitleChange = (value: string) => {
    setTitulo(value);
    if (value.length > 0) {
      setTituloError(false);
    }
  };

  const handleSave = () => {
    const tituloLimpio = titulo.trim();
    const descripcionLimpia = descripcion.trim();

    if (!tituloLimpio) {
      setTituloError(true);
      return;
    }

    const input = {
      titulo: tituloLimpio,
      descripcion: descripcionLimpia,
    };

    if (existing) {
      updateTask(existing.id, input);
    } else {
      addTask(input);
    }

    goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver atrás"
          onPress={goBack}
          style={styles.iconHit}
          android_ripple={{ color: palette.surfaceContainerHigh, borderless: true, radius: 24 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={palette.onSurface} />
        </Pressable>
        <Text variant="titleLarge" style={styles.brand}>
          {isEditing ? 'Editar tarea' : 'Nueva Tarea'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingBottom: 24 + insets.bottom }]}
        >
          {taskId && !existing ? (
            <View style={styles.missing}>
              <Text variant="bodyLarge" style={styles.missingText}>
                No se encontró la tarea.
              </Text>
              <Pressable accessibilityRole="button" onPress={goBack} style={styles.discard}>
                <Text variant="labelLarge" style={styles.discardLabel}>
                  Volver
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.fieldBlock}>
                <View style={[styles.field, borderFor(tituloFocused, tituloError)]}>
                  <View style={styles.notch}>
                    <Text style={[styles.notchLabel, labelColor(tituloFocused, tituloError)]}>
                      Título
                    </Text>
                    <Text style={styles.required}> *</Text>
                  </View>
                  <View style={styles.singleLine}>
                    <TextInput
                      value={titulo}
                      onChangeText={handleTitleChange}
                      placeholder="Ej. Comprar leche"
                      placeholderTextColor={palette.outline}
                      maxLength={120}
                      onFocus={() => setTituloFocused(true)}
                      onBlur={() => setTituloFocused(false)}
                      style={styles.input}
                      accessibilityLabel="Título"
                    />
                    {tituloError ? (
                      <MaterialIcons name="error" size={20} color={palette.error} />
                    ) : null}
                  </View>
                </View>
                <View style={styles.supportRow}>
                  {tituloError ? (
                    <View style={styles.errorRow}>
                      <MaterialIcons name="warning" size={14} color={palette.error} />
                      <Text style={styles.errorText}>El título es obligatorio.</Text>
                    </View>
                  ) : (
                    <Text style={styles.helper}>Sé específico y conciso.</Text>
                  )}
                  <Text style={styles.counter}>{titulo.length} / 120</Text>
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <View style={[styles.field, borderFor(descripcionFocused, false)]}>
                  <View style={styles.notch}>
                    <Text style={[styles.notchLabel, labelColor(descripcionFocused, false)]}>
                      Descripción
                    </Text>
                    <Text style={styles.optional}> (opcional)</Text>
                  </View>
                  <TextInput
                    value={descripcion}
                    onChangeText={setDescripcion}
                    placeholder="Agrega notas o detalles sobre la tarea..."
                    placeholderTextColor={palette.outline}
                    multiline
                    textAlignVertical="top"
                    onFocus={() => setDescripcionFocused(true)}
                    onBlur={() => setDescripcionFocused(false)}
                    style={styles.area}
                    accessibilityLabel="Descripción"
                  />
                </View>
                <Text style={styles.descHelper}>
                  Formatos sugeridos: enlaces, pasos o recordatorios.
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={handleSave} style={styles.save}>
                  <MaterialIcons name="save" size={20} color={palette.onPrimary} />
                  <Text variant="labelLarge" style={styles.saveLabel}>
                    {isEditing ? 'Actualizar tarea' : 'Guardar tarea'}
                  </Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={goBack} style={styles.discard}>
                  <Text variant="labelLarge" style={styles.discardLabel}>
                    Descartar cambios
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function borderFor(focused: boolean, error: boolean) {
  if (error) {
    return { borderColor: palette.error, borderWidth: 2 };
  }
  if (focused) {
    return { borderColor: palette.primary, borderWidth: 2 };
  }
  return { borderColor: palette.outline, borderWidth: 1 };
}

function labelColor(focused: boolean, error: boolean) {
  if (error) {
    return { color: palette.error };
  }
  if (focused) {
    return { color: palette.primary };
  }
  return { color: palette.onSurfaceVariant };
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  topBar: {
    height: 64,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    zIndex: 2,
  },
  brand: {
    color: palette.onSurface,
    fontWeight: '400',
    flexShrink: 1,
  },
  iconHit: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  form: {
    padding: 16,
    gap: 24,
  },
  fieldBlock: {
    gap: 4,
  },
  field: {
    borderRadius: 4,
    backgroundColor: palette.surface,
    position: 'relative',
    marginTop: 8,
  },
  notch: {
    position: 'absolute',
    top: -8,
    left: 12,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    paddingHorizontal: 6,
  },
  notchLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  required: {
    color: palette.error,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  optional: {
    color: palette.onSurfaceVariant,
    opacity: 0.7,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  singleLine: {
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: palette.onSurface,
    paddingVertical: 14,
  },
  area: {
    minHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: palette.onSurface,
  },
  supportRow: {
    minHeight: 20,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  errorRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    flex: 1,
    color: palette.error,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  helper: {
    flex: 1,
    color: palette.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  counter: {
    color: palette.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  descHelper: {
    paddingHorizontal: 12,
    color: palette.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  actions: {
    gap: 8,
    marginTop: 16,
  },
  save: {
    minHeight: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  saveLabel: {
    color: palette.onPrimary,
    fontWeight: '500',
  },
  discard: {
    minHeight: 48,
    height: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardLabel: {
    color: palette.primary,
  },
  missing: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  missingText: {
    color: palette.onSurface,
    textAlign: 'center',
  },
});
