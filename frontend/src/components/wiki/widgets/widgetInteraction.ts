export interface WidgetInteractionHandlers {
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export function interactionInputProps(handlers: WidgetInteractionHandlers) {
  return {
    onFocus: handlers.onInteractionStart,
    onBlur: handlers.onInteractionEnd,
  };
}
