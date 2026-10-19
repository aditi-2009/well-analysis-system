// src/components/common/ErrorBoundary.jsx
// Catches an error thrown while a page is being drawn, so one broken page shows
// a recovery screen instead of a blank app.
import { Component } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import Button from "./Button";

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Developers read this in the browser console. It can also go to the server log later.
    console.error("A page failed while it was being drawn:", error, info.componentStack);
  }

  retry = () => {
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="ds-error-screen" role="alert">
        <div className="ds-error-screen-card">
          <div className="ds-empty-icon" aria-hidden="true">
            <AlertCircle size={26} />
          </div>
          <h1 className="ds-empty-title">This page could not be shown.</h1>
          <p className="ds-empty-text">
            Something failed while the page was being drawn. Try again. If it happens every time,
            reload the browser tab or go back to the dashboard.
          </p>
          <div className="ds-page-actions">
            <Button variant="primary" icon={RefreshCw} onClick={this.retry}>
              Try again
            </Button>
            <a className="ds-btn ds-btn-secondary" href="/app/dashboard">
              Go to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}