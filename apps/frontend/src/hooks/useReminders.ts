import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ReminderSummary } from '../types';

export function useReminderSummary() {
  return useQuery<ReminderSummary>({
    queryKey: ['reminders-summary'],
    queryFn: () => api.get('/reminders/summary').then((r) => r.data),
    refetchInterval: 5 * 60 * 1000, // alle 5 min
  });
}

export function useMarkReminderDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/reminders/${id}/done`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders-summary'] }),
  });
}
