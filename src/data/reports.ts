import { USERS, ROLE_LABELS } from './users';
import type { VacationRequest } from './vacationRequests';

export interface VacationReport {
  userId: string;
  userName: string;
  department: string;
  roleLabel: string;
  totalRequests: number;
  approved: number;
  rejected: number;
  pendingDays: number;
  approvedDays: number;
  balance: number;
}

export interface GlobalKPIs {
  total: number;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  anuladas: number;
  pendientes_anulacion: number;
  anulaciones_rechazadas: number;
  diasAprobados: number;
}

export const generateReport = (requests: VacationRequest[]): VacationReport[] =>
  USERS.map((user) => {
    const userReqs = requests.filter((r) => r.userId === user.id);
    const approved = userReqs.filter((r) => r.status === 'aprobado');
    const rejected = userReqs.filter((r) => r.status === 'rechazado');
    const pending = userReqs.filter((r) =>
      ['pendiente_jefe', 'aprobado_jefe', 'pendiente_gh'].includes(r.status)
    );
    return {
      userId: user.id,
      userName: user.name,
      department: user.department,
      roleLabel: ROLE_LABELS[user.role],
      totalRequests: userReqs.length,
      approved: approved.length,
      rejected: rejected.length,
      pendingDays: pending.reduce((s, r) => s + r.days, 0),
      approvedDays: approved.reduce((s, r) => s + r.days, 0),
      balance: user.vacationBalance,
    };
  }).filter((row) => row.totalRequests > 0);

export const getGlobalKPIs = (requests: VacationRequest[]): GlobalKPIs => ({
  total: requests.length,
  pendientes: requests.filter((r) =>
    ['pendiente_jefe', 'aprobado_jefe', 'pendiente_gh'].includes(r.status)
  ).length,
  aprobadas: requests.filter((r) => r.status === 'aprobado').length,
  rechazadas: requests.filter((r) => r.status === 'rechazado').length,
  anuladas: requests.filter((r) => r.status === 'anulado').length,
  pendientes_anulacion: requests.filter((r) => r.status === 'pendiente_anulacion').length,
  anulaciones_rechazadas: requests.filter((r) => r.status === 'anulacion_rechazada').length,
  diasAprobados: requests
    .filter((r) => r.status === 'aprobado')
    .reduce((s, r) => s + r.days, 0),
});
