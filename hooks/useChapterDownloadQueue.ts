import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { novelController } from "@/server/controllers/novel";
import { DownloadChapter } from "@/types/download";
import { invalidateQueries } from "@/providers/reactQuery";

const TASK_NAME = "DOWNLOAD_QUEUE_TASK";
const STORAGE_KEY = "DOWNLOAD_QUEUE";
const DOWNLOADS_PAUSED_KEY = "DOWNLOADS_PAUSED";
const POLL_INTERVAL_MS = 3000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Extended interface to handle retries and control
export interface QueueDownloadItem extends DownloadChapter {
  retryCount?: number;
  lastError?: string;
  timestamp?: number;
  id?: string; // Unique ID to identify elements
  priority?: number; // 1 = high, 2 = medium, 3 = low
  status?: "pending" | "downloading" | "paused" | "failed";
}

export interface GroupedQueueChapters {
  novelTitle: string;
  chapters: QueueDownloadItem[];
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
const sortByPriority = (items: QueueDownloadItem[]): QueueDownloadItem[] =>
  items.sort((a, b) => {
    const priorityA = a.priority || 2;
    const priorityB = b.priority || 2;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return (a.timestamp || 0) - (b.timestamp || 0); // By time if same priority
  });

// Helper function to nvalidate novel queries
const invalidateNovelQueries = ({
  novelTitle,
  chapterNumber,
}: {
  novelTitle: string;
  chapterNumber: number;
}) => {
  invalidateQueries(
    ["novel-info", novelTitle],
    ["novel-chapter", novelTitle, chapterNumber]
  );
};

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const globallyPaused =
      (await AsyncStorage.getItem(DOWNLOADS_PAUSED_KEY)) === "true";
    if (globallyPaused) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const queueDownload: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

    if (queueDownload.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    // Filter non-paused elements and sort by priority
    const activeQueueDownload = sortByPriority(
      queueDownload.filter((item) => item.status !== "paused")
    );

    if (activeQueueDownload.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const [currentChapter, ...rest] = activeQueueDownload;
    const remainingQueueDownload = queueDownload.filter(
      (item) => item.id !== currentChapter.id
    );

    // Update status to 'downloading'
    const updatedCurrentChapter = {
      ...currentChapter,
      status: "downloading" as const,
    };
    const queueDownloadWithUpdatedStatus = [
      updatedCurrentChapter,
      ...remainingQueueDownload,
    ];
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(queueDownloadWithUpdatedStatus)
    );

    try {
      await novelController.downloadNovelChapter(currentChapter);

      // Successful download, remove from queueDownload
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(remainingQueueDownload)
      );

      // Continue with next if there are more active elements
      const nextActiveQueueDownload = sortByPriority(
        remainingQueueDownload.filter((item) => item.status !== "paused")
      );
      if (nextActiveQueueDownload.length > 0) {
        setTimeout(() => {
          BackgroundTask.registerTaskAsync(TASK_NAME);
        }, 1000);
      }

      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      // Handle retries
      const retryCount = (currentChapter.retryCount || 0) + 1;

      if (retryCount <= MAX_RETRIES) {
        const updatedChapter: QueueDownloadItem = {
          ...currentChapter,
          retryCount,
          lastError: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now(),
          status: "pending" as const,
        };

        // Update the chapter in the queueDownload
        const updatedQueueDownload = remainingQueueDownload.map((item) =>
          item.id === currentChapter.id ? updatedChapter : item
        );
        if (
          !updatedQueueDownload.some((item) => item.id === currentChapter.id)
        ) {
          updatedQueueDownload.push(updatedChapter);
        }

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updatedQueueDownload)
        );

        // Wait before next attempt
        await delay(RETRY_DELAY_MS * retryCount);

        const nextActiveQueueDownload = sortByPriority(
          updatedQueueDownload.filter((item) => item.status !== "paused")
        );
        if (nextActiveQueueDownload.length > 0) {
          await BackgroundTask.registerTaskAsync(TASK_NAME);
        }
      } else {
        // Maximum retries reached, mark as failed
        const failedChapter = { ...currentChapter, status: "failed" as const };
        const updatedQueueDownload = remainingQueueDownload.map((item) =>
          item.id === currentChapter.id ? failedChapter : item
        );
        if (
          !updatedQueueDownload.some((item) => item.id === currentChapter.id)
        ) {
          updatedQueueDownload.push(failedChapter);
        }

        console.error(
          `Max retries reached for chapter: ${getChapterHash(currentChapter)}`
        );
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updatedQueueDownload)
        );

        const nextActiveQueueDownload = sortByPriority(
          updatedQueueDownload.filter((item) => item.status !== "paused")
        );
        if (nextActiveQueueDownload.length > 0) {
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
  const [queueDownload, setQueueDownload] = useState<QueueDownloadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const [areDownloadsPaused, setAreDownloadsPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = areDownloadsPaused;
  }, [areDownloadsPaused]);

  // Function to load queueDownload from storage
  const loadQueueDownload = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];
      if (mountedRef.current) {
        setQueueDownload(stored);
      }
      return stored;
    } catch (error) {
      console.error("Error loading queueDownload:", error);
      return [];
    }
  }, []);

  // Function to process queueDownload in foreground
  const processQueueDownload = useCallback(async () => {
    // CHECK GLOBAL PAUSE STATE FIRST
    const pausedValue = await AsyncStorage.getItem(DOWNLOADS_PAUSED_KEY);
    const globallyPaused = pausedValue === "true";

    if (globallyPaused || pausedRef.current) {
      return;
    }

    // Prevent re-entrancy
    if (processingRef.current) return;

    try {
      // 1) Read the latest queueDownload from storage
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const fullQueueDownload: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

      // 2) Filter out paused items and sort by priority + timestamp
      const activeQueueDownload = sortByPriority(
        fullQueueDownload.filter((item) => item.status !== "paused")
      );
      if (activeQueueDownload.length === 0) {
        // Nothing to process
        return;
      }

      processingRef.current = true;
      setIsProcessing(true);

      // 3) Take the first item to download
      const current = activeQueueDownload[0];

      // CHECK PAUSE STATE AGAIN BEFORE DOWNLOADING
      const pausedValueBeforeDownload = await AsyncStorage.getItem(
        DOWNLOADS_PAUSED_KEY
      );
      const stillGloballyPaused = pausedValueBeforeDownload === "true";

      if (stillGloballyPaused) {
        processingRef.current = false;
        setIsProcessing(false);
        return;
      }

      // 4) Mark it as "downloading" both in storage and in local state
      const updatedCurrent: QueueDownloadItem = {
        ...current,
        status: "downloading",
      };
      const queueDownloadWithStatus = [
        updatedCurrent,
        ...fullQueueDownload.filter((i) => i.id !== current.id),
      ];
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(queueDownloadWithStatus)
      );
      if (mountedRef.current) setQueueDownload(queueDownloadWithStatus);

      try {
        // 5) Perform the actual download
        await novelController.downloadNovelChapter(current);

        // 6) Invalidate related React-Query caches on success
        invalidateNovelQueries({
          novelTitle: current.novelTitle,
          chapterNumber: current.chapterNumber,
        });

        // 7) Re-read the queueDownload to pick up any items added during download
        const rawAfter = await AsyncStorage.getItem(STORAGE_KEY);
        const latestQueueDownload: QueueDownloadItem[] = rawAfter
          ? JSON.parse(rawAfter)
          : [];

        // 8) Remove the completed item and persist
        const remaining = latestQueueDownload.filter(
          (i) => i.id !== current.id
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
        if (mountedRef.current) setQueueDownload(remaining);
      } catch (downloadError) {
        // 9) Handle retry logic
        const retryCount = (current.retryCount || 0) + 1;
        const afterRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const queueDownloadNow: QueueDownloadItem[] = afterRaw
          ? JSON.parse(afterRaw)
          : [];

        if (retryCount <= MAX_RETRIES) {
          // 9a) Re-enqueueDownload with increased retryCount
          const retried: QueueDownloadItem = {
            ...current,
            retryCount,
            lastError:
              downloadError instanceof Error
                ? downloadError.message
                : "Unknown error",
            status: "pending",
            timestamp: Date.now(),
          };
          const withoutCurrent = queueDownloadNow.filter(
            (i) => i.id !== current.id
          );
          const updatedQueueDownload = sortByPriority([
            ...withoutCurrent,
            retried,
          ]);

          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(updatedQueueDownload)
          );
          if (mountedRef.current) setQueueDownload(updatedQueueDownload);

          // delay before next retry
          await delay(RETRY_DELAY_MS * retryCount);
        } else {
          // 9b) Mark as failed after exhausting retries
          const failed: QueueDownloadItem = { ...current, status: "failed" };
          const withoutCurrent = queueDownloadNow.filter(
            (i) => i.id !== current.id
          );
          const updatedQueueDownload = [...withoutCurrent, failed];

          console.error(`Max retries for ${getChapterHash(current)}`);
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(updatedQueueDownload)
          );
          if (mountedRef.current) setQueueDownload(updatedQueueDownload);

          // Invalidate cache for the failed chapter
          invalidateQueries(
            ["novel-info", current.novelTitle],
            ["novel-chapter", current.novelTitle, current.chapterNumber]
          );
        }
      }

      // 10) Continue processing remaining items - but check pause state first
      const pausedValueAfter = await AsyncStorage.getItem(DOWNLOADS_PAUSED_KEY);
      const pausedAgain = pausedValueAfter === "true";

      if (!pausedAgain) {
        const nextRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const nextQueueDownload: QueueDownloadItem[] = nextRaw
          ? JSON.parse(nextRaw)
          : [];
        const nextActive = sortByPriority(
          nextQueueDownload.filter((item) => item.status !== "paused")
        );
        if (nextActive.length > 0) {
          setTimeout(() => void processQueueDownload(), 100);
        }
      }
    } catch (err) {
      console.error("Error in processQueueDownload:", err);
    } finally {
      // Reset processing flag
      processingRef.current = false;
      if (mountedRef.current) setIsProcessing(false);
    }
  }, []);

  // Initialization
  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      const stored = await loadQueueDownload();

      // LOAD PAUSE STATE ON INIT
      const pausedValue = await AsyncStorage.getItem(DOWNLOADS_PAUSED_KEY);
      const pausedFlag = pausedValue === "true";

      setAreDownloadsPaused(pausedFlag);

      // Register background task if it doesn't exist and not paused
      const tasks = await TaskManager.getRegisteredTasksAsync();
      const taskExists = tasks.find((t) => t.taskName === TASK_NAME);

      if (!taskExists && stored.length > 0 && !pausedFlag) {
        await BackgroundTask.registerTaskAsync(TASK_NAME);
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
    };
  }, [loadQueueDownload]);

  // Only process if not paused
  useEffect(() => {
    if (queueDownload.length > 0 && !areDownloadsPaused) {
      processQueueDownload();
    }
  }, [queueDownload, processQueueDownload, areDownloadsPaused]);

  // Optimized polling
  useEffect(() => {
    const startPolling = () => {
      if (intervalRef.current) return;

      intervalRef.current = setInterval(async () => {
        if (!processingRef.current && !areDownloadsPaused) {
          await loadQueueDownload();
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
  }, [loadQueueDownload, areDownloadsPaused]);

  // Function to add chapters to queueDownload
  const enqueueDownload = useCallback(
    async (chapters: DownloadChapter[], priority: number = 2) => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

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
          setQueueDownload(updated);
        }

        // Only register background task if not paused
        const pausedValue = await AsyncStorage.getItem(DOWNLOADS_PAUSED_KEY);
        const isPaused = pausedValue === "true";

        if (!isPaused) {
          await BackgroundTask.registerTaskAsync(TASK_NAME);
        }
      } catch (error) {
        console.error("Error enqueueDownloading chapters:", error);
      }
    },
    []
  );

  // Function to cancel a specific download
  const cancelDownload = useCallback(
    async (id: string) => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

        const updated = stored.filter((item) => item.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        if (mountedRef.current) {
          setQueueDownload(updated);
        }

        // If we cancel the one being downloaded, force processing of the next one
        const canceledItem = stored.find((item) => item.id === id);
        if (canceledItem?.status === "downloading") {
          processingRef.current = false;
          setIsProcessing(false);

          // Only process next if not paused
          const pausedValue = await AsyncStorage.getItem(DOWNLOADS_PAUSED_KEY);
          const isPaused = pausedValue === "true";

          if (!isPaused) {
            const nextActiveQueueDownload = sortByPriority(
              updated.filter((item) => item.status !== "paused")
            );
            if (nextActiveQueueDownload.length > 0) {
              setTimeout(() => processQueueDownload(), 500);
            }
          }
        }
      } catch (error) {
        console.error("Error canceling download:", error);
      }
    },
    [processQueueDownload]
  );

  // Function to cancel all downloads
  const cancelAllDownloads = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));

      if (mountedRef.current) {
        setQueueDownload([]);
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
        const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

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
          setQueueDownload(updated);
        }

        // Check global pause state before processing
        const resumedItem = updated.find((item) => item.id === id);
        const pausedValue = await AsyncStorage.getItem(DOWNLOADS_PAUSED_KEY);
        const globallyPaused = pausedValue === "true";

        if (
          resumedItem?.status === "pending" &&
          !processingRef.current &&
          !globallyPaused
        ) {
          setTimeout(() => processQueueDownload(), 100);
        }
      } catch (error) {
        console.error("Error toggling pause:", error);
      }
    },
    [processQueueDownload]
  );

  // Function to change priority
  const changePriority = useCallback(
    async (id: string, newPriority: number) => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

        const updated = stored.map((item) => {
          if (item.id === id) {
            return { ...item, priority: newPriority };
          }
          return item;
        });

        const sortedQueueDownload = sortByPriority(updated);
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(sortedQueueDownload)
        );

        if (mountedRef.current) {
          setQueueDownload(sortedQueueDownload);
        }
      } catch (error) {
        console.error("Error changing priority:", error);
      }
    },
    []
  );

  // Function to move element up in queueDownload
  const moveUp = useCallback(async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

      const index = stored.findIndex((item) => item.id === id);
      if (index <= 0) return; // Already at top or doesn't exist

      const updated = [...stored];
      [updated[index - 1], updated[index]] = [
        updated[index],
        updated[index - 1],
      ];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (mountedRef.current) {
        setQueueDownload(updated);
      }
    } catch (error) {
      console.error("Error moving item up:", error);
    }
  }, []);

  // Function to move element down in queueDownload
  const moveDown = useCallback(async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

      const index = stored.findIndex((item) => item.id === id);
      if (index === -1 || index >= stored.length - 1) return; // Doesn't exist or already at bottom

      const updated = [...stored];
      [updated[index], updated[index + 1]] = [
        updated[index + 1],
        updated[index],
      ];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (mountedRef.current) {
        setQueueDownload(updated);
      }
    } catch (error) {
      console.error("Error moving item down:", error);
    }
  }, []);

  // Function to move to top of queueDownload
  const moveToTop = useCallback(async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

      const itemIndex = stored.findIndex((item) => item.id === id);
      if (itemIndex === -1 || itemIndex === 0) return;

      const item = stored[itemIndex];
      const updated = [item, ...stored.filter((item) => item.id !== id)];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (mountedRef.current) {
        setQueueDownload(updated);
      }
    } catch (error) {
      console.error("Error moving to top:", error);
    }
  }, []);

  // Function to move to bottom of queueDownload
  const moveToBottom = useCallback(async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

      const itemIndex = stored.findIndex((item) => item.id === id);
      if (itemIndex === -1 || itemIndex === stored.length - 1) return;

      const item = stored[itemIndex];
      const updated = [...stored.filter((item) => item.id !== id), item];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (mountedRef.current) {
        setQueueDownload(updated);
      }
    } catch (error) {
      console.error("Error moving to bottom:", error);
    }
  }, []);

  // Function to clear failed chapters
  const clearFailedChapters = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

      const filtered = stored.filter((item) => item.status !== "failed");

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      if (mountedRef.current) {
        setQueueDownload(filtered);
      }
    } catch (error) {
      console.error("Error clearing failed chapters:", error);
    }
  }, []);

  // Function to get statistics
  const getStats = useCallback(() => {
    const total = queueDownload.length;
    const downloading = queueDownload.filter(
      (item) => item.status === "downloading"
    ).length;
    const pending = queueDownload.filter((item) => item.status === "pending")
      .length;
    const paused = queueDownload.filter((item) => item.status === "paused")
      .length;
    const failed = queueDownload.filter((item) => item.status === "failed")
      .length;

    const byPriority = {
      high: queueDownload.filter((item) => item.priority === 1).length,
      medium: queueDownload.filter((item) => item.priority === 2).length,
      low: queueDownload.filter((item) => item.priority === 3).length,
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
  }, [queueDownload, isProcessing]);

  // Function to pause all downloads
  const pauseAllDownloads = useCallback(async () => {
    try {
      // Set the pause flag in storage
      await AsyncStorage.setItem(DOWNLOADS_PAUSED_KEY, "true");
      setAreDownloadsPaused(true);

      // STOP CURRENT PROCESSING IMMEDIATELY
      processingRef.current = false;
      setIsProcessing(false);

      // UNREGISTER BACKGROUND TASK TO PREVENT IT FROM RUNNING
      try {
        await TaskManager.unregisterTaskAsync(TASK_NAME);
      } catch (e) {
        // Do nothing if task is not registered
      }

      // CLEAR POLLING INTERVAL
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch (e) {
      console.error("❌ Error pausing all downloads:", e);
    }
  }, []);

  //  Function to resume all downloads
  const resumeAllDownloads = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(DOWNLOADS_PAUSED_KEY);
      setAreDownloadsPaused(false);

      // RE-REGISTER BACKGROUND TASK
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const queue: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];
      const active = sortByPriority(queue.filter((i) => i.status !== "paused"));

      if (active.length > 0) {
        await BackgroundTask.registerTaskAsync(TASK_NAME);

        // RESTART POLLING
        if (!intervalRef.current) {
          intervalRef.current = setInterval(async () => {
            if (!processingRef.current && !areDownloadsPaused) {
              await loadQueueDownload();
            }
          }, POLL_INTERVAL_MS);
        }

        // KICK OFF FOREGROUND PROCESSING
        if (!processingRef.current) {
          setTimeout(() => {
            void processQueueDownload();
          }, 100);
        }
      }
    } catch (e) {
      console.error("❌ Error resuming all downloads:", e);
    }
  }, [processQueueDownload, loadQueueDownload]);

  // Function to toggle pause/resume all downloads
  const toggleAllDownloadsPaused = useCallback(async () => {
    if (areDownloadsPaused) {
      await resumeAllDownloads();
    } else {
      await pauseAllDownloads();
    }
  }, [areDownloadsPaused, pauseAllDownloads, resumeAllDownloads]);

  // Grouped queue by novel
  const groupedQueueDownload = useMemo<GroupedQueueChapters[]>(() => {
    const map = new Map<string, QueueDownloadItem[]>();
    for (const item of queueDownload) {
      if (!map.has(item.novelTitle)) map.set(item.novelTitle, []);
      map.get(item.novelTitle)!.push(item);
    }
    return Array.from(map.entries()).map(([novelTitle, chapters]) => ({
      novelTitle,
      chapters: sortByPriority(chapters),
    }));
  }, [queueDownload]);

  return {
    enqueueDownload,
    queueDownload,
    groupedQueueDownload,
    isProcessing,
    areDownloadsPaused,
    // Control functions
    cancelDownload,
    cancelAllDownloads,
    togglePause,
    toggleAllDownloadsPaused,
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
