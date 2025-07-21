import { useState, useEffect, useRef, useCallback } from "react";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { novelController } from "@/server/controllers/novel";
import { invalidateQueries } from "@/providers/reactQuery";

const TASK_NAME = "NOVEL_REFRESH_TASK";
const STORAGE_KEY = "NOVEL_REFRESH_QUEUE";
const PROCESS_DELAY = 100; // ms

// Types to handle different refresh operations
interface RefreshItem {
  key: string; // unique identifier for the refresh (e.g., "novel:title" or "library:libraryId")
  type: "novel" | "library";
  data: string | string[]; // title for novel, array of titles for library
}

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let queue: RefreshItem[] = raw ? JSON.parse(raw) : [];
    if (queue.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const item = queue[0];
    try {
      if (item.type === "novel") {
        await novelController.refreshNovel({ title: item.data as string });
      } else if (item.type === "library") {
        // Refresh entire library
        const titles = item.data as string[];
        for (const title of titles) {
          await novelController.refreshNovel({ title });
          // Small pause between novels in the same library
          await new Promise((r) => setTimeout(r, 50));
        }
      }
    } catch (e) {
      console.error("Background refresh failed for", item.key, e);
    }

    // Remove first element
    queue = queue.slice(1);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));

    // Re-schedule if there are more elements
    if (queue.length > 0) {
      setTimeout(() => {
        BackgroundTask.registerTaskAsync(TASK_NAME);
      }, PROCESS_DELAY);
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (err) {
    console.error("Background task error:", err);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export function useNovelRefreshQueue() {
  const [queue, setQueue] = useState<RefreshItem[]>([]);
  const [currentItem, setCurrentItem] = useState<RefreshItem | null>(null);
  const processingRef = useRef(false);

  const loadQueue = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list: RefreshItem[] = raw ? JSON.parse(raw) : [];
    setQueue(list);
    return list;
  }, []);

  const saveQueue = useCallback(async (list: RefreshItem[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    setQueue(list);
  }, []);

  // Core loop: fire-and-forget refresh in foreground
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    let list = await loadQueue();
    while (list.length > 0) {
      const item = list[0];
      setCurrentItem(item);

      try {
        if (item.type === "novel") {
          await novelController.refreshNovel({ title: item.data as string });
          invalidateQueries(["novel-info", item.data]);
        } else if (item.type === "library") {
          const titles = item.data as string[];
          for (const title of titles) {
            await novelController.refreshNovel({ title });
            invalidateQueries(["novel-info", title]);
            await new Promise((r) => setTimeout(r, 50));
          }
        }
      } catch (e) {
        console.error("Foreground refresh failed for", item.key, e);
      }

      list = list.slice(1);
      await saveQueue(list);
      await new Promise((r) => setTimeout(r, PROCESS_DELAY));
    }

    setCurrentItem(null);
    processingRef.current = false;
  }, [loadQueue, saveQueue]);

  // On mount: hydrate + schedule background if needed
  useEffect(() => {
    (async () => {
      const list = await loadQueue();
      if (list.length > 0) {
        processQueue();
        await BackgroundTask.registerTaskAsync(TASK_NAME);
      }
    })();
  }, [loadQueue, processQueue]);

  // Enqueue refresh for specific novels
  const enqueueNovelRefresh = useCallback(
    async (titles: string[]) => {
      const list = await loadQueue();
      const newItems: RefreshItem[] = [];

      for (const title of titles) {
        const key = `novel:${title}`;
        // Check if it already exists in queue
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

      processQueue();
      await BackgroundTask.registerTaskAsync(TASK_NAME);
    },
    [loadQueue, saveQueue, processQueue]
  );

  // Enqueue refresh for an entire library
  const enqueueLibraryRefresh = useCallback(
    async (categoryId: number, titles: string[]) => {
      const list = await loadQueue();
      const key = `library:${categoryId}`;

      // Check if it already exists in queue
      if (list.find((item) => item.key === key)) {
        return; // Already in queue
      }

      const newItem: RefreshItem = {
        key,
        type: "library",
        data: titles,
      };

      const updated = [...list, newItem];
      await saveQueue(updated);

      processQueue();
      await BackgroundTask.registerTaskAsync(TASK_NAME);
    },
    [loadQueue, saveQueue, processQueue]
  );

  // Check if a specific novel is being refreshed
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

  // Check if a library is being refreshed
  const isLibraryRefreshing = useCallback(
    (categoryId: number) => {
      if (!currentItem) return false;
      return currentItem.key === `library:${categoryId}`;
    },
    [currentItem]
  );

  // Check if a specific key is being refreshed
  const isRefreshing = useCallback(
    (key: string) => {
      if (!currentItem) return false;
      return currentItem.key === key;
    },
    [currentItem]
  );

  // Check if a key is in queue (not yet processed)
  const isInQueue = useCallback(
    (key: string) => {
      return queue.some((item) => item.key === key);
    },
    [queue]
  );

  // Get the status of a specific key
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
    // Enqueue methods
    enqueueNovelRefresh, // For specific novels
    enqueueLibraryRefresh, // For entire libraries
    // Verification methods
    isNovelRefreshing, // Check if a specific novel is being refreshed
    isLibraryRefreshing, // Check if a library is being refreshed
    isRefreshing, // Check if a specific key is being refreshed
    isInQueue, // Check if a key is in queue
    getRefreshStatus, // Get complete status of a key
    // Backwards compatibility
    enqueueRefresh: enqueueNovelRefresh,
    currentTitle:
      currentItem?.type === "novel" ? (currentItem.data as string) : null,
  };
}
