import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export const useIsOnlineDirect = (): boolean => {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const state = await NetInfo.fetch();
        const isConnected = !!state.isConnected;
        const isInternetReachable = state.isInternetReachable !== false;
        setOnline(isConnected && isInternetReachable);
      } catch {
        setOnline(false);
      }
    };

    checkStatus();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected;
      const isInternetReachable = state.isInternetReachable !== false;
      setOnline(isConnected && isInternetReachable);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return online;
};
