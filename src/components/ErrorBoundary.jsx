import { Component } from "react";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-6">
              <HiOutlineExclamationTriangle className="w-10 h-10 text-danger" />
            </div>

            <h1 className="text-2xl font-bold text-primary mb-2">
              Oops! Something broke
            </h1>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              An unexpected error occurred. Please refresh the page.
            </p>

            {/* Show error in dev mode */}
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-gray-100 p-3 rounded-lg mb-6 overflow-auto max-h-32 text-red-600">
                {this.state.error.toString()}
              </pre>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-primary transition cursor-pointer"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition cursor-pointer"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;