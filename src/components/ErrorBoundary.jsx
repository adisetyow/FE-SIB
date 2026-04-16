/**
 * components/ErrorBoundary.jsx
 * Menangkap runtime error React agar tidak crash seluruh aplikasi.
 * Tampilkan UI fallback yang informatif dan tombol retry.
 *
 * Cara pakai:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 * Atau per-section:
 *   <ErrorBoundary fallbackMessage="Gagal memuat bagian ini">
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log error — bisa dikirim ke Sentry dll di production
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg =
      this.props.fallbackMessage || "Terjadi kesalahan yang tidak terduga.";

    return (
      <div className="min-h-[40vh] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-danger-500/10 flex items-center justify-center mx-auto mb-5">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-danger-500"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h2 className="font-display text-xl font-bold text-[--text-primary] mb-2">
            Oops! Sesuatu tidak berjalan dengan benar
          </h2>
          <p className="text-sm text-[--text-secondary] mb-6 leading-relaxed">
            {msg}
          </p>

          {/* Error detail (hanya development) */}
          {import.meta.env.DEV && this.state.error && (
            <details className="text-left mb-5 p-3 rounded-xl bg-[--bg-subtle] border border-danger-500/20">
              <summary className="text-xs font-mono text-danger-500 cursor-pointer">
                Detail error (dev only)
              </summary>
              <pre className="text-[11px] text-[--text-secondary] mt-2 overflow-auto whitespace-pre-wrap">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => this.handleReset()}
              className="btn btn-primary"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="btn btn-ghost"
            >
              Ke Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
