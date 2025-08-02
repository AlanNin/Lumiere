import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  createContext,
  ReactNode,
  useContext,
} from "react";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { novelController } from "@/server/controllers/novel";
import { DownloadChapter } from "@/types/download";
import { invalidateQueries } from "@/providers/reactQuery";
import * as Notifications from "expo-notifications";
import { useIsOnlineDirect } from "@/hooks/network";

const TASK_NAME = "DOWNLOAD_QUEUE_TASK";
const STORAGE_KEY = "DOWNLOAD_QUEUE";
const DOWNLOADS_PAUSED_KEY = "DOWNLOADS_PAUSED";
const NOTIFICATION_ID = "DOWNLOAD_PROGRESS";
const NOTIFICATION_CATEGORY = "DOWNLOAD_STATUS";
const POLL_INTERVAL_MS = 3000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Set handler so notifications show as banner/list when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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
  [...items].sort((a, b) => {
    const priorityA = a.priority || 2;
    const priorityB = b.priority || 2;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return (a.timestamp || 0) - (b.timestamp || 0);
  });

// Helper function to invalidate novel queries
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

// Helper function to ensure notification category
async function ensureNotificationCategory() {
  try {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
      {
        identifier: "PAUSE",
        buttonTitle: "Pause",
        options: { opensAppToForeground: true },
      },
    ]);
  } catch (e) {
    console.warn("Could not set notification category:", e);
  }
}

// Helper function to check if notification permission is already granted (does not prompt)
const hasNotificationPermission = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
};

// Helper function to update or create notification
const updateDownloadNotification = async (
  currentItem: QueueDownloadItem | null,
  totalItems: number,
  completedItems: number,
  isPaused: boolean = false
) => {
  if (!(await hasNotificationPermission())) return;

  try {
    if (!currentItem || isPaused) {
      // Dismiss notification if no current download or paused
      await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
      return;
    }

    const progress =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const remaining = totalItems - completedItems;

    const title = `Downloading - ${progress}%`;
    const body = `${currentItem.novelTitle} - Chapter ${currentItem.chapterNumber}`;

    // Use the same notification ID to update instead of creating new ones
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title,
        body,
        categoryIdentifier: NOTIFICATION_CATEGORY,
        data: {
          type: "download-status",
          novelTitle: currentItem.novelTitle,
          chapterNumber: currentItem.chapterNumber,
          progress,
          remaining,
        },
        sticky: true,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn("Error updating download notification:", e);
  }
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
      // Clear notification when queue is empty
      await updateDownloadNotification(null, 0, 0);
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

    // Calculate progress stats
    const totalOriginalItems = queueDownload.length + 1; // +1 for the one we're about to process
    const completedItems = totalOriginalItems - queueDownload.length;

    // Update status to 'downloading' and update notification
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

    // Update notification with current download info
    await updateDownloadNotification(
      updatedCurrentChapter,
      totalOriginalItems,
      completedItems
    );

    try {
      await novelController.downloadNovelChapter(currentChapter);

      // Successful download, remove from queueDownload
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(remainingQueueDownload)
      );

      // Update notification with new progress
      const newCompletedItems = completedItems + 1;
      await updateDownloadNotification(
        remainingQueueDownload.find((item) => item.status !== "paused") || null,
        totalOriginalItems,
        newCompletedItems
      );

      // Continue with next if there are more active elements
      const nextActiveQueueDownload = sortByPriority(
        remainingQueueDownload.filter((item) => item.status !== "paused")
      );
      if (nextActiveQueueDownload.length > 0) {
        setTimeout(() => {
          void BackgroundTask.registerTaskAsync(TASK_NAME).catch((e) =>
            console.warn("Failed to re-register background task:", e)
          );
        }, 1000);
      } else {
        // All downloads completed, clear notification
        await updateDownloadNotification(null, 0, 0);
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

export function useQueueDownloadStore() {
  const [queueDownload, setQueueDownload] = useState<QueueDownloadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const [areDownloadsPaused, setAreDownloadsPaused] = useState(false);
  const pausedRef = useRef(false);
  const notificationCategoryReadyRef = useRef(false);
  const ensurePermissionsRef = useRef(false);
  const totalItemsRef = useRef(0); // Track original total for progress calculation
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
        const queue: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];
        const active = sortByPriority(
          queue.filter((i) => i.status !== "paused")
        );

        if (
          active.length > 0 &&
          !processingRef.current &&
          !areDownloadsPaused
        ) {
          setTimeout(() => void processQueueDownload(), 100);
        }
      }
    };

    void handleConnection();
  }, [isOnline]);

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
      if (!isOnline) {
        setIsWaitingForConnection(true);
        return;
      }

      // Update notification to show paused state
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const queue: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];
      const currentDownloading = queue.find(
        (item) => item.status === "downloading"
      );
      if (currentDownloading) {
        await updateDownloadNotification(null, 0, 0, true);
      }
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
        // Clear notification when no active downloads
        await updateDownloadNotification(null, 0, 0);
        return;
      }

      processingRef.current = true;
      setIsProcessing(true);

      // 3) Take the first item to download
      const current = activeQueueDownload[0];

      // Calculate progress
      const completedItems = totalItemsRef.current - fullQueueDownload.length;

      // CHECK PAUSE STATE AGAIN BEFORE DOWNLOADING
      const pausedValueBeforeDownload = await AsyncStorage.getItem(
        DOWNLOADS_PAUSED_KEY
      );
      const stillGloballyPaused = pausedValueBeforeDownload === "true";

      if (stillGloballyPaused) {
        processingRef.current = false;
        setIsProcessing(false);
        await updateDownloadNotification(null, 0, 0, true);
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

      // Update notification with current download
      await updateDownloadNotification(
        updatedCurrent,
        totalItemsRef.current,
        completedItems
      );

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

        // Update notification with progress
        const newCompletedItems = completedItems + 1;
        const nextItem = remaining.find((item) => item.status !== "paused");
        await updateDownloadNotification(
          nextItem || null,
          totalItemsRef.current,
          newCompletedItems
        );
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
        } else {
          // All downloads completed
          await updateDownloadNotification(null, 0, 0);
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
      totalItemsRef.current = stored.length; // Set initial total

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

        // Update total count for progress calculation
        totalItemsRef.current = Math.max(totalItemsRef.current, updated.length);

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
            } else {
              // Clear notification if no more downloads
              await updateDownloadNotification(null, 0, 0);
            }
          }
        }
      } catch (error) {
        console.error("Error canceling download:", error);
      }
    },
    [processQueueDownload]
  );

  const cancelNovelDownloads = useCallback(
    async (novelTitle: string) => {
      if (!novelTitle) return;

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

        const toCancel = stored.filter((i) => i.novelTitle === novelTitle);
        if (toCancel.length === 0) return; // nothing to do

        const updated = stored.filter((i) => i.novelTitle !== novelTitle);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        if (mountedRef.current) {
          setQueueDownload(updated);
        }

        // If any of the cancelled items was downloading, reset and process next
        const hadDownloading = toCancel.some((i) => i.status === "downloading");
        if (hadDownloading) {
          processingRef.current = false;
          setIsProcessing(false);

          const pausedValue = await AsyncStorage.getItem(DOWNLOADS_PAUSED_KEY);
          const isPaused = pausedValue === "true";

          if (!isPaused) {
            const nextActiveQueueDownload = sortByPriority(
              updated.filter((item) => item.status !== "paused")
            );
            if (nextActiveQueueDownload.length > 0) {
              setTimeout(() => processQueueDownload(), 500);
            } else {
              await updateDownloadNotification(null, 0, 0);
            }
          }
        }
      } catch (error) {
        console.error("Error canceling novel downloads:", error);
      }
    },
    [processQueueDownload, sortByPriority]
  );

  // Function to cancel all downloads
  const cancelAllDownloads = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));

      if (mountedRef.current) {
        setQueueDownload([]);
      }

      // Clear notification
      await updateDownloadNotification(null, 0, 0);

      // Reset total count
      totalItemsRef.current = 0;

      // Stop current processing
      processingRef.current = false;
      setIsProcessing(false);

      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
        if (isRegistered) {
          await TaskManager.unregisterTaskAsync(TASK_NAME);
        }
      } catch (taskErr) {
        if (
          taskErr instanceof Error &&
          /not found for app ID/.test(taskErr.message)
        ) {
        } else {
          console.warn("Error unregistering background task:", taskErr);
        }
      }
    } catch (error) {
      console.error("Error canceling all downloads:", error);
    }
  }, [setQueueDownload, setIsProcessing]);

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

  const changePriority = useCallback(
    async (id: string, newPriority: number) => {
      if (!id) {
        console.warn("changePriority called with empty id");
        return;
      }
      if (newPriority < 0) {
        console.warn("Invalid newPriority", newPriority);
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored: QueueDownloadItem[] = raw ? JSON.parse(raw) : [];

        const targetIdx = stored.findIndex(
          (item) => String(item.id) === String(id)
        );
        if (targetIdx === -1) {
          console.warn("Item to change priority not found", {
            id,
            existing: stored.map((i) => i.id),
          });
          return;
        }

        const target = stored[targetIdx];
        // Remove target so we can re-insert it at newPriority
        const others = stored.filter((_, idx) => idx !== targetIdx);

        // Shift any existing item with priority >= newPriority down by 1
        const updatedOthers = others.map((item) => {
          const prio = item.priority ?? Infinity;
          if (prio >= newPriority) {
            return { ...item, priority: prio + 1 };
          }
          return item;
        });

        const updatedTarget: QueueDownloadItem = {
          ...target,
          priority: newPriority,
        };

        const merged = [...updatedOthers, updatedTarget];
        const sortedQueueDownload = sortByPriority(merged);

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
    [sortByPriority]
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

  // Function to move a novel to the top or bottom of the queue
  const moveNovelToTop = useCallback(
    async (novelTitle: string) => {
      if (!novelTitle) return;
      const current = queueDownload;
      const novelItems = current.filter((i) => i.novelTitle === novelTitle);
      if (novelItems.length === 0) return;

      const others = current.filter((i) => i.novelTitle !== novelTitle);
      const newQueue = [...novelItems, ...others];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newQueue));
      if (mountedRef.current) {
        setQueueDownload(newQueue);
      }
    },
    [queueDownload]
  );

  // Function to move a novel to the top or bottom of the queue
  const moveNovelToBottom = useCallback(
    async (novelTitle: string) => {
      if (!novelTitle) return;
      const current = queueDownload;
      const novelItems = current.filter((i) => i.novelTitle === novelTitle);
      if (novelItems.length === 0) return;

      const others = current.filter((i) => i.novelTitle !== novelTitle);
      const newQueue = [...others, ...novelItems];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newQueue));
      if (mountedRef.current) {
        setQueueDownload(newQueue);
      }
    },
    [queueDownload]
  );

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

    const completed = totalItemsRef.current - total;
    const progress =
      totalItemsRef.current > 0
        ? Math.round((completed / totalItemsRef.current) * 100)
        : 0;

    return {
      total,
      downloading,
      pending,
      paused,
      failed,
      completed,
      progress,
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

      // Update notification to show paused state
      await updateDownloadNotification(null, 0, 0, true);

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

  // Initialize notification category only if permission exists
  useEffect(() => {
    const initNotifications = async () => {
      if (ensurePermissionsRef.current) return;
      ensurePermissionsRef.current = true;

      if (!(await hasNotificationPermission())) {
        return; // No permission: do nothing
      }

      if (!notificationCategoryReadyRef.current) {
        await ensureNotificationCategory().catch((e) =>
          console.warn("Failed to ensure notification category:", e)
        );
        notificationCategoryReadyRef.current = true;
      }
    };
    void initNotifications();
  }, []);

  // Listen for notification action (Pause) and toggle all downloads paused
  useEffect(() => {
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        try {
          const actionId = response.actionIdentifier;
          if (actionId === "PAUSE") {
            toggleAllDownloadsPaused();
          }
        } catch (e) {
          console.error("Error handling notification response:", e);
        }
      }
    );

    return () => {
      responseListener.remove();
    };
  }, [toggleAllDownloadsPaused]);

  // Ensure notification is updated based on current state
  useEffect(() => {
    const updateNotificationState = async () => {
      if (areDownloadsPaused) {
        await updateDownloadNotification(null, 0, 0, true);
        return;
      }

      const currentDownloading = queueDownload.find(
        (item) => item.status === "downloading"
      );

      if (!currentDownloading) {
        if (queueDownload.length === 0) {
          await updateDownloadNotification(null, 0, 0);
        }
        return;
      }

      const completed = totalItemsRef.current - queueDownload.length;
      await updateDownloadNotification(
        currentDownloading,
        totalItemsRef.current,
        completed
      );
    };

    void updateNotificationState();
  }, [queueDownload, areDownloadsPaused]);

  return {
    enqueueDownload,
    queueDownload,
    groupedQueueDownload,
    isProcessing,
    areDownloadsPaused,
    isWaitingForConnection,
    // Control functions
    cancelDownload,
    cancelNovelDownloads,
    cancelAllDownloads,
    togglePause,
    toggleAllDownloadsPaused,
    // Priority and order functions
    changePriority,
    moveUp,
    moveDown,
    moveToTop,
    moveToBottom,
    moveNovelToTop,
    moveNovelToBottom,
    // Cleanup and stats functions
    clearFailedChapters,
    getStats,
  };
}

type QueueStoreType = ReturnType<typeof useQueueDownloadStore>;

const ChapterDownloadQueueContext = createContext<QueueStoreType | null>(null);

export function ChapterDownloadQueueProvider({
  children,
}: {
  children: ReactNode;
}) {
  const store = useQueueDownloadStore();
  return (
    <ChapterDownloadQueueContext.Provider value={store}>
      {children}
    </ChapterDownloadQueueContext.Provider>
  );
}

export function useChapterDownloadQueue() {
  const ctx = useContext(ChapterDownloadQueueContext);
  if (!ctx) {
    throw new Error(
      "useChapterDownloadQueue must be used within a ChapterDownloadQueueProvider"
    );
  }
  return ctx;
}
