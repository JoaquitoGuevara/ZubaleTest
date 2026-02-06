import BackgroundFetch from 'react-native-background-fetch';

export async function registerBackgroundSync(
  onBackgroundSyncRequested: () => Promise<void>,
): Promise<void> {
  await BackgroundFetch.configure(
    {
      minimumFetchInterval: 15,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    },
    async taskId => {
      try {
        await onBackgroundSyncRequested();
      } finally {
        BackgroundFetch.finish(taskId);
      }
    },
    async taskId => {
      BackgroundFetch.finish(taskId);
    },
  );
}

export async function unregisterBackgroundSync(): Promise<void> {
  await BackgroundFetch.stop();
}
