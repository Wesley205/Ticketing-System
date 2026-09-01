import { useToastContext } from '../components/feedback/ToastProvider.jsx';

export function useToast() {
  return useToastContext();
}
