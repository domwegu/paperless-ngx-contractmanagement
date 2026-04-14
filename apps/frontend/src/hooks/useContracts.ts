import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Contract, PaginatedResult } from '../types';

export function useContracts(params?: Record<string, any>) {
  return useQuery<PaginatedResult<Contract>>({
    queryKey: ['contracts', params],
    queryFn: () => api.get('/contracts', { params }).then((r) => r.data),
  });
}

export function useContract(id: string) {
  return useQuery<Contract>({
    queryKey: ['contracts', id],
    queryFn: () => api.get(`/contracts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contract>) => api.post('/contracts', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useUpdateContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contract>) => api.patch(`/contracts/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); qc.invalidateQueries({ queryKey: ['contracts', id] }); },
  });
}

export function useDeadlines(withinDays = 90) {
  return useQuery<Contract[]>({
    queryKey: ['deadlines', withinDays],
    queryFn: () => api.get('/contracts/deadlines', { params: { withinDays } }).then((r) => r.data),
  });
}
