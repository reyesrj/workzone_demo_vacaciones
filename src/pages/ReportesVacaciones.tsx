import React, { useState, useMemo, useEffect } from 'react';
import { USERS, ROLE_LABELS } from '../data/users';
import type { User } from '../data/users';
import type { VacationRequest, RequestStatus } from '../data/vacationRequests';
import { STATUS_LABELS } from '../data/vacationRequests';

/* ------------------------------------------------------------------ */
/*  Constants & types                                                    */
/* ------------------------------------------------------------------ */

type ScopeType    = 'directo' | 'jerarquia' | 'organizacion';
type StatusFilter = 'all' | 'pendientes' | 'aprobadas' | 'rechazadas' | 'anulaciones';
type PeriodKey    = 'all' | 'year' | 'q1' | 'q2' | 'q3' | 'q4' | 'custom';

const SCOPE_LABELS: Record<ScopeType, string> = {
  directo:      'Mi equipo directo',
  jerarquia:    'Toda mi jerarquía',
  organizacion: 'Organización completa',
};

const SCOPE_ICONS: Record<ScopeType, string> = {
  directo:      '👥',
  jerarquia:    '🏢',
  organizacion: '🌐',
};

const SHORT_MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const LONG_DAYS    = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const YEAR         = new Date().getFullYear();

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: 'all',    label: 'Todo' },
  { value: 'year',   label: `${YEAR}` },
  { value: 'q1',     label: 'T1' },
  { value: 'q2',     label: 'T2' },
  { value: 'q3',     label: 'T3' },
  { value: 'q4',     label: 'T4' },
  { value: 'custom', label: 'Período…' },
];

const AVATAR_COLORS: Record<string, string> = {
  colaborador_standard: '#DA291C',
  colaborador_rotativo: '#e76500',
  jefe_aprobador:       '#188918',
  administrador_gh:     '#6b3fa0',
};

const STATUS_TAG: Record<RequestStatus, { label: string; cls: string }> = {
  creado:              { label: 'Creado',         cls: 'info'    },
  pendiente_jefe:      { label: 'Por aprobar',    cls: 'warning' },
  aprobado_jefe:       { label: 'Aprobado Jefe',  cls: 'info'    },
  pendiente_gh:        { label: 'Por aprobar GH', cls: 'warning' },
  aprobado:            { label: 'Aprobado',       cls: 'success' },
  rechazado:           { label: 'Rechazado',      cls: 'error'   },
  pendiente_anulacion: { label: 'Pend. anulac.',  cls: 'warning' },
  anulado:             { label: 'Anulado',        cls: 'error'   },
  anulacion_rechazada: { label: 'Anul. rechazada',cls: 'error'   },
};

const dotCls = (s: RequestStatus) => {
  if (['aprobado','aprobado_jefe'].includes(s)) return 'success';
  if (['rechazado','anulado','anulacion_rechazada'].includes(s)) return 'error';
  if (['pendiente_jefe','pendiente_gh','pendiente_anulacion'].includes(s)) return 'warning';
  return 'info';
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

const fmtShort = (d: string) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getDate()} ${SHORT_MONTHS[dt.getMonth()]}. ${dt.getFullYear()}`;
};
const fmtLong = (d: string) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return `${LONG_DAYS[dt.getDay()]} ${dt.getDate()} ${SHORT_MONTHS[dt.getMonth()]}. ${dt.getFullYear()}`;
};
const fmtRelTime = (date: string, time?: string) => {
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  const prefix    = date === today ? 'Hoy' : date === yesterday ? 'Ayer' : fmtShort(date);
  return time ? `${prefix}, ${time}` : prefix;
};
const countCalDays = (s: string, e: string) => {
  if (!s || !e) return 0;
  const a = new Date(s + 'T00:00:00'), b = new Date(e + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
};
const calcReturn = (end: string) => {
  if (!end) return '';
  const d = new Date(end + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};
const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

interface Props { user: User; requests: VacationRequest[] }

const PAGE_SIZE = 8;

const ReportesVacaciones: React.FC<Props> = ({ user, requests }) => {
  const isAdmin   = user.role === 'administrador_gh';
  const isManager = user.role === 'jefe_aprobador';

  /* ── Hierarchy ----------------------------------------------------- */
  const directReports = useMemo(
    () => USERS.filter(u => u.managerId === user.id), [user.id]);
  const indirectReports = useMemo(
    () => USERS.filter(u => u.managerId && directReports.some(d => d.id === u.managerId)),
    [directReports]);
  const hasIndirect = indirectReports.length > 0;

  const defaultScope: ScopeType = isAdmin ? 'organizacion' : hasIndirect ? 'jerarquia' : 'directo';
  const scopeOptions: ScopeType[] = isAdmin
    ? ['jerarquia', 'organizacion']
    : hasIndirect ? ['directo', 'jerarquia'] : [];

  /* ── State --------------------------------------------------------- */
  const [scope,          setScope]         = useState<ScopeType>(defaultScope);
  const [statusFilter,   setStatusFilter]  = useState<StatusFilter>('all');
  const [search,         setSearch]        = useState('');
  const [selectedId,     setSelectedId]    = useState<string | null>(null);
  const [filterDept,     setFilterDept]    = useState('');
  const [filterPeriod,   setFilterPeriod]  = useState<PeriodKey>('year');
  const [filterStart,    setFilterStart]   = useState('');
  const [filterEnd,      setFilterEnd]     = useState('');
  const [page,           setPage]          = useState(1);
  const [historyOpen,    setHistoryOpen]   = useState(false);
  const [showExportMenu, setShowExportMenu]= useState(false);

  /* ── Scoped users -------------------------------------------------- */
  const userMap    = useMemo(() => new Map(USERS.map(u => [u.id, u])), []);
  const scopedUsers = useMemo(() => {
    if (isAdmin) return USERS;
    if (scope === 'directo') return [user, ...directReports];
    return [user, ...directReports, ...indirectReports];
  }, [scope, isAdmin, user, directReports, indirectReports]);
  const scopedIds  = useMemo(() => new Set(scopedUsers.map(u => u.id)), [scopedUsers]);
  const deptOptions = useMemo(
    () => Array.from(new Set(scopedUsers.map(u => u.department))).sort(), [scopedUsers]);

  /* ── Period dates -------------------------------------------------- */
  const periodDates = useMemo((): { start: string; end: string } | null => {
    const y = YEAR;
    if (filterPeriod === 'year')   return { start: `${y}-01-01`, end: `${y}-12-31` };
    if (filterPeriod === 'q1')     return { start: `${y}-01-01`, end: `${y}-03-31` };
    if (filterPeriod === 'q2')     return { start: `${y}-04-01`, end: `${y}-06-30` };
    if (filterPeriod === 'q3')     return { start: `${y}-07-01`, end: `${y}-09-30` };
    if (filterPeriod === 'q4')     return { start: `${y}-10-01`, end: `${y}-12-31` };
    if (filterPeriod === 'custom' && filterStart && filterEnd)
      return { start: filterStart, end: filterEnd };
    return null;
  }, [filterPeriod, filterStart, filterEnd]);

  /* ── Filtered requests --------------------------------------------- */
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (!scopedIds.has(r.userId)) return false;
      if (filterDept) { if (userMap.get(r.userId)?.department !== filterDept) return false; }
      if (statusFilter === 'pendientes'  && !['pendiente_jefe','pendiente_gh'].includes(r.status)) return false;
      if (statusFilter === 'aprobadas'   && !['aprobado','aprobado_jefe'].includes(r.status)) return false;
      if (statusFilter === 'rechazadas'  && r.status !== 'rechazado') return false;
      if (statusFilter === 'anulaciones' && !['pendiente_anulacion','anulado','anulacion_rechazada'].includes(r.status)) return false;
      if (periodDates && (r.startDate > periodDates.end || r.endDate < periodDates.start)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!r.userName.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (b.history.at(-1)?.date ?? '').localeCompare(a.history.at(-1)?.date ?? ''));
  }, [requests, scopedIds, filterDept, statusFilter, periodDates, search, userMap]);

  /* ── Auto-select --------------------------------------------------- */
  useEffect(() => {
    setSelectedId(filteredRequests[0]?.id ?? null);
    setPage(1);
  }, [statusFilter, filterPeriod, filterDept, scope, search]);

  /* ── Counts & KPIs ------------------------------------------------- */
  const baseScopedReqs = useMemo(
    () => requests.filter(r => scopedIds.has(r.userId)), [requests, scopedIds]);

  const counts = useMemo(() => ({
    all:        baseScopedReqs.length,
    pendientes: baseScopedReqs.filter(r => ['pendiente_jefe','pendiente_gh'].includes(r.status)).length,
    aprobadas:  baseScopedReqs.filter(r => ['aprobado','aprobado_jefe'].includes(r.status)).length,
    rechazadas: baseScopedReqs.filter(r => r.status === 'rechazado').length,
    anulaciones:baseScopedReqs.filter(r => ['pendiente_anulacion','anulado','anulacion_rechazada'].includes(r.status)).length,
  }), [baseScopedReqs]);

  const kpis = useMemo(() => {
    const diasAprobados = baseScopedReqs
      .filter(r => ['aprobado','aprobado_jefe'].includes(r.status))
      .reduce((s, r) => s + r.days, 0);
    const saldoPromedio = scopedUsers.length
      ? Math.round(scopedUsers.reduce((s, u) => s + u.vacationBalance, 0) / scopedUsers.length)
      : 0;
    const usoPct = counts.all
      ? Math.round((counts.aprobadas / counts.all) * 100)
      : 0;
    const vencidosAlerta = scopedUsers.filter(u => u.vacationBalanceVencidas > 0).length;
    return { diasAprobados, saldoPromedio, usoPct, vencidosAlerta };
  }, [baseScopedReqs, scopedUsers, counts]);

  /* ── Pagination ---------------------------------------------------- */
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paged = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Selected request ---------------------------------------------- */
  const selected = selectedId
    ? (requests.find(r => r.id === selectedId) ?? filteredRequests[0] ?? null)
    : (filteredRequests[0] ?? null);

  const selUser  = selected ? userMap.get(selected.userId) : null;
  const calDays  = selected ? countCalDays(selected.startDate, selected.endDate) : 0;
  const retDate  = selected ? calcReturn(selected.endDate) : '';

  const rejectionEntry = useMemo(() => {
    if (!selected || selected.status !== 'rechazado') return null;
    return [...selected.history].reverse().find(h => h.status === 'rechazado') ?? null;
  }, [selected]);

  const getApprovalDate = (history: VacationRequest['history']) =>
    [...history].reverse().find(h => [
      'aprobado','aprobado_jefe','pendiente_gh','pendiente_anulacion',
      'rechazado','anulado','anulacion_rechazada',
    ].includes(h.status))?.date ?? '—';

  /* ── Risk insights (Manager / Admin) ------------------------------ */
  const showInsights = isAdmin || isManager;

  const riskMonths = useMemo(() => {
    if (!showInsights) return [];
    const monthMap = new Map<string, Set<string>>();
    baseScopedReqs
      .filter(r => ['aprobado','aprobado_jefe'].includes(r.status))
      .forEach(r => {
        const cur = new Date(r.startDate + 'T00:00:00');
        const end = new Date(r.endDate   + 'T00:00:00');
        while (cur <= end) {
          const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`;
          if (!monthMap.has(key)) monthMap.set(key, new Set());
          monthMap.get(key)!.add(r.userId);
          cur.setDate(cur.getDate() + 1);
        }
      });
    const threshold = Math.max(2, Math.floor(scopedUsers.length * 0.3));
    return Array.from(monthMap.entries())
      .filter(([, u]) => u.size >= threshold)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 5)
      .map(([month, u]) => {
        const [y, m] = month.split('-');
        return {
          label: `${SHORT_MONTHS[parseInt(m) - 1]}. ${y}`,
          count: u.size,
          pct:   Math.min(100, Math.round((u.size / scopedUsers.length) * 100)),
        };
      });
  }, [baseScopedReqs, scopedUsers, showInsights]);

  const balanceAlerts = useMemo(() => {
    if (!showInsights) return [];
    return scopedUsers
      .filter(u => u.vacationBalanceVencidas > 0)
      .sort((a, b) => b.vacationBalanceVencidas - a.vacationBalanceVencidas)
      .slice(0, 4);
  }, [scopedUsers, showInsights]);

  /* ── Export -------------------------------------------------------- */
  const downloadReport = (format: 'csv' | 'excel') => {
    const header = [
      'Codigo','Colaborador','Fecha Ingreso','Cargo','Responsable','Dirección',
      'SubDirección','Gerencia','Jefatura','Saldo Vacacional','Truncas',
      'Pendientes','Vencidas','Planificadas','Número Solicitud',
      'Fecha Aprobación','Fecha Inicio','Fecha Fin','Estado',
    ].map(h => `"${h}"`).join(',');
    const rows = filteredRequests.map(req => {
      const u = userMap.get(req.userId);
      return [
        u?.codigoEmpleado ?? '—', req.userName, u?.hireDate ?? '—',
        ROLE_LABELS[req.userRole], u?.approver ?? '—', u?.department ?? '—',
        u?.schedule ?? '—', ROLE_LABELS[u?.role ?? req.userRole],
        u?.approver ?? req.currentApprover ?? '—',
        u?.vacationBalance ?? 0, u?.vacationBalanceTruncas ?? 0,
        u?.vacationBalancePendientes ?? 0, u?.vacationBalanceVencidas ?? 0,
        req.days, req.id, getApprovalDate(req.history),
        req.startDate, req.endDate, STATUS_LABELS[req.status],
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
    });
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `reporte-vacaciones.${format === 'excel' ? 'xls' : 'csv'}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  /* ----------------------------------------------------------------- */
  /*  Render                                                             */
  /* ----------------------------------------------------------------- */
  return (
    <div className="rp-page">

      {/* ══════════ TOOLBAR ══════════════════════════════════════ */}
      <div className="rp-toolbar">
        <div className="rp-toolbar-left">
          <span className="rp-toolbar-title">Historial de solicitudes</span>

          {/* Scope selector — role-adaptive */}
          {scopeOptions.length > 0 ? (
            <div className="rp-scope-tabs">
              {scopeOptions.map(opt => (
                <button
                  key={opt}
                  className={`rp-scope-tab${scope === opt ? ' rp-scope-tab--active' : ''}`}
                  onClick={() => setScope(opt)}
                >
                  {SCOPE_ICONS[opt]} {SCOPE_LABELS[opt]}
                </button>
              ))}
            </div>
          ) : (
            <span className="rp-scope-chip">
              {SCOPE_ICONS[defaultScope]} {SCOPE_LABELS[defaultScope]}
            </span>
          )}
        </div>

        <div className="rp-toolbar-right">
          {/* Department filter — available to admin and managers with hierarchy */}
          {(isAdmin || hasIndirect) && (
            <select
              className="rp-dept-select"
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
            >
              <option value="">Todas las áreas</option>
              {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}

          {/* Search */}
          <div className="rp-search-box">
            <span className="rp-search-icon">🔍</span>
            <input
              className="rp-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar colaborador…"
            />
            {search && <button className="rp-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>

          {/* Export with dropdown */}
          <div className="rp-export-wrap">
            <button
              className="rp-export-btn"
              onClick={() => setShowExportMenu(v => !v)}
            >
              ⬇ Exportar
            </button>
            {showExportMenu && (
              <>
                <div className="rp-export-backdrop" onClick={() => setShowExportMenu(false)} />
                <div className="rp-export-menu">
                  <button onClick={() => downloadReport('csv')}>📄 Exportar CSV</button>
                  <button onClick={() => downloadReport('excel')}>📊 Exportar Excel (.xls)</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════ KPI STRIP ════════════════════════════════════ */}
      <div className="rp-kpi-strip">
        <div className="rp-kpi rp-kpi--total">
          <div className="rp-kpi-num">{counts.all}</div>
          <div className="rp-kpi-lbl">Total solicitudes</div>
        </div>
        <div className="rp-kpi rp-kpi--success">
          <div className="rp-kpi-num">{counts.aprobadas}</div>
          <div className="rp-kpi-lbl">Aprobadas</div>
        </div>
        <div className="rp-kpi rp-kpi--warning">
          <div className="rp-kpi-num">{counts.pendientes}</div>
          <div className="rp-kpi-lbl">Pendientes</div>
        </div>
        <div className="rp-kpi rp-kpi--error">
          <div className="rp-kpi-num">{counts.rechazadas}</div>
          <div className="rp-kpi-lbl">Rechazadas</div>
        </div>
        <div className="rp-kpi rp-kpi--days">
          <div className="rp-kpi-num">{kpis.diasAprobados}</div>
          <div className="rp-kpi-lbl">Días aprobados</div>
        </div>
        <div className="rp-kpi rp-kpi--balance">
          <div className="rp-kpi-num">{kpis.saldoPromedio}</div>
          <div className="rp-kpi-lbl">Saldo prom. (días)</div>
        </div>
        {kpis.vencidosAlerta > 0 && (
          <div className="rp-kpi rp-kpi--alert">
            <div className="rp-kpi-num">{kpis.vencidosAlerta}</div>
            <div className="rp-kpi-lbl">Con saldos vencidos</div>
          </div>
        )}
        <div className="rp-kpi rp-kpi--scope">
          <div className="rp-kpi-num">{scopedUsers.length}</div>
          <div className="rp-kpi-lbl">Colaboradores en scope</div>
        </div>
      </div>

      {/* ══════════ BODY: MASTER + DETAIL ════════════════════════ */}
      <div className="rp-body">

        {/* ════ MASTER ════════════════════════════════════════ */}
        <aside className="rp-master">

          {/* Period quick filter */}
          <div className="rp-period-strip">
            {PERIODS.map(p => (
              <button
                key={p.value}
                className={`rp-period-btn${filterPeriod === p.value ? ' rp-period-btn--active' : ''}`}
                onClick={() => setFilterPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {filterPeriod === 'custom' && (
            <div className="rp-custom-dates">
              <input
                type="date"
                className="rp-date-input"
                value={filterStart}
                onChange={e => setFilterStart(e.target.value)}
              />
              <span>–</span>
              <input
                type="date"
                className="rp-date-input"
                value={filterEnd}
                onChange={e => setFilterEnd(e.target.value)}
              />
            </div>
          )}

          {/* Status tabs */}
          <div className="rp-status-strip">
            {([
              { key: 'all',         label: 'Todas',       count: counts.all         },
              { key: 'pendientes',  label: 'Pendientes',  count: counts.pendientes  },
              { key: 'aprobadas',   label: 'Aprobadas',   count: counts.aprobadas   },
              { key: 'rechazadas',  label: 'Rechazadas',  count: counts.rechazadas  },
              { key: 'anulaciones', label: 'Anulaciones', count: counts.anulaciones },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                className={`rp-status-btn${statusFilter === key ? ' rp-status-btn--active' : ''}`}
                onClick={() => setStatusFilter(key)}
              >
                {label}
                {count > 0 && <span className="rp-status-badge">{count}</span>}
              </button>
            ))}
          </div>

          {/* Request list */}
          <div className="rp-list">
            {filteredRequests.length === 0 ? (
              <div className="rp-list-empty">
                <div className="rp-list-empty-icon">🔍</div>
                <p>Sin solicitudes para los filtros actuales</p>
              </div>
            ) : (
              paged.map(req => {
                const tag       = STATUS_TAG[req.status];
                const lastEntry = req.history.at(-1);
                const isActive  = (selected?.id ?? '') === req.id;
                const aColor    = AVATAR_COLORS[req.userRole] ?? '#DA291C';
                const itemPhoto = USERS.find(u => u.id === req.userId)?.photo;
                return (
                  <div
                    key={req.id}
                    className={`rp-item${isActive ? ' rp-item--active' : ''}`}
                    onClick={() => setSelectedId(req.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelectedId(req.id)}
                  >
                    <div className="rp-item-top">
                      <div className="rp-item-avatar" style={{ background: itemPhoto ? 'transparent' : aColor, padding: itemPhoto ? 0 : undefined, overflow: 'hidden' }}>
                        {itemPhoto
                          ? <img src={itemPhoto} alt={req.userName} className="rp-avatar-img" />
                          : getInitials(req.userName)}
                      </div>
                      <div className="rp-item-meta">
                        <span className="rp-item-name">{req.userName}</span>
                        <span className="rp-item-time">
                          {fmtRelTime(lastEntry?.date ?? '', lastEntry?.time)}
                        </span>
                      </div>
                    </div>
                    <div className="rp-item-dates">
                      {fmtShort(req.startDate)} – {fmtShort(req.endDate)}
                    </div>
                    <div className="rp-item-footer">
                      <span className={`ap-status-pill ap-status-pill--${tag.cls}`}>{tag.label}</span>
                      <span className="rp-item-days">{req.days} días</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {filteredRequests.length > PAGE_SIZE && (
            <div className="rp-pagination">
              <span className="rp-pagination-info">
                {Math.min((page-1)*PAGE_SIZE+1, filteredRequests.length)}–
                {Math.min(page*PAGE_SIZE, filteredRequests.length)} / {filteredRequests.length}
              </span>
              <div className="rp-page-btns">
                <button className="rp-page-arr" disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                  <button
                    key={i+1}
                    className={`rp-page-num${page===i+1 ? ' rp-page-num--active' : ''}`}
                    onClick={() => setPage(i+1)}
                  >{i+1}</button>
                ))}
                <button className="rp-page-arr" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>›</button>
              </div>
            </div>
          )}
        </aside>

        {/* ════ DETAIL ════════════════════════════════════════ */}
        <main className="rp-detail">

          {!selected ? (
            <div className="rp-detail-empty">
              <div className="rp-detail-empty-icon">📋</div>
              <p>Selecciona una solicitud para ver el detalle</p>
            </div>
          ) : (
            <>
              {/* Employee header */}
              <div className="rp-det-header">
                <div className="rp-det-emp">
                  <div
                    className="rp-det-avatar"
                    style={{ background: selUser?.photo ? 'transparent' : (AVATAR_COLORS[selected.userRole] ?? '#DA291C'), padding: selUser?.photo ? 0 : undefined, overflow: 'hidden' }}
                  >
                    {selUser?.photo
                      ? <img src={selUser.photo} alt={selected.userName} className="rp-avatar-img" />
                      : getInitials(selected.userName)}
                  </div>
                  <div>
                    <div className="rp-det-name">{selected.userName}</div>
                    <div className="rp-det-meta">
                      {selUser && <>Código: {selUser.codigoEmpleado}&nbsp;·&nbsp;</>}
                      Área: {selUser?.department ?? ROLE_LABELS[selected.userRole]}
                    </div>
                  </div>
                </div>
                <div className="rp-det-header-right">
                  <span className={`ap-status-pill ap-status-pill--${STATUS_TAG[selected.status].cls}`}>
                    {STATUS_TAG[selected.status].label}
                  </span>
                  <span className="rp-det-timestamp">
                    {fmtRelTime(selected.history.at(-1)?.date ?? '', selected.history.at(-1)?.time)}
                  </span>
                </div>
              </div>

              {/* Vacation card */}
              <div className="rp-vacation-card">
                <div className="rp-vc-left">
                  <div className="rp-vc-title-row">
                    <div className="rp-vc-cal-icon">📅</div>
                    <div>
                      <div className="rp-vc-subtitle">Solicitud de vacaciones</div>
                      <div className="rp-vc-dates">
                        {fmtLong(selected.startDate)} –<br />{fmtLong(selected.endDate)}
                      </div>
                    </div>
                  </div>
                  <div className="rp-vc-return">
                    Retorno al trabajo: <strong>{fmtLong(retDate)}</strong>
                  </div>
                </div>

                <div className="rp-vc-stats">
                  <div className="rp-vc-stat">
                    <span className="rp-vc-stat-icon">📊</span>
                    <div>
                      <span className="rp-vc-stat-lbl">Días solicitados</span>
                      <span className="rp-vc-stat-val">
                        {calDays} días calendario
                        <span className="rp-vc-stat-sub">({selected.days} días laborables)</span>
                      </span>
                    </div>
                  </div>
                  <div className="rp-vc-stat">
                    <span className="rp-vc-stat-icon">🏖️</span>
                    <div>
                      <span className="rp-vc-stat-lbl">Tipo de vacaciones</span>
                      <span className="rp-vc-stat-val">Días laborables</span>
                    </div>
                  </div>
                  {selUser && (
                    <div className="rp-vc-stat">
                      <span className="rp-vc-stat-icon">💼</span>
                      <div>
                        <span className="rp-vc-stat-lbl">Saldo disponible actual</span>
                        <span className="rp-vc-stat-val">{selUser.vacationBalance} días</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rp-vc-illustration" aria-hidden="true">🏖️</div>
              </div>

              {/* Comment + Status-specific panel */}
              <div className="rp-bottom-row">
                <div className="rp-panel">
                  <div className="rp-panel-title">💬 Comentario del colaborador</div>
                  <p className="rp-panel-body">
                    {selected.comments ?? (
                      <em style={{ color: 'var(--wz-text-muted)' }}>Sin comentarios</em>
                    )}
                  </p>
                </div>

                {selected.status === 'rechazado' && rejectionEntry ? (
                  <div className="rp-panel rp-panel--rejection">
                    <div className="rp-panel-title">🚫 Motivo de rechazo</div>
                    <p className="rp-panel-body">
                      {rejectionEntry.comment ?? 'Sin motivo registrado'}
                    </p>
                    <div className="rp-rejection-by">
                      Por {rejectionEntry.by}
                      {rejectionEntry.actorRole && ` · ${rejectionEntry.actorRole}`}
                    </div>
                  </div>
                ) : ['aprobado','aprobado_jefe'].includes(selected.status) ? (
                  <div className="rp-panel rp-panel--success">
                    <div className="rp-panel-title">✅ Solicitud aprobada</div>
                    <p className="rp-panel-body">
                      Aprobada el {fmtShort(getApprovalDate(selected.history))} por{' '}
                      {selected.history.find(h => ['aprobado','aprobado_jefe'].includes(h.status))?.by ?? '—'}
                    </p>
                  </div>
                ) : (
                  <div className="rp-panel rp-panel--info">
                    <div className="rp-panel-title">ℹ️ Estado actual</div>
                    <p className="rp-panel-body">
                      {STATUS_LABELS[selected.status]}
                      {selected.currentApprover && ` · En espera de ${selected.currentApprover}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Hint for rejected */}
              {selected.status === 'rechazado' && (
                <div className="rp-info-bar">
                  ℹ️ El colaborador puede crear una nueva solicitud para otras fechas
                </div>
              )}

              {/* Collapsible history */}
              <div className="rp-history-section">
                <button
                  className="rp-history-toggle"
                  onClick={() => setHistoryOpen(v => !v)}
                  aria-expanded={historyOpen}
                >
                  <span>🕐 Historial completo de la solicitud</span>
                  <span className={`rp-hist-arrow${historyOpen ? ' rp-hist-arrow--open' : ''}`}>›</span>
                </button>
                {historyOpen && (
                  <div className="wz-timeline rp-timeline">
                    {selected.history.map((step, i) => (
                      <div key={i} className="wz-tl-item">
                        <div className={`wz-tl-dot ${dotCls(step.status)}`} />
                        <div className="wz-tl-content">
                          <div className="wz-tl-header">
                            <span className="wz-tl-label">{step.label}</span>
                            <span className="wz-tl-date">{step.date}{step.time && ` · ${step.time}`}</span>
                          </div>
                          <div className="wz-tl-by">
                            {step.by}{step.actorRole && ` (${step.actorRole})`}
                          </div>
                          {step.comment && <div className="wz-tl-comment">"{step.comment}"</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Insights panel (Manager / Admin GH) ────────────────── */}
          {showInsights && (riskMonths.length > 0 || balanceAlerts.length > 0) && (
            <div className="rp-insights">
              <div className="rp-insights-header">
                <div className="rp-insights-title">📈 Análisis de impacto organizacional</div>
                <div className="rp-insights-sub">
                  Indicadores para la toma de decisiones · {SCOPE_LABELS[scope]}
                </div>
              </div>

              <div className="rp-insights-grid">
                {/* Risk periods */}
                {riskMonths.length > 0 && (
                  <div className="rp-insight-card">
                    <div className="rp-insight-card-title">⚠️ Meses con alta ausencia</div>
                    <div className="rp-insight-card-sub">
                      Períodos donde ≥30% del equipo estará ausente
                    </div>
                    <div className="rp-risk-months">
                      {riskMonths.map(({ label, count, pct }) => (
                        <div key={label} className="rp-risk-row">
                          <span className="rp-risk-label">{label}</span>
                          <div className="rp-risk-bar-track">
                            <div
                              className="rp-risk-bar-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="rp-risk-count">{count} pers. ({pct}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Balance alerts */}
                {balanceAlerts.length > 0 && (
                  <div className="rp-insight-card">
                    <div className="rp-insight-card-title">⏰ Saldos vencidos a gestionar</div>
                    <div className="rp-insight-card-sub">
                      Colaboradores con días de vacaciones vencidos
                    </div>
                    <div className="rp-balance-list">
                      {balanceAlerts.map(u => (
                        <div key={u.id} className="rp-balance-row">
                          <div
                            className="rp-balance-avatar"
                            style={{ background: u.photo ? 'transparent' : (AVATAR_COLORS[u.role] ?? '#DA291C'), padding: u.photo ? 0 : undefined, overflow: 'hidden' }}
                          >
                            {u.photo
                              ? <img src={u.photo} alt={u.name} className="rp-avatar-img" />
                              : u.initials}
                          </div>
                          <div className="rp-balance-info">
                            <span className="rp-balance-name">{u.name}</span>
                            <span className="rp-balance-dept">{u.department}</span>
                          </div>
                          <div className="rp-balance-badge">
                            {u.vacationBalanceVencidas}d
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Utilization summary */}
                <div className="rp-insight-card rp-insight-card--utilization">
                  <div className="rp-insight-card-title">📊 Resumen de utilización</div>
                  <div className="rp-insight-card-sub">Scope: {scopedUsers.length} colaboradores</div>
                  <div className="rp-util-stats">
                    <div className="rp-util-stat">
                      <span className="rp-util-num" style={{ color: '#188918' }}>{counts.aprobadas}</span>
                      <span className="rp-util-lbl">Aprobadas</span>
                    </div>
                    <div className="rp-util-stat">
                      <span className="rp-util-num" style={{ color: '#e76500' }}>{counts.pendientes}</span>
                      <span className="rp-util-lbl">Pendientes</span>
                    </div>
                    <div className="rp-util-stat">
                      <span className="rp-util-num" style={{ color: 'var(--wz-error)' }}>{counts.rechazadas}</span>
                      <span className="rp-util-lbl">Rechazadas</span>
                    </div>
                    <div className="rp-util-stat">
                      <span className="rp-util-num" style={{ color: 'var(--wz-primary)' }}>{kpis.diasAprobados}</span>
                      <span className="rp-util-lbl">Días aprobados</span>
                    </div>
                    <div className="rp-util-stat">
                      <span className="rp-util-num">{kpis.saldoPromedio}</span>
                      <span className="rp-util-lbl">Saldo promedio</span>
                    </div>
                    <div className="rp-util-stat">
                      <span className="rp-util-num" style={{ color: kpis.vencidosAlerta > 0 ? 'var(--wz-error)' : '#188918' }}>
                        {kpis.vencidosAlerta}
                      </span>
                      <span className="rp-util-lbl">Saldos vencidos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ReportesVacaciones;
