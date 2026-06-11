import { useState } from 'react';
import { INITIAL_REQUESTS } from '../data/vacationRequests';
import type { VacationRequest, RequestStatus } from '../data/vacationRequests';
import { STATUS_LABELS } from '../data/vacationRequests';

const TERMINAL: RequestStatus[] = ['aprobado', 'rechazado', 'anulado', 'anulacion_rechazada'];

/** Determines who should review next based on the new status */
const getNextApprover = (status: RequestStatus): string | undefined => {
  switch (status) {
    case 'pendiente_jefe':
    case 'pendiente_anulacion':
      return 'María López';
    case 'pendiente_gh':
      return 'Roberto Silva';
    default:
      return undefined;
  }
};

export const useVacationRequests = () => {
  const [requests, setRequests] = useState<VacationRequest[]>(INITIAL_REQUESTS);

  const addRequest = (req: VacationRequest) => {
    setRequests((prev) => [req, ...prev]);
  };

  const updateStatus = (
    id: string,
    status: RequestStatus,
    by: string,
    comment?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        // Atomic transition: jefe approves rotativo → record aprobado_jefe then jump to pendiente_gh
        if (status === 'aprobado_jefe' && r.userRole === 'colaborador_rotativo') {
          return {
            ...r,
            status: 'pendiente_gh',
            currentApprover: 'Roberto Silva',
            history: [
              ...r.history,
              { status: 'aprobado_jefe', label: STATUS_LABELS['aprobado_jefe'], by, actorRole: 'Jefe Aprobador', date: today, time: now, comment },
              { status: 'pendiente_gh', label: STATUS_LABELS['pendiente_gh'], by: 'Sistema', date: today, time: now },
            ],
          };
        }

        const isTerminal = TERMINAL.includes(status);
        return {
          ...r,
          status,
          currentApprover: isTerminal ? undefined : (getNextApprover(status) ?? r.currentApprover),
          history: [
            ...r.history,
            { status, label: STATUS_LABELS[status], by, date: today, time: now, comment },
          ],
        };
      })
    );
  };

  const updateRequest = (
    id: string,
    updates: { startDate: string; endDate: string; days: number }
  ) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  return { requests, addRequest, updateStatus, updateRequest };
};

export type UseVacationRequestsReturn = ReturnType<typeof useVacationRequests>;
