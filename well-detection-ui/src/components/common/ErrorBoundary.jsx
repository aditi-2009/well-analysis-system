import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("UI crash:", error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h2 className="text-lg font-bold text-red-900">Something went wrong on this page</h2>
        <p className="mt-2 text-sm text-red-800">{this.state.error.message}</p>
        <button onClick={() => { this.setState({ error: null }); window.location.assign("/"); }}
          className="mt-5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Go to home page</button>
      </div>
    );
  }
}
