import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAllTelecallingContacts,
  deleteTelecallingContact,
  fetchTelecallingContacts,
  importTelecallingContacts,
  recordCallOutcome,
} from '../api/telecallingApi';
import {
  CreateTelecallingContactInput,
  RecordCallOutcomeInput,
  TelecallingContact,
} from '@/types/telecalling';

const QUERY_KEY = ['telecalling_contacts'] as const;

export function useTelecallingContacts() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchTelecallingContacts,
  });
}

export function useImportTelecallingContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputs: CreateTelecallingContactInput[]) =>
      importTelecallingContacts(inputs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useRecordCallOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecordCallOutcomeInput) => recordCallOutcome(input),
    onSuccess: (updated: TelecallingContact) => {
      queryClient.setQueryData<TelecallingContact[]>(
        QUERY_KEY,
        (prev: TelecallingContact[] | undefined) => {
          if (!prev) return [updated];
          return prev.map((c: TelecallingContact) =>
            c.id === updated.id ? updated : c
          );
        }
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteTelecallingContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTelecallingContact(id),
    onSuccess: (_void: void, id: string) => {
      queryClient.setQueryData<TelecallingContact[]>(
        QUERY_KEY,
        (prev: TelecallingContact[] | undefined) =>
          (prev ?? []).filter((c: TelecallingContact) => c.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteAllTelecallingContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAllTelecallingContacts(),
    onSuccess: () => {
      queryClient.setQueryData<TelecallingContact[]>(QUERY_KEY, []);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
