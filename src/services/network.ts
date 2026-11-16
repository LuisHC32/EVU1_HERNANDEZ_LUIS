type NetState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

let online = true;
const listeners = new Set<(online: boolean) => void>();

export function isOnline(): boolean {
  return online;
}

export function setOnline(next: boolean): void {
  if (next === online) return;
  online = next;
  for (const listener of [...listeners]) listener(online);
}

export function subscribeOnline(listener: (online: boolean) => void): () => void {
  listeners.add(listener);
  listener(online);
  return () => {
    listeners.delete(listener);
  };
}

function connected(state: NetState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export async function listenNetInfo(): Promise<() => void> {
  try {
    const NetInfo = (await import('@react-native-community/netinfo')).default;
    const apply = (state: NetState) => setOnline(connected(state));
    const unsubscribe = NetInfo.addEventListener(apply);
    apply(await NetInfo.fetch());
    return unsubscribe;
  } catch {
    return () => undefined;
  }
}
