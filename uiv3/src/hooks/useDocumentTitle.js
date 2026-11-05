import { useEffect } from "react";
import { APP_SHORT } from "../config/constants";

export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_SHORT}` : APP_SHORT;
  }, [title]);
}
