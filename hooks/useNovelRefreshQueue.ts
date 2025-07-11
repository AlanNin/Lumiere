import { useState, useEffect, useRef, useCallback } from "react";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { novelController } from "@/server/controllers/novel";

const TASK_NAME = "NOVEL_REFRESH_TASK";
const STORAGE_KEY = "NOVEL_REFRESH_QUEUE";
const PROCESS_DELAY = 100; // ms

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let queue: string[] = raw ? JSON.parse(raw) : [];
    if (queue.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const title = queue[0];
    try {
      await novelController.refreshNovel({ title });
    } catch (e) {
      console.error("Background refresh failed for", title, e);
      // you could re-enqueue or give up here
    }

    // remove head
    queue = queue.slice(1);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    // re-schedule if more left
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
  const [queue, setQueue] = useState<string[]>([]);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const processingRef = useRef(false);

  const loadQueue = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    setQueue(list);
    return list;
  }, []);

  const saveQueue = useCallback(async (list: string[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    setQueue(list);
  }, []);

  // Core loop: fire-and-forget refresh in foreground
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    let list = await loadQueue();
    while (list.length > 0) {
      const title = list[0];
      setCurrentTitle(title);
      try {
        await novelController.refreshNovel({ title });
      } catch (e) {
        console.error("Foreground refresh failed for", title, e);
      }
      list = list.slice(1);
      await saveQueue(list);
      await new Promise((r) => setTimeout(r, PROCESS_DELAY));
    }

    setCurrentTitle(null);
    processingRef.current = false;
  }, [loadQueue, saveQueue]);

  // On mount: hydrate + schedule background if needed
  useEffect(() => {
    (async () => {
      const list = await loadQueue();
      if (list.length > 0) {
        // start foreground immediately...
        processQueue();
        // ...and register background so it can continue when the app is in background
        await BackgroundTask.registerTaskAsync(TASK_NAME);
      }
    })();
  }, [loadQueue, processQueue]);

  const enqueueRefresh = useCallback(
    async (titles: string[]) => {
      // Load existing queue
      const list = await loadQueue();

      // Filter out any that are already queued
      const newOnes = titles.filter((t) => !list.includes(t));
      if (newOnes.length === 0) return;

      // Append all new titles at once
      const updated = [...list, ...newOnes];
      await saveQueue(updated);

      // Kick off processing both foreground & background
      processQueue();
      await BackgroundTask.registerTaskAsync(TASK_NAME);
    },
    [loadQueue, saveQueue, processQueue]
  );

  const isRefreshing = useCallback((title: string) => currentTitle === title, [
    currentTitle,
  ]);

  return {
    queue,
    currentTitle,
    enqueueRefresh,
    isRefreshing,
  };
}
