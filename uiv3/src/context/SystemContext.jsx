// System settings set by the administrator (confidence levels, detection defaults, learning).
// Every signed-in account reads them; only administrators can save them.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_THRESHOLDS } from "../config/constants";
import { levelOf } from "../utils/confidence";
import { getSettings, saveSetting as saveSettingApi } from "../services/settingsService";
import { useAuth } from "./AuthContext";

const DEFAULT_SYSTEM = {
  confidence_thresholds: { ...DEFAULT_THRESHOLDS },
  detection_defaults: { confidence: 0.25, tile_size: 640, normalize: "none" },
  learning: { enabled: true, min_confidence: 0.7, auto_train_samples: 300 },
};

const SystemContext = createContext(null);

export function SystemProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [system, setSystem] = useState(DEFAULT_SYSTEM);

  const refresh = useCallback(async () => {
    try {
      setSystem(await getSettings());
    } catch {
      /* keep the defaults if the server cannot answer */
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]);

  const saveSetting = useCallback(async (key, value) => {
    const saved = await saveSettingApi(key, value);
    setSystem((prev) => ({ ...prev, [key]: saved[key] }));
    return saved[key];
  }, []);

  const thresholds = system.confidence_thresholds;
  const classify = useCallback((confidence) => levelOf(confidence, thresholds), [thresholds]);
  const value = useMemo(
    () => ({ system, thresholds, classify, refresh, saveSetting }),
    [system, thresholds, classify, refresh, saveSetting]
  );
  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

export const useSystem = () => useContext(SystemContext);
