import { useEffect, useState } from "react";
import { getHealth } from "../services/detectionService";

/** "checking" | "online" | "degraded" | "offline" - rechecked every 30 s. */
export default function useApiHealth() {
  const [state, setState] = useState("checking");
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const h = await getHealth();
        if (alive) setState(h.status === "ok" ? "online" : "degraded");
      } catch (err) {
        // 503 means the API is up but the database is not
        if (alive) setState(err.status === 503 ? "degraded" : "offline");
      }
    };
    check();
    const t = setInterval(check, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return state;
}
