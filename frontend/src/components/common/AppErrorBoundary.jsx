import { Component } from "react";
export function ErrorFallback() {
  return <div role="alert" className="mx-auto my-24 max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center"><h1 className="text-2xl font-bold text-slate-900">This page couldn't be loaded</h1><p className="mt-3 text-sm text-slate-500">Your connection may have changed. Please try loading the page again.</p><button type="button" onClick={()=>window.location.reload()} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Try again</button><a href="/" className="ml-4 text-sm text-blue-700 underline">Go to homepage</a></div>;
}
export default class AppErrorBoundary extends Component {
  state = { failed:false };
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch(error) { console.error("[UI] Page rendering failed:",error.name); }
  render() { return this.state.failed ? <ErrorFallback/> : this.props.children; }
}
