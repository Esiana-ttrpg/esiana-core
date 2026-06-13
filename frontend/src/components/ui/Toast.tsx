interface ToastProps {
  message: string;
  visible: boolean;
}

export function Toast({ message, visible }: ToastProps) {
  return (
    <div
      className={`fixed bottom-5 right-5 z-[100] transition-all duration-200 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-lg border border-emerald-700/70 bg-emerald-950/95 px-4 py-3 text-sm font-medium text-emerald-100 shadow-lg">
        {message}
      </div>
    </div>
  );
}
