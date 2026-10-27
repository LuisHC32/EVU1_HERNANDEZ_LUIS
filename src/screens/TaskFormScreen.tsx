import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '../components/Header';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTasks } from '../context/TasksContext';
import { palette } from '../theme/theme';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskForm'>;

const TITLE_MAX_LENGTH = 120;

export function TaskFormScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { tasks, addTask, updateTask } = useTasks();
  const taskId = route.params?.taskId;
  const existing = taskId ? tasks.find((task) => task.id === taskId) : undefined;
  const isEditing = Boolean(existing);

  const [titulo, setTitulo] = useState(existing?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(existing?.descripcion ?? '');
  const [tituloError, setTituloError] = useState(false);

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
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <Header title={isEditing ? 'Editar tarea' : 'Nueva Tarea'} onBack={goBack} />

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
              <Button mode="text" onPress={goBack} contentStyle={styles.textButton}>
                Volver
              </Button>
            </View>
          ) : (
            <View style={styles.form}>
              <View>
                <TextInput
                  mode="outlined"
                  label="Título *"
                  value={titulo}
                  onChangeText={handleTitleChange}
                  placeholder="Ej. Comprar leche"
                  maxLength={TITLE_MAX_LENGTH}
                  error={tituloError}
                  right={
                    tituloError ? (
                      <TextInput.Icon icon="alert-circle" color={palette.error} />
                    ) : undefined
                  }
                  style={styles.input}
                  accessibilityLabel="Título"
                  accessibilityHint="Campo obligatorio"
                />
                <View style={styles.supportRow}>
                  <HelperText
                    type={tituloError ? 'error' : 'info'}
                    visible
                    style={styles.helperFlex}
                  >
                    {tituloError ? 'El título es obligatorio.' : 'Sé específico y conciso.'}
                  </HelperText>
                  <HelperText type="info" visible style={styles.counter}>
                    {`${titulo.length} / ${TITLE_MAX_LENGTH}`}
                  </HelperText>
                </View>
              </View>

              <View>
                <TextInput
                  mode="outlined"
                  label="Descripción (opcional)"
                  value={descripcion}
                  onChangeText={setDescripcion}
                  placeholder="Agrega notas o detalles sobre la tarea..."
                  multiline
                  style={[styles.input, styles.area]}
                  accessibilityLabel="Descripción"
                />
                <HelperText type="info" visible>
                  Formatos sugeridos: enlaces, pasos o recordatorios.
                </HelperText>
              </View>

              <View style={styles.actions}>
                <PrimaryButton
                  icon="content-save"
                  label={isEditing ? 'Actualizar tarea' : 'Guardar tarea'}
                  onPress={handleSave}
                />
                <Button mode="text" onPress={goBack} contentStyle={styles.textButton}>
                  Descartar cambios
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  form: {
    padding: 16,
    gap: 16,
  },
  input: {
    backgroundColor: palette.surface,
  },
  area: {
    minHeight: 120,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  helperFlex: {
    flex: 1,
  },
  counter: {
    textAlign: 'right',
  },
  actions: {
    gap: 8,
    marginTop: 16,
  },
  textButton: {
    minHeight: 48,
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
