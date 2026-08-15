import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

export type ToastAction = {
  label: string;
  onPress: () => void;
};

export type ToastPayload = {
  id: string;
  message: string;
  tone?: 'success' | 'info';
  action?: ToastAction;
};

type FeedbackContextValue = {
  toast: ToastPayload | null;
  cartBounceToken: number;
  showToast: (message: string, opts?: { tone?: 'success' | 'info'; action?: ToastAction }) => void;
  hideToast: () => void;
  bounceCart: () => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [cartBounceToken, setCartBounceToken] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => setToast(null), []);

  const showToast = useCallback(
    (message: string, opts?: { tone?: 'success' | 'info'; action?: ToastAction }) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({
        id: String(Date.now()),
        message,
        tone: opts?.tone ?? 'success',
        action: opts?.action,
      });
      timer.current = setTimeout(() => setToast(null), 2800);
    },
    [],
  );

  const bounceCart = useCallback(() => {
    setCartBounceToken((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ toast, cartBounceToken, showToast, hideToast, bounceCart }),
    [toast, cartBounceToken, showToast, hideToast, bounceCart],
  );

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}
