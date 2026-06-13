import { Component, type ErrorInfo, type ReactNode } from 'react';

interface PluginErrorBoundaryProps {
  pluginId: string;
  children: ReactNode;
}

interface PluginErrorBoundaryState {
  error: Error | null;
}

export class PluginErrorBoundary extends Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  state: PluginErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PluginErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[plugins] UI slot crashed for "${this.props.pluginId}"`, error, info);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          className="esiana-plugin-fallback rounded-lg border border-border bg-elevated/60 px-3 py-2 text-xs text-muted"
          role="status"
        >
          Plugin <span className="font-medium text-foreground">{this.props.pluginId}</span>{' '}
          failed to load.
        </div>
      );
    }

    return this.props.children;
  }
}
