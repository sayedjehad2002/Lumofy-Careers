import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * App-level error boundary. Prevents a single render error (e.g. an unexpected
 * undefined field) from white-screening the entire app — shows a recoverable
 * fallback instead.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-6">
              An unexpected error occurred. Please reload and try again — if it persists, contact us.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => window.location.reload()}>Reload page</Button>
              <Button variant="outline" asChild>
                <a href="/">Go to homepage</a>
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
