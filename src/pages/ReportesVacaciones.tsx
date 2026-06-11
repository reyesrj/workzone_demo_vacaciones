import React, { useState, useMemo } from 'react';
import { USERS } from '../data/users';
import type { User } from '../data/users';
import type { VacationRequest } from '../data/vacationRequests';
import SpacePage from '../components/SpacePage';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                    */
/* ------------------------------------------------------------------ */

type VacStatus = 'al_dia' | 'atencion' | 'riesgo';

interface ColabRow {
  user:        User;
  saldo:       number;
  pendientes:  number;
  vencidas:    number;
  planificadas:number;
  status:      VacStatus;
  lastUpdate:  string;
  area:        string;
  gerencia:    string;
  jefatura:    string;
}

interface Props {
  user:     User;
  requests: VacationRequest[];
}

const DEPT_GERENCIA: Record<string, string> = {
  'Tecnología':       'Tecnología',
  'Operaciones':      'Operaciones',
  'Recursos Humanos': 'Recursos Humanos',
  'Legal':            'Legal',
  'Comercial':        'Comercial',
  'Finanzas':         'Finanzas',
};

const GERENCIAS   = ['Todas', 'Tecnología', 'Operaciones', 'Recursos Humanos', 'Legal', 'Comercial', 'Finanzas'];
const JEFATURAS   = ['Todas', 'Dirección Legal', 'Ventas B2B', 'Infraestructura', 'Operaciones', 'Contabilidad'];
const STATUS_OPTS = ['Todas', 'Al día', 'Atención', 'Riesgo'];
const PAGE_SIZES  = [5, 10, 20, 50];

const SHORT_MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const fmtDate = (d: string) => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getDate()} ${SHORT_MONTHS[dt.getMonth()]}. ${dt.getFullYear()}`;
};

const getVacStatus = (u: User): VacStatus => {
  if (u.vacationBalanceVencidas > 0) return 'riesgo';
  if (u.vacationBalancePendientes > 0) return 'atencion';
  return 'al_dia';
};

const STATUS_LABEL: Record<VacStatus, string> = {
  al_dia:   'Al día',
  atencion: 'Atención',
  riesgo:   'Riesgo',
};

const STATUS_CLS: Record<VacStatus, string> = {
  al_dia:   'rp-pill--green',
  atencion: 'rp-pill--orange',
  riesgo:   'rp-pill--red',
};

/* ------------------------------------------------------------------ */
/*  SVG Donut helper                                                     */
/* ------------------------------------------------------------------ */

interface DonutSlice { pct: number; color: string; }

const SvgDonut: React.FC<{ slices: DonutSlice[]; size?: number }> = ({ slices, size = 160 }) => {
  const r = 55; const cx = 80; const cy = 80;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  const paths = slices.map((s, i) => {
    const len = (s.pct / 100) * circ;
    const el = (
      <circle
        key={i}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={s.color}
        strokeWidth="22"
        strokeDasharray={`${len} ${circ - len}`}
        strokeDashoffset={-offset}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
    );
    offset += len;
    return el;
  });

  return (
    <svg width={size} height={size} viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth="22"/>
      {paths}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

const ReportesVacaciones: React.FC<Props> = ({ user, requests }) => {
  /* ── Filters ── */
  const [search,       setSearch]      = useState('');
  const [filterArea,   setFilterArea]  = useState('Todas');
  const [filterGer,    setFilterGer]   = useState('Todas');
  const [filterJef,    setFilterJef]   = useState('Todas');
  const [filterStatus, setFilterStatus]= useState('Todas');
  const [filterDesde,  setFilterDesde] = useState('');
  const [filterHasta,  setFilterHasta] = useState('');
  const [filtersOpen,  setFiltersOpen] = useState(true);

  /* ── Table ── */
  const [page,     setPage]    = useState(1);
  const [pageSize, setPageSize]= useState(5);
  const [sortCol,  setSortCol] = useState<keyof ColabRow | null>(null);
  const [sortAsc,  setSortAsc] = useState(true);

  /* Build rows from USERS (demo with extended synthetic data) */
  const allRows: ColabRow[] = useMemo(() => {
    const baseRows = USERS.map(u => ({
      user:         u,
      saldo:        u.vacationBalance,
      pendientes:   u.vacationBalancePendientes,
      vencidas:     u.vacationBalanceVencidas,
      planificadas: requests.filter(r =>
        r.userId === u.id &&
        ['aprobado','pendiente_jefe','pendiente_gh'].includes(r.status)
      ).reduce((s, r) => s + r.days, 0),
      status:      getVacStatus(u),
      lastUpdate:  '2026-05-28',
      area:        u.department,
      gerencia:    DEPT_GERENCIA[u.department] ?? u.department,
      jefatura:    u.approver ?? '—',
    }));

    /* Extend with synthetic collaborators for richer demo */
    const extra: ColabRow[] = [
      { user: { id:'sx1', name:'Juan Pérez Ramírez',    codigoEmpleado:'C25565', role:'colaborador_standard', department:'Legal',     email:'',initials:'JP', schedule:'',vacationBalance:35,vacationBalanceTruncas:0,vacationBalancePendientes:20,vacationBalanceVencidas:5, photo:undefined, managerId:undefined, approver:'María López', hireDate:'2022-01-10' }, saldo:35, pendientes:20, vencidas:5,  planificadas:10, status:'riesgo',   lastUpdate:'2026-05-28', area:'Legal',     gerencia:'Legal',    jefatura:'Dirección Legal' },
      { user: { id:'sx2', name:'María Fernanda López',  codigoEmpleado:'C18392', role:'colaborador_standard', department:'Comercial', email:'',initials:'MF', schedule:'',vacationBalance:28,vacationBalanceTruncas:0,vacationBalancePendientes:10,vacationBalanceVencidas:0, photo:undefined, managerId:undefined, approver:'María López', hireDate:'2021-03-14' }, saldo:28, pendientes:10, vencidas:0,  planificadas:8,  status:'atencion', lastUpdate:'2026-05-28', area:'Comercial', gerencia:'Comercial',jefatura:'Ventas B2B'     },
      { user: { id:'sx3', name:'Carlos Alberto Rojas',  codigoEmpleado:'C17831', role:'colaborador_standard', department:'Operaciones',email:'',initials:'CA', schedule:'',vacationBalance:18,vacationBalanceTruncas:0,vacationBalancePendientes:5, vacationBalanceVencidas:0, photo:undefined, managerId:undefined, approver:'María López', hireDate:'2020-06-20' }, saldo:18, pendientes:5,  vencidas:0,  planificadas:5,  status:'al_dia',   lastUpdate:'2026-05-27', area:'Operaciones','gerencia':'Operaciones',jefatura:'Operaciones'   },
      { user: { id:'sx4', name:'Lucía Valentina Díaz',  codigoEmpleado:'C19280', role:'colaborador_standard', department:'Tecnología',email:'',initials:'LV', schedule:'',vacationBalance:30,vacationBalanceTruncas:0,vacationBalancePendientes:12,vacationBalanceVencidas:2, photo:undefined, managerId:undefined, approver:'María López', hireDate:'2021-11-03' }, saldo:30, pendientes:12, vencidas:2,  planificadas:10, status:'atencion', lastUpdate:'2026-05-27', area:'Tecnología','gerencia':'Tecnología',jefatura:'Infraestructura'},
      { user: { id:'sx5', name:'José Antonio García',   codigoEmpleado:'C16472', role:'colaborador_standard', department:'Finanzas',  email:'',initials:'JA', schedule:'',vacationBalance:22,vacationBalanceTruncas:0,vacationBalancePendientes:8, vacationBalanceVencidas:0, photo:undefined, managerId:undefined, approver:'María López', hireDate:'2019-08-15' }, saldo:22, pendientes:8,  vencidas:0,  planificadas:6,  status:'al_dia',   lastUpdate:'2026-05-26', area:'Finanzas',  gerencia:'Finanzas', jefatura:'Contabilidad'   },
    ];

    return [...baseRows, ...extra];
  }, [requests]);

  /* ── Filtered rows ── */
  const filtered = useMemo(() => {
    return allRows.filter(r => {
      const q = search.toLowerCase();
      if (q && !r.user.name.toLowerCase().includes(q) && !r.user.codigoEmpleado.toLowerCase().includes(q)) return false;
      if (filterArea !== 'Todas' && r.area !== filterArea) return false;
      if (filterGer  !== 'Todas' && r.gerencia !== filterGer) return false;
      if (filterStatus !== 'Todas') {
        const map: Record<string, VacStatus> = { 'Al día':'al_dia', 'Atención':'atencion', 'Riesgo':'riesgo' };
        if (r.status !== map[filterStatus]) return false;
      }
      return true;
    });
  }, [allRows, search, filterArea, filterGer, filterStatus]);

  /* ── KPIs ── */
  const totalColabs    = filtered.length;
  const pendCount      = filtered.filter(r => r.pendientes > 0).length;
  const vencCount      = filtered.filter(r => r.vencidas > 0).length;
  const planCount      = filtered.filter(r => r.planificadas > 0).length;

  /* ── Donut data ── */
  const alDiaCount   = filtered.filter(r => r.status === 'al_dia').length;
  const atencionCount= filtered.filter(r => r.status === 'atencion').length;
  const riesgoCount  = filtered.filter(r => r.status === 'riesgo').length;
  const total        = filtered.length || 1;
  const pctAlDia     = Math.round((alDiaCount   / total) * 100);
  const pctAtencion  = Math.round((atencionCount/ total) * 100);
  const pctRiesgo    = Math.round((riesgoCount  / total) * 100);

  /* ── Bar chart: vencidas por area ── */
  const vencByArea = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => { if (r.vencidas > 0) map[r.area] = (map[r.area] ?? 0) + r.vencidas; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filtered]);
  const maxVenc = vencByArea.reduce((m, [, v]) => Math.max(m, v), 1);

  /* ── Pagination ── */
  const pages     = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (col: keyof ColabRow) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  };

  const handleClear = () => {
    setSearch(''); setFilterArea('Todas'); setFilterGer('Todas');
    setFilterJef('Todas'); setFilterStatus('Todas'); setFilterDesde(''); setFilterHasta('');
    setPage(1);
  };

  const canViewAll = user.role === 'administrador_gh' || user.role === 'jefe_aprobador';

  if (!canViewAll) {
    return (
      <SpacePage spaceName="Mis Vacaciones" pageName="Reportes">
        <div className="rp-no-access">
          <div className="rp-no-access-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" fill="#FFEBEE" stroke="#C62828" strokeWidth="2"/>
              <path d="M24 14v14M24 34v2" stroke="#C62828" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3>Acceso restringido</h3>
          <p>Esta sección está disponible solo para jefes aprobadores y administradores GH.</p>
        </div>
      </SpacePage>
    );
  }

  return (
    <SpacePage spaceName="Mis Vacaciones" pageName="Reportes">
      <div className="rp-wrap">
        {/* ════════ PAGE TITLE ════════ */}
        <div className="rp-page-title-row">
          <div>
            <div className="wz-breadcrumb">Mis Vacaciones › Reportes</div>
            <h2 className="wz-page-heading">Trazabilidad de vacaciones</h2>
          </div>
          <button className="rp-export-btn">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M8 1v8M5 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Exportar
          </button>
        </div>

        {/* ════════ FILTROS ════════ */}
        <div className="rp-filters-card">
          <button className="rp-filters-toggle" onClick={() => setFiltersOpen(o => !o)}>
            <span className="rp-filters-toggle-label">Filtros</span>
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
                {/* Buscar */}
                <div className="rp-filter-field rp-filter-field--wide">
                  <label className="rp-filter-label">Buscar colaborador</label>
                  <div className="rp-search-wrap">
                    <svg className="rp-search-ico" width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="6.5" cy="6.5" r="5" stroke="#888" strokeWidth="1.4"/>
                      <path d="M11 11l3 3" stroke="#888" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    <input
                      className="rp-input"
                      placeholder="Nombre o código"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                </div>

                {/* Área */}
                <div className="rp-filter-field">
                  <label className="rp-filter-label">Área</label>
                  <select className="rp-select" value={filterArea} onChange={e => { setFilterArea(e.target.value); setPage(1); }}>
                    {GERENCIAS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>

                {/* Gerencia */}
                <div className="rp-filter-field">
                  <label className="rp-filter-label">Gerencia</label>
                  <select className="rp-select" value={filterGer} onChange={e => { setFilterGer(e.target.value); setPage(1); }}>
                    {GERENCIAS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>

                {/* Jefatura */}
                <div className="rp-filter-field">
                  <label className="rp-filter-label">Jefatura</label>
                  <select className="rp-select" value={filterJef} onChange={e => { setFilterJef(e.target.value); setPage(1); }}>
                    {JEFATURAS.map(j => <option key={j}>{j}</option>)}
                  </select>
                </div>

                {/* Estado vacacional */}
                <div className="rp-filter-field">
                  <label className="rp-filter-label">Estado vacacional</label>
                  <select className="rp-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Rango de ingreso */}
                <div className="rp-filter-field rp-filter-field--date">
                  <label className="rp-filter-label">Rango de ingreso</label>
                  <div className="rp-date-range">
                    <input type="date" className="rp-input rp-input--date" placeholder="Desde" value={filterDesde} onChange={e => setFilterDesde(e.target.value)}/>
                    <span className="rp-date-sep">—</span>
                    <input type="date" className="rp-input rp-input--date" placeholder="Hasta" value={filterHasta} onChange={e => setFilterHasta(e.target.value)}/>
                  </div>
                </div>
              </div>

              <div className="rp-filters-actions">
                <button className="rp-btn-search" onClick={() => setPage(1)}>
                  Buscar
                </button>
                <button className="rp-btn-clear" onClick={handleClear}>
                  Limpiar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ════════ KPI STRIP ════════ */}
        <div className="rp-kpi-grid">

          <div className="rp-kpi rp-kpi--gray">
            <div className="rp-kpi-ico rp-kpi-ico--gray">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="7" r="3.5" stroke="#555" strokeWidth="1.5"/>
                <circle cx="17" cy="9" r="2.5" stroke="#888" strokeWidth="1.3"/>
                <path d="M1 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M16 16c1.2-.7 2.6-1 4-1 2.2 0 4 1.3 4 3" stroke="#888" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="rp-kpi-body">
              <div className="rp-kpi-label">Colaboradores</div>
              <div className="rp-kpi-value">{totalColabs.toLocaleString()}</div>
              <div className="rp-kpi-sub">Total activos</div>
            </div>
          </div>

          <div className="rp-kpi rp-kpi--orange">
            <div className="rp-kpi-ico rp-kpi-ico--orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9.5" stroke="#E65100" strokeWidth="1.5"/>
                <path d="M12 7v5.5l3 2" stroke="#E65100" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="rp-kpi-body">
              <div className="rp-kpi-label">Pendientes por gestionar</div>
              <div className="rp-kpi-value rp-kpi-value--orange">{pendCount}</div>
              <div className="rp-kpi-sub">Colaboradores</div>
            </div>
          </div>

          <div className="rp-kpi rp-kpi--red">
            <div className="rp-kpi-ico rp-kpi-ico--red">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L2 21h20L12 3Z" stroke="#C62828" strokeWidth="1.5" fill="#FFEBEE" strokeLinejoin="round"/>
                <rect x="11" y="10" width="2" height="5.5" rx="1" fill="#C62828"/>
                <circle cx="12" cy="17.5" r="1" fill="#C62828"/>
              </svg>
            </div>
            <div className="rp-kpi-body">
              <div className="rp-kpi-label">Vacaciones vencidas</div>
              <div className="rp-kpi-value rp-kpi-value--red">{vencCount}</div>
              <div className="rp-kpi-sub">Colaboradores</div>
            </div>
          </div>

          <div className="rp-kpi rp-kpi--blue">
            <div className="rp-kpi-ico rp-kpi-ico--blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="#1565C0" strokeWidth="1.5" fill="#E3F2FD"/>
                <path d="M3 9.5h18" stroke="#1565C0" strokeWidth="1.3"/>
                <rect x="8" y="2.5" width="2" height="5" rx="1" fill="#1565C0"/>
                <rect x="14" y="2.5" width="2" height="5" rx="1" fill="#1565C0"/>
                <path d="M7.5 14.5l2.5 2.5L16.5 11" stroke="#1565C0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="rp-kpi-body">
              <div className="rp-kpi-label">Vacaciones planificadas</div>
              <div className="rp-kpi-value rp-kpi-value--blue">{planCount}</div>
              <div className="rp-kpi-sub">Colaboradores</div>
            </div>
          </div>

        </div>

        {/* ════════ ANALYTICS ROW ════════ */}
        <div className="rp-analytics-row">

          {/* Donut – Estado */}
          <div className="rp-chart-card rp-chart-card--donut">
            <div className="rp-chart-title">Estado de vacaciones</div>
            <div className="rp-donut-wrap">
              <SvgDonut slices={[
                { pct: pctAlDia,    color: '#43A047' },
                { pct: pctAtencion, color: '#FB8C00' },
                { pct: pctRiesgo,   color: '#E53935' },
              ]} size={160}/>
              <div className="rp-donut-legend">
                <div className="rp-dl-item">
                  <span className="rp-dl-dot" style={{ background: '#43A047' }}/>
                  <span className="rp-dl-label">Al día</span>
                  <span className="rp-dl-val">{alDiaCount} ({pctAlDia}%)</span>
                </div>
                <div className="rp-dl-item">
                  <span className="rp-dl-dot" style={{ background: '#FB8C00' }}/>
                  <span className="rp-dl-label">Atención</span>
                  <span className="rp-dl-val">{atencionCount} ({pctAtencion}%)</span>
                </div>
                <div className="rp-dl-item">
                  <span className="rp-dl-dot" style={{ background: '#E53935' }}/>
                  <span className="rp-dl-label">Riesgo</span>
                  <span className="rp-dl-val">{riesgoCount} ({pctRiesgo}%)</span>
                </div>
              </div>
            </div>
            <p className="rp-chart-footnote">Basado en políticas corporativas de vacaciones.</p>
          </div>

          {/* Bar chart – Vencidas por área */}
          <div className="rp-chart-card rp-chart-card--bar">
            <div className="rp-chart-title">Vacaciones vencidas por gerencia</div>
            {vencByArea.length === 0 ? (
              <p className="rp-chart-empty">Sin días vencidos en el período.</p>
            ) : (
              <div className="rp-bar-list">
                {vencByArea.map(([area, val]) => (
                  <div key={area} className="rp-bar-item">
                    <span className="rp-bar-label">{area}</span>
                    <div className="rp-bar-track">
                      <div
                        className="rp-bar-fill"
                        style={{ width: `${(val / maxVenc) * 100}%`, background: val >= 10 ? '#E53935' : val >= 5 ? '#FB8C00' : '#43A047' }}
                      />
                    </div>
                    <span className="rp-bar-val">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status summary */}
          <div className="rp-chart-card rp-chart-card--summary">
            <div className="rp-chart-title">Resumen por estado</div>
            <div className="rp-summary-list">
              <div className="rp-sum-item rp-sum-item--red">
                <span className="rp-sum-dot" style={{ background: '#E53935' }}/>
                <div className="rp-sum-body">
                  <div className="rp-sum-name">Riesgo</div>
                  <div className="rp-sum-desc">Colaboradores con vacaciones vencidas</div>
                </div>
                <span className="rp-sum-count">{riesgoCount}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rp-sum-arrow">
                  <path d="M5 3l4 4-4 4" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="rp-sum-item rp-sum-item--orange">
                <span className="rp-sum-dot" style={{ background: '#FB8C00' }}/>
                <div className="rp-sum-body">
                  <div className="rp-sum-name">Atención</div>
                  <div className="rp-sum-desc">Colaboradores con vacaciones próximas a vencer</div>
                </div>
                <span className="rp-sum-count">{atencionCount}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rp-sum-arrow">
                  <path d="M5 3l4 4-4 4" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="rp-sum-item rp-sum-item--green">
                <span className="rp-sum-dot" style={{ background: '#43A047' }}/>
                <div className="rp-sum-body">
                  <div className="rp-sum-name">Al día</div>
                  <div className="rp-sum-desc">Colaboradores con vacaciones al día</div>
                </div>
                <span className="rp-sum-count">{alDiaCount}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rp-sum-arrow">
                  <path d="M5 3l4 4-4 4" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

        </div>

        {/* ════════ TABLA COLABORADORES ════════ */}
        <div className="rp-table-card">
          <div className="rp-table-header">
            <div>
              <div className="rp-table-title">Colaboradores ({filtered.length.toLocaleString()})</div>
            </div>
            <div className="rp-table-tools">
              <button className="rp-icon-btn" title="Configurar columnas">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="rp-icon-btn" title="Vista de tabla">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
              </button>
              <button className="rp-icon-btn" title="Más opciones">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="3" r="1.2" fill="currentColor"/>
                  <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
                  <circle cx="8" cy="13" r="1.2" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Desktop table ── */}
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th className="rp-th-sort" onClick={() => handleSort('user')}>
                    <span>Colaborador</span>
                    <SortIcon col="user" sortCol={sortCol} sortAsc={sortAsc}/>
                  </th>
                  <th>Área</th>
                  <th>Gerencia</th>
                  <th>Jefatura</th>
                  <th className="rp-th-num rp-th-sort" onClick={() => handleSort('saldo')}>
                    <span>Saldo (días)</span>
                    <SortIcon col="saldo" sortCol={sortCol} sortAsc={sortAsc}/>
                  </th>
                  <th className="rp-th-num rp-th-sort" onClick={() => handleSort('pendientes')}>
                    <span>Pendientes (días)</span>
                    <SortIcon col="pendientes" sortCol={sortCol} sortAsc={sortAsc}/>
                  </th>
                  <th className="rp-th-num rp-th-sort" onClick={() => handleSort('vencidas')}>
                    <span>Vencidas (días)</span>
                    <SortIcon col="vencidas" sortCol={sortCol} sortAsc={sortAsc}/>
                  </th>
                  <th className="rp-th-num rp-th-sort" onClick={() => handleSort('planificadas')}>
                    <span>Planificadas (días)</span>
                    <SortIcon col="planificadas" sortCol={sortCol} sortAsc={sortAsc}/>
                  </th>
                  <th>Estado</th>
                  <th>Última actualización</th>
                  <th/>
                </tr>
              </thead>
              <tbody>
                {paginated.map(row => (
                  <tr key={row.user.id} className="rp-tr">
                    <td>
                      <div className="rp-colab-cell">
                        <div className="rp-colab-avatar" style={row.user.photo ? { background: 'transparent', padding: 0, overflow: 'hidden' } : {}}>
                          {row.user.photo
                            ? <img src={`${import.meta.env.BASE_URL}${row.user.photo}`} alt={row.user.name} className="rp-avatar-img"/>
                            : row.user.initials}
                        </div>
                        <div>
                          <div className="rp-colab-name">{row.user.name}</div>
                          <div className="rp-colab-code">{row.user.codigoEmpleado}</div>
                        </div>
                      </div>
                    </td>
                    <td className="rp-td-sec">{row.area}</td>
                    <td className="rp-td-sec">{row.gerencia}</td>
                    <td className="rp-td-sec">{row.jefatura}</td>
                    <td className="rp-td-num rp-td-green">{row.saldo}</td>
                    <td className="rp-td-num rp-td-orange">{row.pendientes || <span className="rp-td-zero">0</span>}</td>
                    <td className="rp-td-num rp-td-red">{row.vencidas || <span className="rp-td-zero">0</span>}</td>
                    <td className="rp-td-num rp-td-blue">{row.planificadas || <span className="rp-td-zero">0</span>}</td>
                    <td>
                      <span className={`rp-pill ${STATUS_CLS[row.status]}`}>
                        <span className="rp-pill-dot"/>
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className="rp-td-sec">{fmtDate(row.lastUpdate)}</td>
                    <td>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rp-row-arrow">
                        <path d="M5 3l4 4-4 4" stroke="#bbb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="rp-cards-list">
            {paginated.map(row => (
              <div key={row.user.id} className={`rp-mob-card rp-mob-card--${row.status}`}>
                {/* Header: avatar + name + status */}
                <div className="rp-mob-card-top">
                  <div className="rp-mob-avatar" style={row.user.photo ? { background: 'transparent', padding: 0, overflow: 'hidden' } : {}}>
                    {row.user.photo
                      ? <img src={`${import.meta.env.BASE_URL}${row.user.photo}`} alt={row.user.name} className="rp-avatar-img"/>
                      : row.user.initials}
                  </div>
                  <div className="rp-mob-info">
                    <div className="rp-mob-name">{row.user.name}</div>
                    <div className="rp-mob-code">{row.user.codigoEmpleado}</div>
                  </div>
                  <div className="rp-mob-right">
                    <span className={`rp-pill ${STATUS_CLS[row.status]}`}>
                      <span className="rp-pill-dot"/>
                      {STATUS_LABEL[row.status]}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rp-mob-arrow">
                      <path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="rp-mob-metrics">
                  <div className="rp-mob-metric">
                    <span className="rp-mob-m-label">Saldo</span>
                    <span className="rp-mob-m-val rp-mob-m-val--green">{row.saldo}</span>
                  </div>
                  <div className="rp-mob-metric">
                    <span className="rp-mob-m-label">Pendientes</span>
                    <span className={`rp-mob-m-val ${row.pendientes > 0 ? 'rp-mob-m-val--orange' : 'rp-mob-m-val--zero'}`}>{row.pendientes}</span>
                  </div>
                  <div className="rp-mob-metric">
                    <span className="rp-mob-m-label">Vencidas</span>
                    <span className={`rp-mob-m-val ${row.vencidas > 0 ? 'rp-mob-m-val--red' : 'rp-mob-m-val--zero'}`}>{row.vencidas}</span>
                  </div>
                  <div className="rp-mob-metric">
                    <span className="rp-mob-m-label">Planificadas</span>
                    <span className={`rp-mob-m-val ${row.planificadas > 0 ? 'rp-mob-m-val--blue' : 'rp-mob-m-val--zero'}`}>{row.planificadas}</span>
                  </div>
                </div>

                {/* Footer: area + last update */}
                <div className="rp-mob-footer">
                  <span className="rp-mob-area">{row.area} · {row.gerencia}</span>
                  <span className="rp-mob-date">{fmtDate(row.lastUpdate)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="rp-pagination">
            <div className="rp-pg-info">
              Mostrando {Math.min((page - 1) * pageSize + 1, filtered.length)} a {Math.min(page * pageSize, filtered.length)} de {filtered.length.toLocaleString()} colaboradores
            </div>
            <div className="rp-pg-controls">
              <button className="rp-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(pages, 3) }, (_, i) => (
                <button
                  key={i + 1}
                  className={`rp-pg-btn${page === i + 1 ? ' rp-pg-btn--active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              {pages > 4 && <span className="rp-pg-dots">…</span>}
              {pages > 3 && (
                <button
                  className={`rp-pg-btn${page === pages ? ' rp-pg-btn--active' : ''}`}
                  onClick={() => setPage(pages)}
                >
                  {pages}
                </button>
              )}
              <button className="rp-pg-btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
              <select
                className="rp-pg-size"
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </SpacePage>
  );
};

/* Sort icon helper */
const SortIcon: React.FC<{ col: string; sortCol: string | null; sortAsc: boolean }> = ({ col, sortCol, sortAsc }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 4, opacity: sortCol === col ? 1 : 0.3, flexShrink: 0 }}>
    {sortCol === col && !sortAsc
      ? <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      : <path d="M2 6.5l3-3 3 3"  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    }
  </svg>
);

export default ReportesVacaciones;
