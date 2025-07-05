import { useEffect, useState, useRef, useCallback } from "react";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { novelController } from "@/server/controllers/novel";
import { DownloadChapter } from "@/types/download";

const TASK_NAME = "DOWNLOAD_QUEUE_TASK";
const STORAGE_KEY = "DOWNLOAD_QUEUE";
const POLL_INTERVAL_MS = 3000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Extended interface to handle retries and control
interface QueueItem extends DownloadChapter {
  retryCount?: number;
  lastError?: string;
  timestamp?: number;
  id?: string; // Unique ID to identify elements
  priority?: number; // 1 = high, 2 = medium, 3 = low
  status?: "pending" | "downloading" | "paused" | "failed";
}

// Helper function for delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to create unique chapter hash
const getChapterHash = (chapter: DownloadChapter): string =>
  `${chapter.novelTitle}-${chapter.chapterNumber}`;

// Helper function to generate unique ID
const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to sort by priority
const sortByPriority = (items: QueueItem[]): QueueItem[] =>
  items.sort((a, b) => {
    const priorityA = a.priority || 2;
    const priorityB = b.priority || 2;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return (a.timestamp || 0) - (b.timestamp || 0); // By time if same priority
  });

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const queue: QueueItem[] = raw ? JSON.parse(raw) : [];

    if (queue.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    // Filter non-paused elements and sort by priority
    const activeQueue = sortByPriority(
      queue.filter((item) => item.status !== "paused")
    );

    if (activeQueue.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const [currentChapter, ...rest] = activeQueue;
    const remainingQueue = queue.filter(
      (item) => item.id !== currentChapter.id
    );

    // Update status to 'downloading'
    const updatedCurrentChapter = {
      ...currentChapter,
      status: "downloading" as const,
    };
    const queueWithUpdatedStatus = [updatedCurrentChapter, ...remainingQueue];
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(queueWithUpdatedStatus)
    );

    try {
      await novelController.downloadNovelChapter(currentChapter);

      // Successful download, remove from queue
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remainingQueue));

      // Continue with next if there are more active elements
      const nextActiveQueue = sortByPriority(
        remainingQueue.filter((item) => item.status !== "paused")
      );
      if (nextActiveQueue.length > 0) {
        setTimeout(() => {
          BackgroundTask.registerTaskAsync(TASK_NAME);
        }, 1000);
      }

      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      // Handle retries
      const retryCount = (currentChapter.retryCount || 0) + 1;

      if (retryCount <= MAX_RETRIES) {
        const updatedChapter: QueueItem = {
          ...currentChapter,
          retryCount,
          lastError: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now(),
          status: "pending" as const,
        };

        // Update the chapter in the queue
        const updatedQueue = remainingQueue.map((item) =>
          item.id === currentChapter.id ? updatedChapter : item
        );
        if (!updatedQueue.some((item) => item.id === currentChapter.id)) {
          updatedQueue.push(updatedChapter);
        }

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueue));

        // Wait before next attempt
        await delay(RETRY_DELAY_MS * retryCount);

        const nextActiveQueue = sortByPriority(
          updatedQueue.filter((item) => item.status !== "paused")
        );
        if (nextActiveQueue.length > 0) {
          await BackgroundTask.registerTaskAsync(TASK_NAME);
        }
      } else {
        // Maximum retries reached, mark as failed
        const failedChapter = { ...currentChapter, status: "failed" as const };
        const updatedQueue = remainingQueue.map((item) =>
          item.id === currentChapter.id ? failedChapter : item
        );
        if (!updatedQueue.some((item) => item.id === currentChapter.id)) {
          updatedQueue.push(failedChapter);
        }

        console.error(
          `Max retries reached for chapter: ${getChapterHash(currentChapter)}`
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueue));

        const nextActiveQueue = sortByPriority(
          updatedQueue.filter((item) => item.status !== "paused")
        );
        if (nextActiveQueue.length > 0) {
          await BackgroundTask.registerTaskAsync(TASK_NAME);
        }
      }

      return BackgroundTask.BackgroundTaskResult.Success;
    }
  } catch (error) {
    console.error("Background task error:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export function useChapterDownloadQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Function to load queue from storage
  const loadQueue = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueItem[] = raw ? JSON.parse(raw) : [];
      if (mountedRef.current) {
        setQueue(stored);
      }
      return stored;
    } catch (error) {
      console.error("Error loading queue:", error);
      return [];
    }
  }, []);

  // Function to process queue in foreground
  const processQueue = useCallback(async (currentQueue: QueueItem[]) => {
    if (processingRef.current || currentQueue.length === 0) return;

    // Filter active elements and sort by priority
    const activeQueue = sortByPriority(
      currentQueue.filter((item) => item.status !== "paused")
    );
    if (activeQueue.length === 0) return;

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const [currentChapter, ...rest] = activeQueue;
      const remainingQueue = currentQueue.filter(
        (item) => item.id !== currentChapter.id
      );

      // Update status to downloading
      const updatedCurrentChapter = {
        ...currentChapter,
        status: "downloading" as const,
      };
      const queueWithUpdatedStatus = [updatedCurrentChapter, ...remainingQueue];

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(queueWithUpdatedStatus)
      );
      if (mountedRef.current) {
        setQueue(queueWithUpdatedStatus);
      }

      await novelController.downloadNovelChapter(currentChapter);

      // Update storage and state
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remainingQueue));
      if (mountedRef.current) {
        setQueue(remainingQueue);
      }

      // Small delay before next processing
      await delay(500);

      // Process next element recursively
      const nextActiveQueue = sortByPriority(
        remainingQueue.filter((item) => item.status !== "paused")
      );
      if (nextActiveQueue.length > 0) {
        setTimeout(() => processQueue(remainingQueue), 100);
      }
    } catch (error) {
      console.error("Foreground download error:", error);

      // Handle error with retries
      const activeQueue = sortByPriority(
        currentQueue.filter((item) => item.status !== "paused")
      );
      const [currentChapter] = activeQueue;
      const remainingQueue = currentQueue.filter(
        (item) => item.id !== currentChapter.id
      );
      const retryCount = (currentChapter.retryCount || 0) + 1;

      if (retryCount <= MAX_RETRIES) {
        const updatedChapter: QueueItem = {
          ...currentChapter,
          retryCount,
          lastError: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now(),
          status: "pending" as const,
        };

        const updatedQueue = [...remainingQueue, updatedChapter];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueue));

        if (mountedRef.current) {
          setQueue(updatedQueue);
        }

        // Retry after delay
        setTimeout(
          () => processQueue(updatedQueue),
          RETRY_DELAY_MS * retryCount
        );
      } else {
        // Maximum retries, mark as failed
        const failedChapter = { ...currentChapter, status: "failed" as const };
        const updatedQueue = [...remainingQueue, failedChapter];

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueue));
        if (mountedRef.current) {
          setQueue(updatedQueue);
        }

        const nextActiveQueue = sortByPriority(
          updatedQueue.filter((item) => item.status !== "paused")
        );
        if (nextActiveQueue.length > 0) {
          setTimeout(() => processQueue(updatedQueue), 1000);
        }
      }
    } finally {
      processingRef.current = false;
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, []);

  // Initialization
  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      const stored = await loadQueue();

      // Register background task if it doesn't exist
      const tasks = await TaskManager.getRegisteredTasksAsync();
      const taskExists = tasks.find((t) => t.taskName === TASK_NAME);

      if (!taskExists && stored.length > 0) {
        await BackgroundTask.registerTaskAsync(TASK_NAME);
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
    };
  }, [loadQueue]);

  // Foreground processing
  useEffect(() => {
    if (queue.length > 0) {
      processQueue(queue);
    }
  }, [queue, processQueue]);

  // Optimized polling
  useEffect(() => {
    const startPolling = () => {
      if (intervalRef.current) return;

      intervalRef.current = setInterval(async () => {
        if (!processingRef.current) {
          await loadQueue();
        }
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    startPolling();

    return stopPolling;
  }, [loadQueue]);

  // Function to add chapters to queue
  const enqueue = useCallback(
    async (chapters: DownloadChapter[], priority: number = 2) => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored: QueueItem[] = raw ? JSON.parse(raw) : [];

        // Create Set for O(1) lookup
        const existingHashes = new Set(stored.map(getChapterHash));

        // Filter new chapters
        const newOnes = chapters
          .filter((ch) => !existingHashes.has(getChapterHash(ch)))
          .map((ch) => ({
            ...ch,
            id: generateId(),
            retryCount: 0,
            timestamp: Date.now(),
            priority,
            status: "pending" as const,
          }));

        if (newOnes.length === 0) return;

        const updated = sortByPriority([...stored, ...newOnes]);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        if (mountedRef.current) {
          setQueue(updated);
        }

        // Ensure background task is registered
        await BackgroundTask.registerTaskAsync(TASK_NAME);
      } catch (error) {
        console.error("Error enqueueing chapters:", error);
      }
    },
    []
  );

  // Function to cancel a specific download
  const cancelDownload = useCallback(
    async (id: string) => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored: QueueItem[] = raw ? JSON.parse(raw) : [];

        const updated = stored.filter((item) => item.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        if (mountedRef.current) {
          setQueue(updated);
        }

        // If we cancel the one being downloaded, force processing of the next one
        const canceledItem = stored.find((item) => item.id === id);
        if (canceledItem?.status === "downloading") {
          processingRef.current = false;
          setIsProcessing(false);

          // Process next in queue
          const nextActiveQueue = sortByPriority(
            updated.filter((item) => item.status !== "paused")
          );
          if (nextActiveQueue.length > 0) {
            setTimeout(() => processQueue(updated), 500);
          }
        }
      } catch (error) {
        console.error("Error canceling download:", error);
      }
    },
    [processQueue]
  );

  // Function to cancel all downloads
  const cancelAllDownloads = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));

      if (mountedRef.current) {
        setQueue([]);
      }

      // Stop current processing
      processingRef.current = false;
      setIsProcessing(false);

      // Unregister background task
      await TaskManager.unregisterTaskAsync(TASK_NAME);
    } catch (error) {
      console.error("Error canceling all downloads:", error);
    }
  }, []);

  // Function to pause/resume a download
  const togglePause = useCallback(
    async (id: string) => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored: QueueItem[] = raw ? JSON.parse(raw) : [];

        const updated = stored.map((item) => {
          if (item.id === id) {
            const newStatus =
              item.status === "paused"
                ? ("pending" as const)
                : ("paused" as const);
            return { ...item, status: newStatus };
          }
          return item;
        });

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        if (mountedRef.current) {
          setQueue(updated);
        }

        // If resuming and no active processing, start
        const resumedItem = updated.find((item) => item.id === id);
        if (resumedItem?.status === "pending" && !processingRef.current) {
          setTimeout(() => processQueue(updated), 100);
        }
      } catch (error) {
        console.error("Error toggling pause:", error);
      }
    },
    [processQueue]
  );

  // Function to change priority
  const changePriority = useCallback(
    async (id: string, newPriority: number) => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored: QueueItem[] = raw ? JSON.parse(raw) : [];

        const updated = stored.map((item) => {
          if (item.id === id) {
            return { ...item, priority: newPriority };
          }
          return item;
        });

        const sortedQueue = sortByPriority(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sortedQueue));

        if (mountedRef.current) {
          setQueue(sortedQueue);
        }
      } catch (error) {
        console.error("Error changing priority:", error);
      }
    },
    []
  );

  // Function to move element up in queue
  const moveUp = useCallback(async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueItem[] = raw ? JSON.parse(raw) : [];

      const index = stored.findIndex((item) => item.id === id);
      if (index <= 0) return; // Already at top or doesn't exist

      const updated = [...stored];
      [updated[index - 1], updated[index]] = [
        updated[index],
        updated[index - 1],
      ];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (mountedRef.current) {
        setQueue(updated);
      }
    } catch (error) {
      console.error("Error moving item up:", error);
    }
  }, []);

  // Function to move element down in queue
  const moveDown = useCallback(async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueItem[] = raw ? JSON.parse(raw) : [];

      const index = stored.findIndex((item) => item.id === id);
      if (index === -1 || index >= stored.length - 1) return; // Doesn't exist or already at bottom

      const updated = [...stored];
      [updated[index], updated[index + 1]] = [
        updated[index + 1],
        updated[index],
      ];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (mountedRef.current) {
        setQueue(updated);
      }
    } catch (error) {
      console.error("Error moving item down:", error);
    }
  }, []);

  // Function to move to top of queue
  const moveToTop = useCallback(async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueItem[] = raw ? JSON.parse(raw) : [];

      const itemIndex = stored.findIndex((item) => item.id === id);
      if (itemIndex === -1 || itemIndex === 0) return;

      const item = stored[itemIndex];
      const updated = [item, ...stored.filter((item) => item.id !== id)];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (mountedRef.current) {
        setQueue(updated);
      }
    } catch (error) {
      console.error("Error moving to top:", error);
    }
  }, []);

  // Function to move to bottom of queue
  const moveToBottom = useCallback(async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueItem[] = raw ? JSON.parse(raw) : [];

      const itemIndex = stored.findIndex((item) => item.id === id);
      if (itemIndex === -1 || itemIndex === stored.length - 1) return;

      const item = stored[itemIndex];
      const updated = [...stored.filter((item) => item.id !== id), item];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (mountedRef.current) {
        setQueue(updated);
      }
    } catch (error) {
      console.error("Error moving to bottom:", error);
    }
  }, []);

  // Function to clear failed chapters
  const clearFailedChapters = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueItem[] = raw ? JSON.parse(raw) : [];

      const filtered = stored.filter((item) => item.status !== "failed");

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      if (mountedRef.current) {
        setQueue(filtered);
      }
    } catch (error) {
      console.error("Error clearing failed chapters:", error);
    }
  }, []);

  // Function to get statistics
  const getStats = useCallback(() => {
    const total = queue.length;
    const downloading = queue.filter((item) => item.status === "downloading")
      .length;
    const pending = queue.filter((item) => item.status === "pending").length;
    const paused = queue.filter((item) => item.status === "paused").length;
    const failed = queue.filter((item) => item.status === "failed").length;

    const byPriority = {
      high: queue.filter((item) => item.priority === 1).length,
      medium: queue.filter((item) => item.priority === 2).length,
      low: queue.filter((item) => item.priority === 3).length,
    };

    return {
      total,
      downloading,
      pending,
      paused,
      failed,
      byPriority,
      isProcessing,
    };
  }, [queue, isProcessing]);

  return {
    enqueue,
    queue,
    isProcessing,
    // Control functions
    cancelDownload,
    cancelAllDownloads,
    togglePause,
    // Priority and order functions
    changePriority,
    moveUp,
    moveDown,
    moveToTop,
    moveToBottom,
    // Cleanup and stats functions
    clearFailedChapters,
    getStats,
  };
}
