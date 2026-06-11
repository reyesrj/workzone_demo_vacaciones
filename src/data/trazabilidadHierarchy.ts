export interface OrgMetrics {
  colaboradores: number;
  truncas: number;
  pendientes: number;
  vencidas: number;
  planificadas: number;
}

export interface OrgNode extends OrgMetrics {
  id: string;
  label: string;
  highlighted?: boolean;
  children?: OrgNode[];
}

export const TRAZA_KPIS: OrgMetrics = {
  colaboradores: 2540,
  truncas: 1912,
  pendientes: 328,
  vencidas: 45,
  planificadas: 890,
};

export const ORG_HIERARCHY: OrgNode = {
  id: 'root',
  label: 'América Móvil Perú',
  ...TRAZA_KPIS,
  children: [
    {
      id: 'dir-gen',
      label: 'Dirección General',
      colaboradores: 2540,
      truncas: 1912,
      pendientes: 328,
      vencidas: 45,
      planificadas: 890,
      children: [
        {
          id: 'dir-legal',
          label: 'Dirección Legal',
          colaboradores: 186,
          truncas: 142,
          pendientes: 28,
          vencidas: 6,
          planificadas: 64,
          children: [
            {
              id: 'jef-legal',
              label: 'Jefatura Legal',
              colaboradores: 42,
              truncas: 31,
              pendientes: 8,
              vencidas: 2,
              planificadas: 18,
              children: [
                {
                  id: 'henry',
                  label: 'Henry Ochoa (Jefe Directo)',
                  highlighted: true,
                  colaboradores: 12,
                  truncas: 9,
                  pendientes: 3,
                  vencidas: 1,
                  planificadas: 6,
                  children: [
                    {
                      id: 'colabs',
                      label: 'Colaboradores',
                      colaboradores: 12,
                      truncas: 9,
                      pendientes: 3,
                      vencidas: 1,
                      planificadas: 6,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const collectExpandableIds = (node: OrgNode): string[] => {
  const ids: string[] = [];
  if (node.children?.length) {
    ids.push(node.id);
    node.children.forEach((child) => ids.push(...collectExpandableIds(child)));
  }
  return ids;
};

export interface TrazaFilters {
  direccion: string;
  gerencia: string;
  jefatura: string;
  responsable: string;
  codigo: string;
  apPaterno: string;
  apMaterno: string;
  nombre: string;
}

export const DEFAULT_TRAZA_FILTERS: TrazaFilters = {
  direccion: 'Todas',
  gerencia: 'Todas',
  jefatura: 'Todas',
  responsable: 'Todas',
  codigo: '',
  apPaterno: '',
  apMaterno: '',
  nombre: '',
};

export interface TrazaColab {
  id: string;
  name: string;
  codigoEmpleado: string;
  direccion: string;
  gerencia: string;
  jefatura: string;
  responsable: string;
  truncas: number;
  pendientes: number;
  vencidas: number;
  planificadas: number;
}

export const TRAZA_COLABORADORES: TrazaColab[] = [
  { id: 'tc1', name: 'Henry Ochoa',              codigoEmpleado: 'C10001', direccion: 'América Móvil Perú', gerencia: 'Legal',       jefatura: 'Jefatura Legal', responsable: 'Henry Ochoa',  truncas: 12, pendientes: 4, vencidas: 1, planificadas: 6 },
  { id: 'tc2', name: 'Daphne Aurelia Paucar',    codigoEmpleado: 'C17719', direccion: 'América Móvil Perú', gerencia: 'Legal',       jefatura: 'Jefatura Legal', responsable: 'Henry Ochoa',  truncas: 6,  pendientes: 2, vencidas: 0, planificadas: 2 },
  { id: 'tc3', name: 'Juan Pérez Ramírez',       codigoEmpleado: 'C25565', direccion: 'América Móvil Perú', gerencia: 'Legal',       jefatura: 'Jefatura Legal', responsable: 'Henry Ochoa',  truncas: 9,  pendientes: 3, vencidas: 1, planificadas: 4 },
  { id: 'tc4', name: 'María Fernanda López',     codigoEmpleado: 'C18392', direccion: 'América Móvil Perú', gerencia: 'Comercial',   jefatura: 'Ventas B2B',     responsable: 'María López',  truncas: 10, pendientes: 5, vencidas: 0, planificadas: 3 },
  { id: 'tc5', name: 'Carlos Alberto Rojas',     codigoEmpleado: 'C17831', direccion: 'América Móvil Perú', gerencia: 'Operaciones', jefatura: 'Operaciones',    responsable: 'María López',  truncas: 5,  pendientes: 2, vencidas: 0, planificadas: 5 },
  { id: 'tc6', name: 'Lucía Valentina Díaz',     codigoEmpleado: 'C19280', direccion: 'América Móvil Perú', gerencia: 'Tecnología',  jefatura: 'Infraestructura',responsable: 'María López',  truncas: 12, pendientes: 6, vencidas: 2, planificadas: 8 },
  { id: 'tc7', name: 'José Antonio García',      codigoEmpleado: 'C16472', direccion: 'América Móvil Perú', gerencia: 'Finanzas',    jefatura: 'Contabilidad',   responsable: 'Roberto Silva',truncas: 8,  pendientes: 3, vencidas: 0, planificadas: 4 },
  { id: 'tc8', name: 'Ana García',               codigoEmpleado: 'C19734', direccion: 'América Móvil Perú', gerencia: 'Tecnología',  jefatura: 'Infraestructura',responsable: 'María López',  truncas: 8,  pendientes: 5, vencidas: 2, planificadas: 2 },
];

const ORG_FILTER_TARGET: Record<string, string> = {
  'América Móvil Perú': 'root',
  'Dirección General':  'dir-gen',
  'Dirección Legal':    'dir-legal',
  'Legal':              'dir-legal',
  'Jefatura Legal':     'jef-legal',
  'Henry Ochoa':        'henry',
  'María López':        'henry',
  'Roberto Silva':      'dir-legal',
};

export const findOrgNode = (node: OrgNode, id: string): OrgNode | null => {
  if (node.id === id) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const found = findOrgNode(child, id);
    if (found) return found;
  }
  return null;
};

export const getOrgFilterTargetId = (filters: TrazaFilters): string | null => {
  if (filters.responsable !== 'Todas') return ORG_FILTER_TARGET[filters.responsable] ?? null;
  if (filters.jefatura !== 'Todas')  return ORG_FILTER_TARGET[filters.jefatura] ?? null;
  if (filters.gerencia !== 'Todas')   return ORG_FILTER_TARGET[filters.gerencia] ?? null;
  if (filters.direccion !== 'Todas')  return ORG_FILTER_TARGET[filters.direccion] ?? null;
  return null;
};

const nameParts = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return {
    nombre: parts.slice(0, Math.max(1, parts.length - 2)).join(' '),
    apPaterno: parts.length >= 2 ? parts[parts.length - 2] : '',
    apMaterno: parts.length >= 3 ? parts[parts.length - 1] : '',
  };
};

export const filterColaboradores = (filters: TrazaFilters): TrazaColab[] =>
  TRAZA_COLABORADORES.filter((c) => {
    if (filters.direccion !== 'Todas' && c.direccion !== filters.direccion) return false;
    if (filters.gerencia !== 'Todas' && c.gerencia !== filters.gerencia) return false;
    if (filters.jefatura !== 'Todas' && c.jefatura !== filters.jefatura) return false;
    if (filters.responsable !== 'Todas' && c.responsable !== filters.responsable) return false;

    const parts = nameParts(c.name);
    if (filters.codigo.trim() && !c.codigoEmpleado.toLowerCase().includes(filters.codigo.trim().toLowerCase())) {
      return false;
    }
    if (filters.nombre.trim() && !parts.nombre.toLowerCase().includes(filters.nombre.trim().toLowerCase())
        && !c.name.toLowerCase().includes(filters.nombre.trim().toLowerCase())) {
      return false;
    }
    if (filters.apPaterno.trim() && !parts.apPaterno.toLowerCase().includes(filters.apPaterno.trim().toLowerCase())) {
      return false;
    }
    if (filters.apMaterno.trim() && !parts.apMaterno.toLowerCase().includes(filters.apMaterno.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

export const hasTextFilters = (filters: TrazaFilters): boolean =>
  Boolean(filters.codigo.trim() || filters.apPaterno.trim() || filters.apMaterno.trim() || filters.nombre.trim());

export const hasOrgFilters = (filters: TrazaFilters): boolean =>
  filters.direccion !== 'Todas'
  || filters.gerencia !== 'Todas'
  || filters.jefatura !== 'Todas'
  || filters.responsable !== 'Todas';

export const isFiltersActive = (filters: TrazaFilters): boolean =>
  hasOrgFilters(filters) || hasTextFilters(filters);

export const computeKpisFromColabs = (colabs: TrazaColab[]): OrgMetrics => ({
  colaboradores: colabs.length,
  truncas: colabs.reduce((s, c) => s + c.truncas, 0),
  pendientes: colabs.reduce((s, c) => s + c.pendientes, 0),
  vencidas: colabs.reduce((s, c) => s + c.vencidas, 0),
  planificadas: colabs.reduce((s, c) => s + c.planificadas, 0),
});

export const collectNodePathIds = (root: OrgNode, targetId: string): string[] => {
  const walk = (node: OrgNode, path: string[]): string[] | null => {
    const next = [...path, node.id];
    if (node.id === targetId) return next;
    if (!node.children) return null;
    for (const child of node.children) {
      const found = walk(child, next);
      if (found) return found;
    }
    return null;
  };
  return walk(root, []) ?? [];
};

export const collectDescendantIds = (node: OrgNode): string[] => {
  const ids = [node.id];
  node.children?.forEach((child) => ids.push(...collectDescendantIds(child)));
  return ids;
};
