import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from "react";
import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from "@react-native-community/netinfo";

export interface NetworkInfo {
  // Device has any network connection (may be captive / no internet)
  isConnected: boolean;
  // Whether the internet is actually reachable (more reliable for real online)
  isInternetReachable: boolean | null;
  // Type of connection: wifi, cellular, none, unknown, etc.
  connectionType: NetInfoState["type"];
  // Raw NetInfoState for advanced use if needed
  raw: NetInfoState;
}

// Derived convenience flag: clearly online (connected and internet reachable)
export const isOnline = (info: NetworkInfo) =>
  info.isConnected && info.isInternetReachable !== false;

const NetworkContext = createContext<NetworkInfo | undefined>(undefined);

interface Props {
  children: ReactNode;
  /**
   * Optional debounce in ms to swallow very rapid flapping updates.
   * Defaults to 300ms.
   */
  debounceMs?: number;
}

/**
 * Provider that keeps live network state and exposes it via context.
 */
export const NetworkProvider = ({ children, debounceMs = 300 }: Props) => {
  const [state, setState] = useState<NetInfoState | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    let lastUpdate = 0;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const handleChange = (s: NetInfoState) => {
      const now = Date.now();
      const apply = () => {
        setState(s);
        setNetworkInfo({
          isConnected: !!s.isConnected,
          isInternetReachable: s.isInternetReachable,
          connectionType: s.type,
          raw: s,
        });
        lastUpdate = now;
      };

      if (debounceMs > 0) {
        if (now - lastUpdate >= debounceMs) {
          apply();
        } else {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          timeoutHandle = setTimeout(apply, debounceMs);
        }
      } else {
        apply();
      }
    };

    // initial fetch
    NetInfo.fetch()
      .then(handleChange)
      .catch(() => {
        // swallow; listener will catch updates
      });

    const unsubscribe: NetInfoSubscription = NetInfo.addEventListener(
      handleChange
    );

    return () => {
      unsubscribe();
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [debounceMs]);

  const value = useMemo<NetworkInfo | undefined>(() => {
    if (networkInfo) return networkInfo;
    if (state) {
      return {
        isConnected: !!state.isConnected,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
        raw: state,
      };
    }
    return undefined;
  }, [networkInfo, state]);

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
};

/**
 * Hook to consume live network info. Throws if used outside provider.
 */
export const useNetwork = (): NetworkInfo => {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return ctx;
};

/**
 * Convenience hook that returns a boolean "online" state.
 */
export const useIsOnline = (): boolean => {
  const info = useNetwork();
  return isOnline(info);
};

/**
 * HOC alternative to inject network info into a component.
 */
export function withNetwork<P extends { network: NetworkInfo }>(
  Wrapped: React.ComponentType<P>
) {
  return (props: Omit<P, "network">) => {
    const network = useNetwork();
    return <Wrapped {...(props as any)} network={network} />;
  };
}
