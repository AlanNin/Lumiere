import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define the type for the configuration
type ConfigType = object | string | number | boolean | undefined;

// Define the type for the context value
type ConfigContextType = {
  config: Record<string, ConfigType>; // Store multiple configs by key
  saveConfig: (
    key: string,
    newConfig: ConfigType | ((prevState: ConfigType) => ConfigType)
  ) => void;
};

// Create the context with a default value
const ConfigContext = createContext<ConfigContextType>({
  config: {},
  saveConfig: () => {},
});

// Custom hook to use the ConfigContext
export const useConfig = <T extends ConfigType>(
  key: string,
  defaultValue: T
): [T, (newConfig: T | ((prevState: T) => T)) => void] => {
  const { config, saveConfig } = useContext(ConfigContext);

  // Get the current config value for the key
  const currentConfig =
    config[key] !== undefined ? (config[key] as T) : defaultValue;

  // Function to update the config for the key
  const updateConfig = useCallback(
    (newConfig: T | ((prevState: T) => T)) => {
      saveConfig(key, newConfig);
    },
    [key, saveConfig]
  );

  return [currentConfig, updateConfig];
};

// Define the props for the ConfigProvider component
type ConfigProviderProps = {
  children: ReactNode;
};

// ConfigProvider component
export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<Record<string, ConfigType>>({});

  // Load all configs from AsyncStorage on mount
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const storedConfigs = await AsyncStorage.multiGet(keys);

        const loadedConfigs: Record<string, ConfigType> = {};
        storedConfigs.forEach(([key, value]) => {
          if (value) {
            loadedConfigs[key] = JSON.parse(value);
          }
        });

        setConfig(loadedConfigs);
      } catch (error) {
        console.error("Failed to load configs:", error);
      }
    };

    loadConfigs();
  }, []);

  // Function to save a config for a specific key
  const saveConfig = useCallback(
    async (
      key: string,
      newConfig: ConfigType | ((prevState: ConfigType) => ConfigType)
    ) => {
      try {
        const configToSave =
          typeof newConfig === "function"
            ? (newConfig as (prevState: ConfigType) => ConfigType)(config[key])
            : newConfig;

        if (configToSave !== undefined) {
          await AsyncStorage.setItem(key, JSON.stringify(configToSave));
          setConfig((prev) => ({ ...prev, [key]: configToSave }));
        }
      } catch (error) {
        console.error(`Failed to save config for ${key}:`, error);
      }
    },
    [config]
  );

  return (
    <ConfigContext.Provider value={{ config, saveConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};
