import React, { useMemo, useState } from 'react';
import type { User } from '../data/users';
import type { VacationRequest } from '../data/vacationRequests';
import { STATUS_LABELS } from '../data/vacationRequests';
import type { NavigateFn } from '../types';
import {
  ORG_HIERARCHY,
  TRAZA_KPIS,
  DEFAULT_TRAZA_FILTERS,
  collectExpandableIds,
  collectDescendantIds,
  collectNodePathIds,
  computeKpisFromColabs,
  filterColaboradores,
  findOrgNode,
  getOrgFilterTargetId,
  hasOrgFilters,
  hasTextFilters,
  isFiltersActive,
  type OrgNode,
  type TrazaFilters,
} from '../data/trazabilidadHierarchy';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */

type TabId = 'jerarquia' | 'equipo' | 'historial' | 'aprobaciones';

interface FlatRow extends OrgNode {
  level: number;
  hasChildren: boolean;
}

interface Props {
  user: User;
  requests: VacationRequest[];
  onNavigate: NavigateFn;
}

const DIRECCIONES  = ['Todas', 'América Móvil Perú', 'Dirección General', 'Dirección Legal'];
const GERENCIAS    = ['Todas', 'Legal', 'Tecnología', 'Operaciones', 'Comercial'];
const JEFATURAS    = ['Todas', 'Jefatura Legal', 'Infraestructura', 'Ventas B2B'];
const RESPONSABLES = ['Todas', 'Henry Ochoa', 'María López', 'Roberto Silva'];

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'jerarquia',   label: 'Jerarquía Organizacional', icon: '🏢' },
  { id: 'equipo',      label: 'Equipo / Líder',           icon: '👥' },
  { id: 'historial',   label: 'Historial Solicitudes',    icon: '📋' },
  { id: 'aprobaciones',label: 'Histórico de Aprobaciones',  icon: '✅' },
];

const fmtNum = (n: number) => n.toLocaleString('es-PE');

const flattenTree = (
  node: OrgNode,
  level: number,
  expanded: Set<string>,
  rows: FlatRow[],
): void => {
  rows.push({
    ...node,
    level,
    hasChildren: Boolean(node.children?.length),
  });
  if (node.children && expanded.has(node.id)) {
    node.children.forEach((child) => flattenTree(child, level + 1, expanded, rows));
  }
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

const Trazabilidad: React.FC<Props> = ({ user, requests, onNavigate }) => {
  const canView = user.role === 'jefe_aprobador' || user.role === 'administrador_gh';

  const [activeTab, setActiveTab]       = useState<TabId>('jerarquia');
  const [expanded, setExpanded]         = useState<Set<string>>(
    () => new Set(collectExpandableIds(ORG_HIERARCHY)),
  );
  const [showActions, setShowActions]   = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [draftFilters, setDraftFilters] = useState<TrazaFilters>(DEFAULT_TRAZA_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<TrazaFilters>(DEFAULT_TRAZA_FILTERS);

  const pendingApprovals = useMemo(() =>
    requests.filter((r) =>
      user.role === 'administrador_gh'
        ? r.status === 'pendiente_gh'
        : r.status === 'pendiente_jefe',
    ).length,
  [requests, user.role]);

  const filteredColabs = useMemo(
    () => filterColaboradores(appliedFilters),
    [appliedFilters],
  );

  const displayKpis = useMemo(() => {
    if (!isFiltersActive(appliedFilters)) return TRAZA_KPIS;
    if (filteredColabs.length > 0) return computeKpisFromColabs(filteredColabs);
    const targetId = getOrgFilterTargetId(appliedFilters);
    const node = targetId ? findOrgNode(ORG_HIERARCHY, targetId) : null;
    if (node) {
      return {
        colaboradores: node.colaboradores,
        truncas: node.truncas,
        pendientes: node.pendientes,
        vencidas: node.vencidas,
        planificadas: node.planificadas,
      };
    }
    return { colaboradores: 0, truncas: 0, pendientes: 0, vencidas: 0, planificadas: 0 };
  }, [appliedFilters, filteredColabs]);

  const visibleOrgIds = useMemo(() => {
    if (!isFiltersActive(appliedFilters)) {
      return new Set(collectExpandableIds(ORG_HIERARCHY).concat(['root', 'colabs']));
    }

    const targetId = getOrgFilterTargetId(appliedFilters);
    if (targetId) {
      const node = findOrgNode(ORG_HIERARCHY, targetId);
      if (node) {
        const pathIds = collectNodePathIds(ORG_HIERARCHY, targetId);
        const descIds = collectDescendantIds(node);
        return new Set([...pathIds, ...descIds]);
      }
    }

    if (hasTextFilters(appliedFilters) && filteredColabs.length > 0) {
      const ids = new Set<string>(['root', 'dir-gen', 'dir-legal', 'jef-legal', 'henry', 'colabs']);
      if (appliedFilters.gerencia === 'Legal' || appliedFilters.responsable === 'Henry Ochoa') {
        return ids;
      }
      return new Set(['root']);
    }

    return new Set<string>();
  }, [appliedFilters, filteredColabs]);

  const treeRows = useMemo(() => {
    const rows: FlatRow[] = [];
    flattenTree(ORG_HIERARCHY, 0, expanded, rows);
    if (!isFiltersActive(appliedFilters)) return rows;
    return rows.filter((row) => visibleOrgIds.has(row.id));
  }, [expanded, appliedFilters, visibleOrgIds]);

  const filteredRequests = useMemo(() => {
    if (!hasTextFilters(appliedFilters) && !hasOrgFilters(appliedFilters)) return requests;
    const names = new Set(filteredColabs.map((c) => c.name));
    if (names.size === 0) return [];
    return requests.filter((r) => names.has(r.userName));
  }, [requests, appliedFilters, filteredColabs]);

  const filteredEquipo = useMemo(() => {
    const leaders = [
      { name: 'Henry Ochoa', area: 'Legal', responsable: 'Henry Ochoa' },
      { name: 'María López', area: 'Tecnología', responsable: 'María López' },
      { name: 'Roberto Silva', area: 'Recursos Humanos', responsable: 'Roberto Silva' },
    ];
    return leaders
      .filter((l) => {
        if (appliedFilters.responsable !== 'Todas' && l.name !== appliedFilters.responsable) return false;
        if (appliedFilters.gerencia !== 'Todas' && l.area !== appliedFilters.gerencia
            && !(appliedFilters.gerencia === 'Legal' && l.name === 'Henry Ochoa')) return false;
        return true;
      })
      .map((l) => {
        const team = filteredColabs.filter((c) => c.responsable === l.name);
        return {
          ...l,
          colaboradores: team.length,
          truncas: team.reduce((s, c) => s + c.truncas, 0),
          pendientes: team.reduce((s, c) => s + c.pendientes, 0),
        };
      })
      .filter((l) => !isFiltersActive(appliedFilters) || l.colaboradores > 0
        || appliedFilters.responsable === l.name);
  }, [appliedFilters, filteredColabs]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSearch = () => {
    setAppliedFilters({ ...draftFilters });
    const targetId = getOrgFilterTargetId(draftFilters);
    if (targetId) {
      const node = findOrgNode(ORG_HIERARCHY, targetId);
      const pathIds = collectNodePathIds(ORG_HIERARCHY, targetId);
      const descIds = node ? collectDescendantIds(node) : [];
      setExpanded(new Set([...pathIds, ...descIds]));
    } else if (isFiltersActive(draftFilters)) {
      setExpanded(new Set(collectExpandableIds(ORG_HIERARCHY)));
    } else {
      setExpanded(new Set(collectExpandableIds(ORG_HIERARCHY)));
    }
  };

  const handleClearFilters = () => {
    setDraftFilters(DEFAULT_TRAZA_FILTERS);
    setAppliedFilters(DEFAULT_TRAZA_FILTERS);
    setExpanded(new Set(collectExpandableIds(ORG_HIERARCHY)));
  };

  const updateDraft = (patch: Partial<TrazaFilters>) =>
    setDraftFilters((prev) => ({ ...prev, ...patch }));

  if (!canView) {
    return (
      <div className="tz-page">
        <div className="rp-no-access">
          <div className="rp-no-access-icon">🔒</div>
          <h3>Acceso restringido</h3>
          <p>Esta aplicación está disponible solo para jefes aprobadores y administradores GH.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tz-page">
      {/* ── Filtros ───────────────────────────────────────────── */}
      <div className="rp-filters-card">
        <button
          type="button"
          className="rp-filters-toggle"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <span className="tz-filters-title">
            <span aria-hidden="true">⛃</span> Filtros
          </span>
          <svg
            className={`rp-filters-chevron${filtersOpen ? ' rp-filters-chevron--open' : ''}`}
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {filtersOpen && (
          <div className="rp-filters-body">
            <div className="rp-filters-row">
              <div className="rp-filter-field">
                <label className="rp-filter-label">Dirección</label>
                <select className="rp-select" value={draftFilters.direccion} onChange={(e) => updateDraft({ direccion: e.target.value })}>
                  {DIRECCIONES.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="rp-filter-field">
                <label className="rp-filter-label">Gerencia</label>
                <select className="rp-select" value={draftFilters.gerencia} onChange={(e) => updateDraft({ gerencia: e.target.value })}>
                  {GERENCIAS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="rp-filter-field">
                <label className="rp-filter-label">Jefatura</label>
                <select className="rp-select" value={draftFilters.jefatura} onChange={(e) => updateDraft({ jefatura: e.target.value })}>
                  {JEFATURAS.map((j) => <option key={j}>{j}</option>)}
                </select>
              </div>
              <div className="rp-filter-field">
                <label className="rp-filter-label">Responsable</label>
                <select className="rp-select" value={draftFilters.responsable} onChange={(e) => updateDraft({ responsable: e.target.value })}>
                  {RESPONSABLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="rp-filters-row">
              <div className="rp-filter-field">
                <label className="rp-filter-label">Código RRHH</label>
                <input className="rp-input" placeholder="Ingrese código" value={draftFilters.codigo} onChange={(e) => updateDraft({ codigo: e.target.value })} />
              </div>
              <div className="rp-filter-field">
                <label className="rp-filter-label">Apellido Paterno</label>
                <input className="rp-input" placeholder="Ingrese" value={draftFilters.apPaterno} onChange={(e) => updateDraft({ apPaterno: e.target.value })} />
              </div>
              <div className="rp-filter-field">
                <label className="rp-filter-label">Apellido Materno</label>
                <input className="rp-input" placeholder="Ingrese" value={draftFilters.apMaterno} onChange={(e) => updateDraft({ apMaterno: e.target.value })} />
              </div>
              <div className="rp-filter-field">
                <label className="rp-filter-label">Nombre</label>
                <input className="rp-input" placeholder="Ingrese" value={draftFilters.nombre} onChange={(e) => updateDraft({ nombre: e.target.value })} />
              </div>
            </div>

            <div className="tz-filters-actions">
              <button type="button" className="tz-btn-clear" onClick={handleClearFilters}>
                Limpiar filtros
              </button>
              <button type="button" className="rp-btn-search" onClick={handleSearch}>Buscar</button>
            </div>
          </div>
        )}
      </div>

      {/* ── KPI tiles ─────────────────────────────────────────── */}
      <div className="tz-kpi-grid">
        <div className="rp-kpi">
          <div className="rp-kpi-ico rp-kpi-ico--blue">👥</div>
          <div className="rp-kpi-body">
            <div className="rp-kpi-label">Colaboradores</div>
            <div className="rp-kpi-value">{fmtNum(displayKpis.colaboradores)}</div>
            <div className="rp-kpi-sub">Total</div>
          </div>
        </div>
        <div className="rp-kpi">
          <div className="rp-kpi-ico rp-kpi-ico--blue">📅</div>
          <div className="rp-kpi-body">
            <div className="rp-kpi-label">Truncas</div>
            <div className="rp-kpi-value rp-kpi-value--blue">{fmtNum(displayKpis.truncas)}</div>
            <div className="rp-kpi-sub">Total días truncos</div>
          </div>
        </div>
        <div className="rp-kpi">
          <div className="rp-kpi-ico rp-kpi-ico--orange">⏰</div>
          <div className="rp-kpi-body">
            <div className="rp-kpi-label">Pendientes</div>
            <div className="rp-kpi-value rp-kpi-value--orange">{fmtNum(displayKpis.pendientes)}</div>
            <div className="rp-kpi-sub">Total días pendientes</div>
          </div>
        </div>
        <div className="rp-kpi">
          <div className="rp-kpi-ico rp-kpi-ico--red">⚠️</div>
          <div className="rp-kpi-body">
            <div className="rp-kpi-label">Vencidas</div>
            <div className="rp-kpi-value rp-kpi-value--red">{fmtNum(displayKpis.vencidas)}</div>
            <div className="rp-kpi-sub">Total días vencidas</div>
          </div>
        </div>
        <div className="rp-kpi">
          <div className="rp-kpi-ico tz-kpi-ico--green">📆</div>
          <div className="rp-kpi-body">
            <div className="rp-kpi-label">Planificadas</div>
            <div className="rp-kpi-value tz-kpi-value--green">{fmtNum(displayKpis.planificadas)}</div>
            <div className="rp-kpi-sub">Total días planificadas</div>
          </div>
        </div>
      </div>

      {/* ── Pending approvals banner ──────────────────────────── */}
      <div className="tz-pending-banner">
        <div className="tz-pending-left">
          <span aria-hidden="true">🔔</span>
          <span>Solicitudes pendientes de aprobación</span>
          <span className="tz-pending-badge">{pendingApprovals || 15}</span>
        </div>
        <button
          type="button"
          className="tz-pending-btn"
          onClick={() => onNavigate('solicitudes-pendientes', 'aprobaciones')}
        >
          Ir a Aprobaciones →
        </button>
      </div>

      {/* ── Icon Tab Bar ──────────────────────────────────────── */}
      <div className="tz-icon-tabs" role="tablist" aria-label="Vistas de trazabilidad">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tz-icon-tab${activeTab === tab.id ? ' tz-icon-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tz-icon-tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="tz-icon-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────── */}
      {activeTab === 'jerarquia' && (
        <div className="tz-table-card" role="tabpanel">
          <div className="tz-table-header">
            <h3 className="tz-table-title">Jerarquía organizacional</h3>
            <div className="tz-actions-wrap">
              <button
                type="button"
                className="tz-actions-btn"
                onClick={() => setShowActions((v) => !v)}
                aria-expanded={showActions}
              >
                Acciones ⋮
              </button>
              {showActions && (
                <div className="tz-actions-menu">
                  <button type="button">📊 Exportar Excel</button>
                  <button type="button">📄 Exportar CSV</button>
                </div>
              )}
            </div>
          </div>

          <div className="tz-table-scroll">
            <table className="tz-tree-table">
              <thead>
                <tr>
                  <th>Unidad Organizacional</th>
                  <th>Colaboradores</th>
                  <th className="tz-col--blue">Truncas</th>
                  <th className="tz-col--orange">Pendientes</th>
                  <th className="tz-col--red">Vencidas</th>
                  <th className="tz-col--green">Planificadas</th>
                </tr>
              </thead>
              <tbody>
                {treeRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="tz-empty-cell">
                      No se encontraron unidades con los filtros aplicados.
                    </td>
                  </tr>
                )}
                {treeRows.map((row) => (
                  <tr
                    key={row.id}
                    className={[
                      row.highlighted ? 'tz-tree-row--highlight' : '',
                      row.hasChildren ? 'tz-tree-row--parent' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <td>
                      <div className="tz-tree-cell" style={{ paddingLeft: `${12 + row.level * 22}px` }}>
                        {row.hasChildren ? (
                          <button
                            type="button"
                            className="tz-tree-toggle"
                            onClick={() => toggleExpand(row.id)}
                            aria-expanded={expanded.has(row.id)}
                          >
                            {expanded.has(row.id) ? '▾' : '▸'}
                          </button>
                        ) : (
                          <span className="tz-tree-spacer" />
                        )}
                        <span className="tz-tree-label">{row.label}</span>
                      </div>
                    </td>
                    <td>{fmtNum(row.colaboradores)}</td>
                    <td className="tz-val--blue">{fmtNum(row.truncas)}</td>
                    <td className="tz-val--orange">{fmtNum(row.pendientes)}</td>
                    <td className="tz-val--red">{fmtNum(row.vencidas)}</td>
                    <td className="tz-val--green">{fmtNum(row.planificadas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tz-table-footer">
            Mostrando 1 a {treeRows.length} de {treeRows.length} unidades
          </div>
        </div>
      )}

      {activeTab === 'equipo' && (
        <div className="tz-table-card" role="tabpanel">
          <h3 className="tz-table-title">Equipo / Líder</h3>
          <div className="tz-table-scroll">
            <table className="tz-tree-table">
              <thead>
                <tr>
                  <th>Líder</th>
                  <th>Área</th>
                  <th>Colaboradores</th>
                  <th>Truncas</th>
                  <th>Pendientes</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipo.length === 0 && (
                  <tr>
                    <td colSpan={5} className="tz-empty-cell">No se encontraron líderes con los filtros aplicados.</td>
                  </tr>
                )}
                {filteredEquipo.map((l) => (
                  <tr key={l.name}>
                    <td><strong>{l.name}</strong></td>
                    <td>{l.area}</td>
                    <td>{l.colaboradores}</td>
                    <td className="tz-val--blue">{l.truncas}</td>
                    <td className="tz-val--orange">{l.pendientes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="tz-table-card" role="tabpanel">
          <h3 className="tz-table-title">Historial de solicitudes</h3>
          <div className="tz-table-scroll">
            <table className="tz-tree-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Colaborador</th>
                  <th>Período</th>
                  <th>Días</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="tz-empty-cell">No se encontraron solicitudes con los filtros aplicados.</td>
                  </tr>
                )}
                {(isFiltersActive(appliedFilters) ? filteredRequests : requests).slice(0, 8).map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.id}</strong></td>
                    <td>{r.userName}</td>
                    <td>{r.startDate} – {r.endDate}</td>
                    <td>{r.days}</td>
                    <td>{STATUS_LABELS[r.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'aprobaciones' && (
        <div className="tz-table-card" role="tabpanel">
          <h3 className="tz-table-title">Histórico de aprobaciones</h3>
          <div className="tz-table-scroll">
            <table className="tz-tree-table">
              <thead>
                <tr>
                  <th>Solicitud</th>
                  <th>Colaborador</th>
                  <th>Acción</th>
                  <th>Aprobador</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const source = isFiltersActive(appliedFilters) ? filteredRequests : requests;
                  const rows = source.flatMap((r) =>
                    r.history
                      .filter((h) => ['aprobado_jefe', 'aprobado', 'rechazado', 'anulado'].includes(h.status))
                      .map((h, i) => ({ r, h, i })),
                  ).slice(0, 10);
                  if (rows.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="tz-empty-cell">No se encontraron aprobaciones con los filtros aplicados.</td>
                      </tr>
                    );
                  }
                  return rows.map(({ r, h, i }) => (
                    <tr key={`${r.id}-${i}`}>
                      <td><strong>{r.id}</strong></td>
                      <td>{r.userName}</td>
                      <td>{h.label}</td>
                      <td>{h.by}</td>
                      <td>{h.date}{h.time ? ` · ${h.time}` : ''}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trazabilidad;
