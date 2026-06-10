import type { UserRole } from './users';

export type RequestStatus =
  | 'creado'
  | 'pendiente_jefe'
  | 'aprobado_jefe'
  | 'pendiente_gh'
  | 'aprobado'
  | 'rechazado'
  | 'pendiente_anulacion'
  | 'anulado'
  | 'anulacion_rechazada';

export const STATUS_LABELS: Record<RequestStatus, string> = {
  creado: 'Creado',
  pendiente_jefe: 'Pendiente Aprobación Jefe',
  aprobado_jefe: 'Aprobado por Jefe',
  pendiente_gh: 'Pendiente Administración GH',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  pendiente_anulacion: 'Pendiente de Anulación',
  anulado: 'Anulado',
  anulacion_rechazada: 'Anulación Rechazada',
};

export const STATUS_CSS_CLASS: Record<RequestStatus, string> = {
  creado: 'status-info',
  pendiente_jefe: 'status-warning',
  aprobado_jefe: 'status-info',
  pendiente_gh: 'status-warning',
  aprobado: 'status-success',
  rechazado: 'status-error',
  pendiente_anulacion: 'status-warning',
  anulado: 'status-error',
  anulacion_rechazada: 'status-error',
};

export const TIMELINE_DOT_CLASS: Record<RequestStatus, string> = {
  creado: 'info',
  pendiente_jefe: 'warning',
  aprobado_jefe: 'info',
  pendiente_gh: 'warning',
  aprobado: 'success',
  rechazado: 'error',
  pendiente_anulacion: 'warning',
  anulado: 'error',
  anulacion_rechazada: 'error',
};

export interface ApprovalStep {
  status: RequestStatus;
  label: string;
  by: string;
  actorRole?: string;
  date: string;
  time?: string;
  comment?: string;
}

export interface VacationRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  startDate: string;
  endDate: string;
  days: number;
  status: RequestStatus;
  comments?: string;
  photo?: string;
  currentApprover?: string;
  history: ApprovalStep[];
}

export const INITIAL_REQUESTS: VacationRequest[] = [
  // VR-001: Ana García (Standard) — pendiente_jefe
  {
    id: 'VR-001',
    userId: 'u1',
    userName: 'Ana García',
    userRole: 'colaborador_standard',
    startDate: '2026-07-01',
    endDate: '2026-07-10',
    days: 8,
    status: 'pendiente_jefe',
    comments: 'Vacaciones de verano planificadas',
    currentApprover: 'María López',
    history: [
      { status: 'creado', label: 'Solicitud creada', by: 'Ana García', actorRole: 'Colaborador Standard', date: '2026-06-01', time: '09:15' },
      { status: 'pendiente_jefe', label: 'Enviada a Jefe Aprobador', by: 'Sistema', date: '2026-06-01', time: '09:15' },
    ],
  },
  // VR-002: Carlos Ruiz (Rotativo) — pendiente_gh
  {
    id: 'VR-002',
    userId: 'u2',
    userName: 'Carlos Ruiz',
    userRole: 'colaborador_rotativo',
    startDate: '2026-07-15',
    endDate: '2026-07-22',
    days: 6,
    status: 'pendiente_gh',
    comments: 'Vacaciones planificadas julio',
    currentApprover: 'Roberto Silva',
    history: [
      { status: 'creado', label: 'Solicitud creada', by: 'Carlos Ruiz', actorRole: 'Colaborador Rotativo', date: '2026-06-05', time: '14:30' },
      { status: 'pendiente_jefe', label: 'Enviada a Jefe Aprobador', by: 'Sistema', date: '2026-06-05', time: '14:30' },
      { status: 'aprobado_jefe', label: 'Aprobado por Jefe', by: 'María López', actorRole: 'Jefe Aprobador', date: '2026-06-07', time: '10:45', comment: 'Aprobado sin inconvenientes' },
      { status: 'pendiente_gh', label: 'Enviado a Administración GH', by: 'Sistema', date: '2026-06-07', time: '10:45' },
    ],
  },
  // VR-003: Ana García (Standard) — aprobado
  {
    id: 'VR-003',
    userId: 'u1',
    userName: 'Ana García',
    userRole: 'colaborador_standard',
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    days: 4,
    status: 'aprobado',
    comments: 'Días de descanso adicionales',
    history: [
      { status: 'creado', label: 'Solicitud creada', by: 'Ana García', actorRole: 'Colaborador Standard', date: '2026-05-20', time: '11:00' },
      { status: 'pendiente_jefe', label: 'Enviada a Jefe Aprobador', by: 'Sistema', date: '2026-05-20', time: '11:00' },
      { status: 'aprobado_jefe', label: 'Aprobado por Jefe', by: 'María López', actorRole: 'Jefe Aprobador', date: '2026-05-22', time: '09:30', comment: 'OK, aprobado' },
      { status: 'aprobado', label: 'Solicitud aprobada', by: 'Sistema', date: '2026-05-22', time: '09:30' },
    ],
  },
  // VR-004: Carlos Ruiz (Rotativo) — rechazado
  {
    id: 'VR-004',
    userId: 'u2',
    userName: 'Carlos Ruiz',
    userRole: 'colaborador_rotativo',
    startDate: '2026-06-20',
    endDate: '2026-06-25',
    days: 5,
    status: 'rechazado',
    comments: 'Urgente — cambio de planes',
    history: [
      { status: 'creado', label: 'Solicitud creada', by: 'Carlos Ruiz', actorRole: 'Colaborador Rotativo', date: '2026-06-08', time: '08:50' },
      { status: 'pendiente_jefe', label: 'Enviada a Jefe Aprobador', by: 'Sistema', date: '2026-06-08', time: '08:50' },
      { status: 'rechazado', label: 'Rechazado por Jefe', by: 'María López', actorRole: 'Jefe Aprobador', date: '2026-06-09', time: '16:20', comment: 'No hay cobertura para esas fechas' },
    ],
  },
  // VR-005: María López (Jefe) — pendiente_anulacion
  {
    id: 'VR-005',
    userId: 'u3',
    userName: 'María López',
    userRole: 'jefe_aprobador',
    startDate: '2026-09-01',
    endDate: '2026-09-10',
    days: 8,
    status: 'pendiente_anulacion',
    comments: 'Vacaciones anuales',
    currentApprover: 'Administrador GH',
    history: [
      { status: 'creado', label: 'Solicitud creada', by: 'María López', actorRole: 'Jefe Aprobador', date: '2026-05-15', time: '10:00' },
      { status: 'pendiente_jefe', label: 'Enviada a aprobación', by: 'Sistema', date: '2026-05-15', time: '10:00' },
      { status: 'aprobado_jefe', label: 'Aprobado', by: 'Sistema', date: '2026-05-16', time: '09:00' },
      { status: 'aprobado', label: 'Solicitud aprobada', by: 'Sistema', date: '2026-05-16', time: '09:00' },
      { status: 'pendiente_anulacion', label: 'Anulación solicitada por colaborador', by: 'María López', actorRole: 'Jefe Aprobador', date: '2026-06-05', time: '11:30', comment: 'Cambio de planes imprevistos' },
    ],
  },
  // VR-006: Laura Mendoza (Standard) — aprobado
  {
    id: 'VR-006',
    userId: 'u5',
    userName: 'Laura Mendoza',
    userRole: 'colaborador_standard',
    startDate: '2026-07-07',
    endDate: '2026-07-11',
    days: 5,
    status: 'aprobado',
    comments: 'Semana de vacaciones programada',
    history: [
      { status: 'creado', label: 'Solicitud creada', by: 'Laura Mendoza', actorRole: 'Colaborador Standard', date: '2026-06-01', time: '09:00' },
      { status: 'pendiente_jefe', label: 'Enviada a Jefe Aprobador', by: 'Sistema', date: '2026-06-01', time: '09:00' },
      { status: 'aprobado_jefe', label: 'Aprobado por Jefe', by: 'María López', actorRole: 'Jefe Aprobador', date: '2026-06-03', time: '14:00', comment: 'Sin problemas, aprobado' },
      { status: 'aprobado', label: 'Solicitud aprobada', by: 'Sistema', date: '2026-06-03', time: '14:00' },
    ],
  },
  // VR-007: Diego Torres (Rotativo) — anulado (ciclo completo)
  {
    id: 'VR-007',
    userId: 'u6',
    userName: 'Diego Torres',
    userRole: 'colaborador_rotativo',
    startDate: '2026-06-15',
    endDate: '2026-06-19',
    days: 4,
    status: 'anulado',
    comments: 'Semana libre junio',
    history: [
      { status: 'creado', label: 'Solicitud creada', by: 'Diego Torres', actorRole: 'Colaborador Rotativo', date: '2026-05-25', time: '15:00' },
      { status: 'pendiente_jefe', label: 'Enviada a Jefe Aprobador', by: 'Sistema', date: '2026-05-25', time: '15:00' },
      { status: 'aprobado_jefe', label: 'Aprobado por Jefe', by: 'María López', actorRole: 'Jefe Aprobador', date: '2026-05-27', time: '10:00' },
      { status: 'pendiente_gh', label: 'Enviado a Administración GH', by: 'Sistema', date: '2026-05-27', time: '10:00' },
      { status: 'aprobado', label: 'Aprobado por Administración GH', by: 'Roberto Silva', actorRole: 'Administrador GH', date: '2026-05-28', time: '11:30', comment: 'Aprobado' },
      { status: 'pendiente_anulacion', label: 'Anulación solicitada por colaborador', by: 'Diego Torres', actorRole: 'Colaborador Rotativo', date: '2026-06-01', time: '09:00', comment: 'Emergencia familiar' },
      { status: 'anulado', label: 'Anulación aprobada', by: 'María López', actorRole: 'Jefe Aprobador', date: '2026-06-02', time: '10:00', comment: 'Aprobada por motivo justificado' },
    ],
  },
  // VR-008: Ana García (Standard) — anulacion_rechazada
  {
    id: 'VR-008',
    userId: 'u1',
    userName: 'Ana García',
    userRole: 'colaborador_standard',
    startDate: '2026-10-06',
    endDate: '2026-10-10',
    days: 5,
    status: 'anulacion_rechazada',
    comments: 'Vacaciones de octubre',
    history: [
      { status: 'creado', label: 'Solicitud creada', by: 'Ana García', actorRole: 'Colaborador Standard', date: '2026-05-10', time: '10:00' },
      { status: 'pendiente_jefe', label: 'Enviada a Jefe Aprobador', by: 'Sistema', date: '2026-05-10', time: '10:00' },
      { status: 'aprobado_jefe', label: 'Aprobado por Jefe', by: 'María López', actorRole: 'Jefe Aprobador', date: '2026-05-12', time: '09:00' },
      { status: 'aprobado', label: 'Solicitud aprobada', by: 'Sistema', date: '2026-05-12', time: '09:00' },
      { status: 'pendiente_anulacion', label: 'Anulación solicitada por colaborador', by: 'Ana García', actorRole: 'Colaborador Standard', date: '2026-06-04', time: '14:30', comment: 'Cambio de fechas requerido' },
      { status: 'anulacion_rechazada', label: 'Anulación rechazada por Jefe', by: 'María López', actorRole: 'Jefe Aprobador', date: '2026-06-05', time: '16:00', comment: 'No es posible liberar esas fechas por carga de trabajo' },
    ],
  },
  // VR-009: Diego Torres (Rotativo) — creado (recién ingresado)
  {
    id: 'VR-009',
    userId: 'u6',
    userName: 'Diego Torres',
    userRole: 'colaborador_rotativo',
    startDate: '2026-08-18',
    endDate: '2026-08-21',
    days: 4,
    status: 'creado',
    comments: 'Descanso de agosto',
    currentApprover: 'María López',
    history: [
      { status: 'creado', label: 'Solicitud creada', by: 'Diego Torres', actorRole: 'Colaborador Rotativo', date: '2026-06-09', time: '08:30' },
    ],
  },
  // VR-010: Laura Mendoza (Standard) — rechazado
  {
    id: 'VR-010',
    userId: 'u5',
    userName: 'Laura Mendoza',
    userRole: 'colaborador_standard',
    startDate: '2026-06-30',
    endDate: '2026-07-02',
    days: 3,
    status: 'rechazado',
    comments: 'Puente de fin de mes',
    history: [
      { status: 'creado', label: 'Solicitud creada', by: 'Laura Mendoza', actorRole: 'Colaborador Standard', date: '2026-06-02', time: '09:00' },
      { status: 'pendiente_jefe', label: 'Enviada a Jefe Aprobador', by: 'Sistema', date: '2026-06-02', time: '09:00' },
      { status: 'rechazado', label: 'Rechazado por Jefe', by: 'María López', actorRole: 'Jefe Aprobador', date: '2026-06-04', time: '11:00', comment: 'Período de cierre de mes, no es posible ausentarse' },
    ],
  },
];
