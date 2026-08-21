import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  type?: NotificationType;
  title?: string;
  duration?: number;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
}

export interface NotificationContextType {
  showNotification: (
    message: string,
    optionsOrType?: NotificationOptions | NotificationType
  ) => void;
  showSuccess: (message: string, title?: string, duration?: number) => void;
  showError: (message: string, title?: string, duration?: number) => void;
  showWarning: (message: string, title?: string, duration?: number) => void;
  showInfo: (message: string, title?: string, duration?: number) => void;
  dismissNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const timerRef = useRef<NodeJS.Timeout | number | null>(null);

  const dismissNotification = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current as any);
      timerRef.current = null;
    }
    setNotification(null);
  }, []);

  const showNotification = useCallback(
    (
      message: string,
      optionsOrType?: NotificationOptions | NotificationType
    ) => {
      let type: NotificationType = 'success';
      let title: string | undefined = undefined;
      let duration = 4000;

      if (typeof optionsOrType === 'string') {
        type = optionsOrType;
      } else if (optionsOrType && typeof optionsOrType === 'object') {
        if (optionsOrType.type) type = optionsOrType.type;
        if (optionsOrType.title) title = optionsOrType.title;
        if (typeof optionsOrType.duration === 'number') duration = optionsOrType.duration;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current as any);
      }

      const id = Math.random().toString(36).substring(2, 9);
      setNotification({ id, type, message, title });

      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          setNotification((curr) => (curr?.id === id ? null : curr));
          timerRef.current = null;
        }, duration);
      }
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, title?: string, duration = 4000) => {
      showNotification(message, { type: 'success', title, duration });
    },
    [showNotification]
  );

  const showError = useCallback(
    (message: string, title?: string, duration = 5000) => {
      showNotification(message, { type: 'error', title, duration });
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string, title?: string, duration = 4500) => {
      showNotification(message, { type: 'warning', title, duration });
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (message: string, title?: string, duration = 4000) => {
      showNotification(message, { type: 'info', title, duration });
    },
    [showNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismissNotification,
      }}
    >
      {children}

      {/* Global Fixed Notification Banner / Toast */}
      {notification && (
        <div
          id="global-notification-toast"
          role={notification.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[100] w-[94%] sm:w-auto sm:min-w-[340px] sm:max-w-xl p-3 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-200 backdrop-blur-md border pointer-events-auto select-none"
          style={{
            backgroundColor:
              notification.type === 'success'
                ? 'rgba(6, 44, 34, 0.96)'
                : notification.type === 'error'
                ? 'rgba(69, 10, 10, 0.96)'
                : notification.type === 'warning'
                ? 'rgba(69, 26, 3, 0.96)'
                : 'rgba(15, 23, 42, 0.96)',
            borderColor:
              notification.type === 'success'
                ? 'rgba(16, 185, 129, 0.8)'
                : notification.type === 'error'
                ? 'rgba(239, 68, 68, 0.8)'
                : notification.type === 'warning'
                ? 'rgba(245, 158, 11, 0.8)'
                : 'rgba(20, 184, 166, 0.8)',
            boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.5), 0 0 15px -3px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Icon based on notification type */}
            <div
              className={`p-1.5 rounded-full shrink-0 shadow-xs ${
                notification.type === 'success'
                  ? 'bg-emerald-600/80 text-emerald-100'
                  : notification.type === 'error'
                  ? 'bg-red-600/80 text-red-100'
                  : notification.type === 'warning'
                  ? 'bg-amber-600/80 text-amber-100'
                  : 'bg-teal-600/80 text-teal-100'
              }`}
            >
              {notification.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
              )}
              {notification.type === 'error' && (
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-200" />
              )}
              {notification.type === 'warning' && (
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
              )}
              {notification.type === 'info' && (
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-teal-200" />
              )}
            </div>

            {/* Text message and optional title */}
            <div className="min-w-0 flex-1">
              {notification.title && (
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {notification.title}
                </div>
              )}
              <div
                className={`text-xs sm:text-sm font-semibold tracking-wide leading-snug break-words ${
                  notification.type === 'success'
                    ? 'text-emerald-50'
                    : notification.type === 'error'
                    ? 'text-red-50'
                    : notification.type === 'warning'
                    ? 'text-amber-50'
                    : 'text-slate-100'
                }`}
              >
                {notification.message}
              </div>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={dismissNotification}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ml-1 ${
              notification.type === 'success'
                ? 'text-emerald-300 hover:text-white hover:bg-emerald-800/80'
                : notification.type === 'error'
                ? 'text-red-300 hover:text-white hover:bg-red-800/80'
                : notification.type === 'warning'
                ? 'text-amber-300 hover:text-white hover:bg-amber-800/80'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
            aria-label="Fermer la notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
