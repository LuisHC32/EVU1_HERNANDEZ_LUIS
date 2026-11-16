jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: async () => ({ isConnected: true, isInternetReachable: true }),
    addEventListener: () => () => {},
  },
}));
