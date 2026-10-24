import { Component } from "react";
import { Link } from "react-router-dom";

export function ErrorFallback({ onRetry }) {
  return (
    <div role="alert" className="mx-auto my-24 max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
      <h1 className="text-2xl font-bold text-slate-900">This page couldn't be loaded</h1>
      <p className="mt-3 text-sm text-slate-500">Your connection may have changed or the content is momentarily unavailable.</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (onRetry) onRetry();
            else window.location.reload();
          }}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        <Link to="/" onClick={() => onRetry && onRetry()} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
          Go to homepage
        </Link>
      </div>
    </div>
  );
}

export default class AppErrorBoundary extends Component {
  state = { failed: false, error: null };
  static getDerivedStateFromError(error) {
    return { failed: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[UI] Page rendering failed:", error, errorInfo);
  }
  handleRetry = () => {
    this.setState({ failed: false, error: null });
  };
  render() {
    return this.state.failed ? (
      <ErrorFallback onRetry={this.handleRetry} />
    ) : (
      this.props.children
    );
  }
}
