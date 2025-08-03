import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  ReactNode,
  useContext,
} from "react";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { novelController } from "@/server/controllers/novel";
import { invalidateQueries } from "@/providers/reactQuery";
import { useIsOnlineDirect } from "@/hooks/network";

const TASK_NAME = "NOVEL_REFRESH_TASK";
const STORAGE_KEY = "NOVEL_REFRESH_QUEUE";
const PROCESS_DELAY = 100; // ms

const NOTIFICATION_ID = "REFRESH_PROGRESS";
const NOTIFICATION_CATEGORY = "REFRESH_STATUS";

export interface RefreshItem {
  key: string; // unique identifier (e.g., "novel:Title" or "library:categoryId")
  type: "novel" | "library";
  data: string | string[]; // title for novel, array of titles for library
}

// Set handler so notifications show as banner/list when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Ensure category with CANCEL action (replaces previous VIEW)
async function ensureNotificationCategory() {
  try {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
      {
        identifier: "CANCEL",
        buttonTitle: "Cancel",
        options: { opensAppToForeground: true },
      },
    ]);
  } catch (e) {
    console.warn("Could not set refresh notification category:", e);
  }
}

const hasNotificationPermission = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
};

const updateRefreshNotification = async (
  currentItem: RefreshItem | null,
  progress: number,
  subTitle?: string
) => {
  if (!(await hasNotificationPermission())) return;

  try {
    if (!currentItem) {
      await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
      return;
    }

    const title =
      currentItem.type === "library"
        ? `Refreshing Library - ${progress}%`
        : `Refreshing Novel - ${progress}%`;
    const body =
      currentItem.type === "library"
        ? subTitle || currentItem.key
        : (currentItem.data as string);

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title,
        body,
        categoryIdentifier: NOTIFICATION_CATEGORY,
        data: {
          type: "refresh-status",
          key: currentItem.key,
          progress,
        },
        sticky: true,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn("Error updating refresh notification:", e);
  }
};

// Background Task definition
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let queue: RefreshItem[] = raw ? JSON.parse(raw) : [];
    if (queue.length === 0) {
      await updateRefreshNotification(null, 0);
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const currentItem = queue[0];

    try {
      if (currentItem.type === "novel") {
        await updateRefreshNotification(currentItem, 0);
        // check cancellation before executing
        const persistedRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const persistedQueue: RefreshItem[] = persistedRaw
          ? JSON.parse(persistedRaw)
          : [];
        if (!persistedQueue.some((i) => i.key === currentItem.key)) {
          // canceled
        } else {
          await novelController.refreshNovel({
            title: currentItem.data as string,
          });
          invalidateQueries(["novel-info", currentItem.data]);
          await updateRefreshNotification(currentItem, 100);
        }
      } else if (currentItem.type === "library") {
        const titles = currentItem.data as string[];
        const total = titles.length;
        for (let i = 0; i < total; i++) {
          // re-check if the whole item still exists (cancellation support)
          const persistedRaw = await AsyncStorage.getItem(STORAGE_KEY);
          const persistedQueue: RefreshItem[] = persistedRaw
            ? JSON.parse(persistedRaw)
            : [];
          if (!persistedQueue.some((i) => i.key === currentItem.key)) {
            break; // canceled
          }

          const title = titles[i];
          const progress = Math.round(((i + 1) / total) * 100);
          await updateRefreshNotification(currentItem, progress, title);
          await novelController.refreshNovel({ title });
          invalidateQueries(["novel-info", title]);
          await new Promise((r) => setTimeout(r, 50));
        }
      }
    } catch (e) {
      console.error("Background refresh failed for", currentItem.key, e);
    }

    // remove processed item (if still present)
    const afterRaw = await AsyncStorage.getItem(STORAGE_KEY);
    let updatedQueue: RefreshItem[] = afterRaw ? JSON.parse(afterRaw) : [];
    updatedQueue = updatedQueue.filter((i) => i.key !== currentItem.key);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueue));

    if (updatedQueue.length === 0) {
      await updateRefreshNotification(null, 0);
    } else {
      setTimeout(() => {
        void BackgroundTask.registerTaskAsync(TASK_NAME).catch((e) =>
          console.warn("Failed to re-register refresh background task:", e)
        );
      }, PROCESS_DELAY);
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (err) {
    console.error("Background task error:", err);
    await updateRefreshNotification(null, 0);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// Store / context
export function useNovelRefreshStore() {
  const [queue, setQueue] = useState<RefreshItem[]>([]);
  const [currentItem, setCurrentItem] = useState<RefreshItem | null>(null);
  const processingRef = useRef(false);
  const cancelRequestedRef = useRef(false);
  const isOnline = useIsOnlineDirect();
  const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);

  useEffect(() => {
    const handleConnection = async () => {
      if (!isOnline) {
        setIsWaitingForConnection(true);
        return;
      }

      if (isWaitingForConnection) {
        setIsWaitingForConnection(false);

        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const queue: RefreshItem[] = raw ? JSON.parse(raw) : [];

        if (queue.length > 0 && !processingRef.current) {
          setTimeout(() => void processQueue(), 100);
        }
      }
    };

    void handleConnection();
  }, [isOnline]);

  const loadQueue = useCallback(async (): Promise<RefreshItem[]> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const list: RefreshItem[] = raw ? JSON.parse(raw) : [];
      setQueue(list);
      return list;
    } catch (e) {
      console.error("Error loading refresh queue:", e);
      return [];
    }
  }, []);

  const saveQueue = useCallback(async (list: RefreshItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setQueue(list);
    } catch (e) {
      console.error("Error saving refresh queue:", e);
    }
  }, []);

  const cancelCurrentRefresh = useCallback(async () => {
    if (!currentItem) return;
    // Signal cancel for foreground loop
    cancelRequestedRef.current = true;

    // Remove current item from persisted queue
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const stored: RefreshItem[] = raw ? JSON.parse(raw) : [];
    const filtered = stored.filter((i) => i.key !== currentItem.key);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    setQueue(filtered);
    setCurrentItem(null);
    await updateRefreshNotification(null, 0);
  }, [currentItem]);

  const processQueue = useCallback(async () => {
    if (!isOnline) {
      setIsWaitingForConnection(true);
      return;
    }

    if (processingRef.current) return;
    processingRef.current = true;
    cancelRequestedRef.current = false;

    let list = await loadQueue();
    while (list.length > 0) {
      if (cancelRequestedRef.current) break;

      const item = list[0];
      setCurrentItem(item);

      try {
        if (item.type === "novel") {
          await updateRefreshNotification(item, 0);
          if (cancelRequestedRef.current) break;

          // Re-check persisted existence
          const persistedRaw = await AsyncStorage.getItem(STORAGE_KEY);
          const persistedQueue: RefreshItem[] = persistedRaw
            ? JSON.parse(persistedRaw)
            : [];
          if (!persistedQueue.some((i) => i.key === item.key)) {
            // canceled
          } else {
            await novelController.refreshNovel({ title: item.data as string });
            invalidateQueries(["novel-info", item.data]);
            await updateRefreshNotification(item, 100);
          }
        } else if (item.type === "library") {
          const titles = item.data as string[];
          const total = titles.length;
          for (let i = 0; i < total; i++) {
            if (cancelRequestedRef.current) break;

            // check if still present
            const persistedRaw = await AsyncStorage.getItem(STORAGE_KEY);
            const persistedQueue: RefreshItem[] = persistedRaw
              ? JSON.parse(persistedRaw)
              : [];
            if (!persistedQueue.some((i) => i.key === item.key)) {
              break; // canceled
            }

            const title = titles[i];
            const progress = Math.round(((i + 1) / total) * 100);
            await updateRefreshNotification(item, progress, title);
            if (cancelRequestedRef.current) break;
            await novelController.refreshNovel({ title });
            invalidateQueries(["novel-info", title]);
            await new Promise((r) => setTimeout(r, 50));
          }
        }
      } catch (e) {
        console.error("Foreground refresh failed for", item.key, e);
      }

      // advance queue if not canceled externally
      list = list.slice(1);
      await saveQueue(list);
      await new Promise((r) => setTimeout(r, PROCESS_DELAY));
    }

    if (!cancelRequestedRef.current) {
      setCurrentItem(null);
    }
    await updateRefreshNotification(null, 0);
    processingRef.current = false;
  }, [loadQueue, saveQueue, isOnline]);

  // Initialization
  useEffect(() => {
    (async () => {
      const list = await loadQueue();

      if (await hasNotificationPermission()) {
        await ensureNotificationCategory();
      }

      if (list.length > 0) {
        void processQueue();
        try {
          await BackgroundTask.registerTaskAsync(TASK_NAME);
        } catch (e) {
          console.warn(
            "Failed to register background refresh task on init:",
            e
          );
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for notification action (CANCEL)
  useEffect(() => {
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        try {
          const actionId = response.actionIdentifier;
          if (actionId === "CANCEL") {
            void cancelCurrentRefresh();
          }
        } catch (e) {
          console.error("Error handling notification response:", e);
        }
      }
    );
    return () => {
      responseListener.remove();
    };
  }, [cancelCurrentRefresh]);

  // Enqueue refresh for specific novels
  const enqueueNovelRefresh = useCallback(
    async (titles: string[]) => {
      const list = await loadQueue();
      const newItems: RefreshItem[] = [];

      for (const title of titles) {
        const key = `novel:${title}`;
        if (!list.find((item) => item.key === key)) {
          newItems.push({
            key,
            type: "novel",
            data: title,
          });
        }
      }

      if (newItems.length === 0) return;

      const updated = [...list, ...newItems];
      await saveQueue(updated);
      void processQueue();
      try {
        await BackgroundTask.registerTaskAsync(TASK_NAME);
      } catch (e) {
        console.warn(
          "Failed to register background task after enqueueNovelRefresh:",
          e
        );
      }
    },
    [loadQueue, saveQueue, processQueue]
  );

  const enqueueLibraryRefresh = useCallback(
    async (
      categories: {
        libraryId: number;
        titles: string[];
      }[]
    ) => {
      const list = await loadQueue();
      const existingKeys = new Set(list.map((item) => item.key));

      const newItems: RefreshItem[] = [];

      for (const { libraryId, titles } of categories) {
        const key = `library:${libraryId}`;
        if (existingKeys.has(key)) continue;

        newItems.push({
          key,
          type: "library",
          data: titles,
        });
      }

      if (newItems.length > 0) {
        const updated = [...list, ...newItems];
        await saveQueue(updated);
        void processQueue();

        try {
          await BackgroundTask.registerTaskAsync(TASK_NAME);
        } catch (e) {
          console.warn(
            "Failed to register background task after enqueueLibraryRefresh:",
            e
          );
        }
      }
    },
    [loadQueue, saveQueue, processQueue]
  );

  const isNovelRefreshing = useCallback(
    (title: string) => {
      if (!currentItem) return false;
      if (currentItem.type === "novel") {
        return currentItem.data === title;
      } else if (currentItem.type === "library") {
        const titles = currentItem.data as string[];
        return titles.includes(title);
      }
      return false;
    },
    [currentItem]
  );

  const isLibraryRefreshing = useCallback(
    (categoryId: number) => {
      if (!currentItem) return false;
      return currentItem.key === `library:${categoryId}`;
    },
    [currentItem]
  );

  const isRefreshing = useCallback(
    (key: string) => {
      if (!currentItem) return false;
      return currentItem.key === key;
    },
    [currentItem]
  );

  const isInQueue = useCallback(
    (key: string) => {
      return queue.some((item) => item.key === key);
    },
    [queue]
  );

  const getRefreshStatus = useCallback(
    (key: string) => {
      if (currentItem?.key === key) {
        return "refreshing";
      }
      if (queue.some((item) => item.key === key)) {
        return "queued";
      }
      return "idle";
    },
    [currentItem, queue]
  );

  return {
    queue,
    currentItem,
    enqueueNovelRefresh,
    enqueueLibraryRefresh,
    isNovelRefreshing,
    isLibraryRefreshing,
    isRefreshing,
    isInQueue,
    getRefreshStatus,
    cancelCurrentRefresh,
    enqueueRefresh: enqueueNovelRefresh,
    currentTitle:
      currentItem?.type === "novel" ? (currentItem.data as string) : null,
  };
}

type QueueStoreType = ReturnType<typeof useNovelRefreshStore>;

const NovelRefreshQueueContext = createContext<QueueStoreType | null>(null);

export function NovelRefreshQueueProvider({
  children,
}: {
  children: ReactNode;
}) {
  const store = useNovelRefreshStore();
  return (
    <NovelRefreshQueueContext.Provider value={store}>
      {children}
    </NovelRefreshQueueContext.Provider>
  );
}

export function useNovelRefreshQueue() {
  const ctx = useContext(NovelRefreshQueueContext);
  if (!ctx) {
    throw new Error(
      "useNovelRefreshQueue must be used within a NovelRefreshQueueProvider"
    );
  }
  return ctx;
}
