import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

type Toast = { id: number; message: string };
type ToastContextValue = { showToast: (message: string) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastHost({ children }: { children: ReactNode }) {
  const { colors } = useTokens();
  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToast({ id, message });
    setTimeout(() => setToast((current) => (current?.id === id ? null : current)), 4000);
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Pressable
            accessibilityRole="alert"
            accessibilityLabel={toast.message}
            onPress={() => setToast(null)}
            style={[styles.toast, { backgroundColor: colors.foreground }]}> 
            <Text style={[type.subhead, { color: colors.background }]}>{toast.message}</Text>
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastHost');
  return context;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.edge,
    right: space.edge,
    bottom: space.xxl,
    minHeight: 44,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
});
