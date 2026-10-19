// src/components/common/ErrorState.jsx
// What a page shows when its data cannot be loaded. It says what failed and offers a retry.
import { RefreshCw } from "lucide-react";
import Alert from "./Alert";
import Button from "./Button";

export default function ErrorState({ what = "this page", error, onRetry = null }) {
  return (
    <div className="ds-stack-sm">
      <Alert variant="error" title={`Could not load ${what}.`}>
        {error?.message || "The server did not return the data."}
      </Alert>
      {onRetry && (
        <div>
          <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}