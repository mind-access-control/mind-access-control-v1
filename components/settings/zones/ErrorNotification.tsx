import { AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

interface ErrorNotificationProps {
  error: string | null;
  onClear: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ error, onClear, autoHide = true, autoHideDelay = 5000 }) => {
  useEffect(() => {
    if (error && autoHide) {
      const timer = setTimeout(() => {
        onClear();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [error, autoHide, autoHideDelay, onClear]);

  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <div className="ml-auto pl-3">
          <button
            type="button"
            className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorNotification;
