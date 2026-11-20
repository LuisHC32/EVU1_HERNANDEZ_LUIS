export const SYNC_MESSAGES = {
  OFFLINE_SAVE:
    'Sin conexión. La tarea se guardó en este dispositivo; sincronízala cuando vuelva la conexión.',
  SYNCED: 'Tarea sincronizada',
  SYNC_OFFLINE: 'Sin conexión a internet. No se pudo sincronizar.',
  SYNC_SERVER_ERROR: 'No se pudo conectar con el servidor. Inténtalo más tarde.',
  SYNC_REJECTED: 'No se pudo sincronizar: la API rechazó la tarea.',
  STATUS_UNSYNCED: 'Sin sincronizar',
  STATUS_SYNCED: 'Sincronizada',
  OFFLINE_LABEL: 'Sin conexión',
  OFFLINE_ALERT: 'Sin conexión a internet.',
} as const;

export function syncAlertLabel(offline: boolean, pending: number): string {
  if (offline) {
    return pending > 0 ? `Sin red · ${pending}` : SYNC_MESSAGES.OFFLINE_LABEL;
  }
  return `${pending} pendiente${pending === 1 ? '' : 's'}`;
}

export function syncAlertDetail(offline: boolean, pending: number): string {
  if (offline) {
    if (pending > 0) {
      return `Sin conexión a internet. ${pending} ${
        pending === 1 ? 'cambio pendiente; sincronízalo' : 'cambios pendientes; sincronízalos'
      } cuando vuelva la conexión.`;
    }
    return SYNC_MESSAGES.OFFLINE_ALERT;
  }
  return `${pending} ${pending === 1 ? 'cambio por sincronizar' : 'cambios por sincronizar'}`;
}
