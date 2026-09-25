import { useSyncExternalStore } from 'react';
import { Alert as NativeAlert, AlertButton, AlertOptions, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// RN Web 的 Alert.alert 是空实现。Web 使用相同的按钮语义，原生仍调用系统弹窗。
type Dialog = { title: string; message?: string; buttons: AlertButton[]; options?: AlertOptions };
let dialogs: Dialog[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => dialogs[0] ?? null;

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    if (Platform.OS !== 'web') {
      NativeAlert.alert(title, message, buttons, options);
      return;
    }
    dialogs = [...dialogs, { title, message, buttons: buttons?.length ? buttons : [{ text: '确定' }], options }];
    notify();
  },
};

export function WebAlertHost() {
  const dialog = useSyncExternalStore(subscribe, snapshot, snapshot);
  if (!dialog) return null;
  const dismiss = () => { dialogs = dialogs.slice(1); notify(); };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => {
      const cancel = dialog.buttons.find((button) => button.style === 'cancel');
      if (cancel || dialog.options?.cancelable) {
        dismiss();
        cancel?.onPress?.();
        dialog.options?.onDismiss?.();
      }
    }}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>{dialog.title}</Text>
          {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
          <View style={styles.actions}>
            {dialog.buttons.map((button, index) => (
              <TouchableOpacity key={index} accessibilityRole="button" onPress={() => { dismiss(); button.onPress?.(); }} style={styles.button}>
                <Text style={{ color: button.style === 'destructive' ? '#b42318' : '#275e34' }}>{button.text ?? '确定'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#00000055' },
  card: { width: '100%', maxWidth: 420, padding: 24, borderRadius: 18, backgroundColor: '#fff', gap: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#17251b' },
  message: { fontSize: 15, color: '#37463c' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
  button: { padding: 12 },
});
