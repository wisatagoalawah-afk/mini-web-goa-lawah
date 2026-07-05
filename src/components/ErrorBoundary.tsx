import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-red-200 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <div className="space-y-2">
              <h1 className="font-display font-black text-xl text-red-600">Aplikasi Mengalami Kendala</h1>
              <p className="text-xs text-[#8e8e70] leading-relaxed">
                Terjadi kesalahan internal saat memuat halaman. Silakan muat ulang halaman atau hubungi admin Pokdarwis.
              </p>
            </div>
            
            <div className="text-left bg-neutral-50 p-4 rounded-2xl border border-neutral-100 overflow-x-auto max-h-48 text-[10px] font-mono text-neutral-600 space-y-2">
              <p className="font-bold text-red-500">Error: {this.state.error?.message}</p>
              {this.state.error?.stack && (
                <pre className="whitespace-pre-wrap leading-normal">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#5a5a40] hover:bg-[#4a4a35] text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
