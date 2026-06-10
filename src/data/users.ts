export type UserRole =
  | 'colaborador_standard'
  | 'colaborador_rotativo'
  | 'jefe_aprobador'
  | 'administrador_gh';

export const ROLE_LABELS: Record<UserRole, string> = {
  colaborador_standard: 'Colaborador Standard',
  colaborador_rotativo: 'Colaborador Rotativo',
  jefe_aprobador: 'Jefe Aprobador',
  administrador_gh: 'Administrador GH',
};

export interface User {
  id: string;
  name: string;
  email: string;
  codigoEmpleado: string;
  role: UserRole;
  department: string;
  approver?: string;
  schedule: string;
  hireDate?: string;
  vacationBalance: number;
  vacationBalanceTruncas: number;    // año actual
  vacationBalancePendientes: number; // año anterior
  vacationBalanceVencidas: number;   // 2+ años
  initials: string;
  managerId?: string;
}

export const USERS: User[] = [
  {
    id: 'u1',
    name: 'Ana García',
    email: 'ana.garcia@empresa.com',
    codigoEmpleado: 'C19734',
    role: 'colaborador_standard',
    department: 'Tecnología',
    approver: 'María López',
    schedule: 'Lunes a Viernes 09:00 – 18:00',
    hireDate: '2019-03-12',
    vacationBalance: 15,
    vacationBalanceTruncas: 8,
    vacationBalancePendientes: 5,
    vacationBalanceVencidas: 2,
    initials: 'AG',
    managerId: 'u3',
  },
  {
    id: 'u2',
    name: 'Carlos Ruiz',
    email: 'carlos.ruiz@empresa.com',
    codigoEmpleado: 'C20145',
    role: 'colaborador_rotativo',
    department: 'Operaciones',
    approver: 'María López',
    schedule: 'Turnos rotativos (variable)',
    hireDate: '2020-11-05',
    vacationBalance: 12,
    vacationBalanceTruncas: 7,
    vacationBalancePendientes: 3,
    vacationBalanceVencidas: 2,
    initials: 'CR',
    managerId: 'u3',
  },
  {
    id: 'u3',
    name: 'María López',
    email: 'maria.lopez@empresa.com',
    codigoEmpleado: 'C10221',
    role: 'jefe_aprobador',
    department: 'Tecnología',
    schedule: 'Lunes a Viernes 09:00 – 18:00',
    hireDate: '2017-08-21',
    vacationBalance: 20,
    vacationBalanceTruncas: 12,
    vacationBalancePendientes: 5,
    vacationBalanceVencidas: 3,
    initials: 'ML',
  },
  {
    id: 'u4',
    name: 'Roberto Silva',
    email: 'roberto.silva@empresa.com',
    codigoEmpleado: 'C10088',
    role: 'administrador_gh',
    department: 'Recursos Humanos',
    schedule: 'Lunes a Viernes 09:00 – 18:00',
    hireDate: '2014-05-09',
    vacationBalance: 18,
    vacationBalanceTruncas: 10,
    vacationBalancePendientes: 5,
    vacationBalanceVencidas: 3,
    initials: 'RS',
  },
  {
    id: 'u5',
    name: 'Laura Mendoza',
    email: 'laura.mendoza@empresa.com',
    codigoEmpleado: 'C22310',
    role: 'colaborador_standard',
    department: 'Tecnología',
    approver: 'María López',
    schedule: 'Lunes a Viernes 09:00 – 18:00',
    hireDate: '2020-02-17',
    vacationBalance: 18,
    vacationBalanceTruncas: 11,
    vacationBalancePendientes: 5,
    vacationBalanceVencidas: 2,
    initials: 'LM',
    managerId: 'u3',
  },
  {
    id: 'u6',
    name: 'Diego Torres',
    email: 'diego.torres@empresa.com',
    codigoEmpleado: 'C23089',
    role: 'colaborador_rotativo',
    department: 'Operaciones',
    approver: 'María López',
    schedule: 'Turnos rotativos (variable)',
    hireDate: '2022-07-24',
    vacationBalance: 10,
    vacationBalanceTruncas: 6,
    vacationBalancePendientes: 3,
    vacationBalanceVencidas: 1,
    initials: 'DT',
    managerId: 'u3',
  },
];

export const getUserById = (id: string): User | undefined =>
  USERS.find((u) => u.id === id);

export const getStoredUser = (): User | null => {
  const raw = localStorage.getItem('wz_current_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const storeUser = (user: User): void => {
  localStorage.setItem('wz_current_user', JSON.stringify(user));
};

export const clearUser = (): void => {
  localStorage.removeItem('wz_current_user');
};
