import React, { useState, useMemo, useEffect } from 'react';
import { ROLE_LABELS, USERS } from '../data/users';
import type { User } from '../data/users';
import type { VacationRequest, RequestStatus } from '../data/vacationRequests';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const SHORT_MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const LONG_DAYS    = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

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

const fmtRelTime = (date: string, time?: string): string => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const prefix = date === today ? 'Hoy' : date === yesterday ? 'Ayer' : fmtShort(date);
  return time ? `${prefix}, ${time}` : prefix;
};

const countCalDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const calcReturn = (end: string): string => {
  if (!end) return '';
  const d = new Date(end + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const AVATAR_COLORS: Record<string, string> = {
  colaborador_standard: '#DA291C',
  colaborador_rotativo: '#e76500',
  jefe_aprobador:       '#188918',
  administrador_gh:     '#6b3fa0',
};

type FilterTab  = 'pendientes' | 'aprobadas' | 'rechazadas' | 'anulaciones';
type MasterTab  = 'pendientes' | 'historial';

const STATUS_TAG: Record<RequestStatus, { label: string; cls: string }> = {
  creado:               { label: 'Creado',         cls: 'info'    },
  pendiente_jefe:       { label: 'Por aprobar',     cls: 'warning' },
  aprobado_jefe:        { label: 'Aprobado Jefe',   cls: 'info'    },
  pendiente_gh:         { label: 'Por aprobar GH',  cls: 'warning' },
  aprobado:             { label: 'Aprobado',        cls: 'success' },
  rechazado:            { label: 'Rechazado',       cls: 'error'   },
  pendiente_anulacion:  { label: 'Anulación pend.', cls: 'warning' },
  anulado:              { label: 'Anulado',         cls: 'error'   },
  anulacion_rechazada:  { label: 'Anul. rechazada', cls: 'error'   },
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface Props {
  user: User;
  requests: VacationRequest[];
  mode: 'pendientes' | 'anulaciones';
  onUpdateStatus: (id: string, status: RequestStatus, by: string, comment?: string) => void;
}

const PAGE_SIZE = 6;

const AprobacionVacaciones: React.FC<Props> = ({ user, requests, mode, onUpdateStatus }) => {
  const isAdmin = user.role === 'administrador_gh';

  const [activeFilter, setActiveFilter] = useState<FilterTab>(
    mode === 'anulaciones' ? 'anulaciones' : 'pendientes',
  );
  const [masterTab,    setMasterTab]    = useState<MasterTab>(
    mode === 'anulaciones' ? 'historial' : 'pendientes',
  );
  const [search,       setSearch]       = useState('');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [page,         setPage]         = useState(1);
  const [showAction,   setShowAction]   = useState<'approve' | 'reject' | null>(null);
  const [showBulkAction, setShowBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [comment,      setComment]      = useState('');
  const [bulkComment,  setBulkComment]  = useState('');
  const [commentErr,   setCommentErr]   = useState('');
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const [mobileView,   setMobileView]   = useState<'master' | 'detail'>('master');

  /* ---- sync filter when mode prop changes ------------------------- */
  useEffect(() => {
    if (mode === 'anulaciones') {
      setActiveFilter('anulaciones');
      setMasterTab('historial');
    } else {
      setActiveFilter('pendientes');
      setMasterTab('pendientes');
    }
  }, [mode]);

  /* ---- counts per tab --------------------------------------------- */
  const counts = useMemo(() => ({
    pendientes: requests.filter((r) =>
      isAdmin ? r.status === 'pendiente_gh' : r.status === 'pendiente_jefe',
    ).length,
    aprobadas: requests.filter((r) =>
      ['aprobado', 'aprobado_jefe'].includes(r.status),
    ).length,
    rechazadas: requests.filter((r) => r.status === 'rechazado').length,
    anulaciones: requests.filter((r) =>
      ['pendiente_anulacion', 'anulado', 'anulacion_rechazada'].includes(r.status),
    ).length,
  }), [requests, isAdmin]);

  /* ---- filtered list ---------------------------------------------- */
  const filtered = useMemo(() => {
    let base: VacationRequest[];
    if (masterTab === 'pendientes') {
      base = requests.filter((r) =>
        isAdmin
          ? ['pendiente_gh', 'pendiente_anulacion'].includes(r.status)
          : ['pendiente_jefe', 'pendiente_anulacion'].includes(r.status),
      );
    } else {
      base = requests.filter((r) =>
        ['aprobado', 'aprobado_jefe', 'rechazado', 'anulado', 'anulacion_rechazada'].includes(r.status),
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(
        (r) => r.userName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
      );
    }
    return [...base].sort((a, b) => {
      const aDate = a.history[a.history.length - 1]?.date ?? '';
      const bDate = b.history[b.history.length - 1]?.date ?? '';
      return bDate.localeCompare(aDate);
    });
  }, [requests, masterTab, search, isAdmin]);

  const pendingCount  = useMemo(() => requests.filter((r) =>
    isAdmin
      ? ['pendiente_gh','pendiente_anulacion'].includes(r.status)
      : ['pendiente_jefe','pendiente_anulacion'].includes(r.status)
  ).length, [requests, isAdmin]);

  /* ---- auto-select first on filter/search change ------------------ */
  useEffect(() => {
    setSelectedId(filtered[0]?.id ?? null);
    setSelectedIds(new Set());
    setPage(1);
  }, [masterTab, search]);

  /* ---- select all ------------------------------------------------- */
  const allPageSelected = paged => paged.length > 0 && paged.every(r => selectedIds.has(r.id));
  const someSelected    = selectedIds.size > 0;

  const toggleSelectAll = (pagedItems: VacationRequest[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected(pagedItems)) {
        pagedItems.forEach(r => next.delete(r.id));
      } else {
        pagedItems.forEach(r => next.add(r.id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ---- bulk approve/reject ---------------------------------------- */
  const handleBulkApprove = () => {
    const newStatus: RequestStatus = isAdmin ? 'aprobado' : 'aprobado_jefe';
    selectedIds.forEach(id => onUpdateStatus(id, newStatus, user.name, bulkComment.trim() || undefined));
    setSelectedIds(new Set()); setShowBulkAction(null); setBulkComment('');
  };

  const handleBulkReject = () => {
    if (!bulkComment.trim()) return;
    selectedIds.forEach(id => onUpdateStatus(id, 'rechazado', user.name, bulkComment.trim()));
    setSelectedIds(new Set()); setShowBulkAction(null); setBulkComment('');
  };

  /* ---- pagination -------------------------------------------------- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ---- selected request ------------------------------------------- */
  const selected = selectedId
    ? (requests.find((r) => r.id === selectedId) ?? filtered[0] ?? null)
    : (filtered[0] ?? null);

  const collaborator = selected ? USERS.find((u) => u.id === selected.userId) : null;
  const calDays  = selected ? countCalDays(selected.startDate, selected.endDate) : 0;
  const workDays = selected?.days ?? 0;
  const retDate  = selected ? calcReturn(selected.endDate) : '';

  const isPending = selected
    ? ['pendiente_jefe', 'pendiente_gh', 'pendiente_anulacion'].includes(selected.status)
    : false;
  const isAnnulMode = selected?.status === 'pendiente_anulacion';

  /* ---- team impact ------------------------------------------------ */
  const teamImpact = useMemo(() => {
    if (!selected) return [];
    return requests.filter(
      (r) =>
        r.id !== selected.id &&
        ['aprobado', 'aprobado_jefe'].includes(r.status) &&
        r.startDate <= selected.endDate &&
        r.endDate >= selected.startDate,
    );
  }, [selected, requests]);

  const isShortPeriod = selected != null && workDays > 0 && workDays <= 2;

  /* ---- team impact warning (independent from short-period alert) -- */
  const teamImpactWarning = useMemo(() => {
    if (!selected || teamImpact.length < 2) return null;
    return `Hay ${teamImpact.length} personas del equipo ausentes en las mismas fechas. Revise el impacto operacional antes de aprobar.`;
  }, [selected, teamImpact]);

  /* ---- action handlers -------------------------------------------- */
  const handleApprove = () => {
    if (!selected) return;
    let newStatus: RequestStatus;
    if (isAnnulMode)     newStatus = 'anulado';
    else if (isAdmin)    newStatus = 'aprobado';
    else                 newStatus = 'aprobado_jefe';
    onUpdateStatus(selected.id, newStatus, user.name, comment.trim() || undefined);
    setShowAction(null); setComment(''); setCommentErr('');
  };

  const handleReject = () => {
    if (!selected) return;
    if (!comment.trim()) { setCommentErr('El motivo del rechazo es obligatorio.'); return; }
    const newStatus: RequestStatus = isAnnulMode ? 'anulacion_rechazada' : 'rechazado';
    onUpdateStatus(selected.id, newStatus, user.name, comment.trim());
    setShowAction(null); setComment(''); setCommentErr('');
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className={`ap-page ap-page--mob-${mobileView}`}>

      {/* ═══════════════ MASTER — left panel ══════════════════════ */}
      <aside className="ap-master">

        {/* ── Mobile-only top bar ── */}
        <div className="ap-mob-header">
          <button className="ap-mob-menu-btn" aria-label="Menú">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="ap-mob-header-title">Aprobación de vacaciones</span>
          <button className="ap-mob-filter-top-btn" aria-label="Filtrar"
            onClick={() => setFiltersOpen(o => !o)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 5h12M6 9h6M8 13h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Tabs: Pendientes / Historial ── */}
        <div className="ap-master-tabs">
          <button
            className={`ap-master-tab${masterTab === 'pendientes' ? ' ap-master-tab--active' : ''}`}
            onClick={() => setMasterTab('pendientes')}
          >
            Pendientes
            {pendingCount > 0 && <span className="ap-master-tab-badge">{pendingCount}</span>}
          </button>
          <button
            className={`ap-master-tab${masterTab === 'historial' ? ' ap-master-tab--active' : ''}`}
            onClick={() => setMasterTab('historial')}
          >
            Historial
          </button>
        </div>

        {/* ── Mobile-only: Delegación row ── */}
        <div className="ap-mob-delegation-row">
          <button className="ap-delegation-btn ap-mob-delegation-btn">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1 13c0-2.76 2.24-5 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="12" cy="9" r="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9 14c0-1.66 1.34-3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M14.5 7.5l-2-2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Delegación
          </button>
        </div>

        {/* ── Toolbar: Filtros + Search + Settings ── */}
        <div className="ap-master-toolbar">
          <button
            className={`ap-filter-btn${filtersOpen ? ' ap-filter-btn--active' : ''}`}
            onClick={() => setFiltersOpen(o => !o)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M1 3h14M3 8h10M5 13h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            Filtros
            <svg className={`ap-filter-chevron${filtersOpen ? ' ap-filter-chevron--open':''}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="ap-search-wrap">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="ap-search-svg">
              <circle cx="6.5" cy="6.5" r="5" stroke="#888" strokeWidth="1.4"/>
              <path d="M11 11l3.5 3.5" stroke="#888" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              className="ap-search-new"
              placeholder="Buscar por nombre o código"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button className="ap-search-x" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          <button className="ap-settings-btn" title="Opciones">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Batch action bar ── */}
        {someSelected && masterTab === 'pendientes' && (
          <div className="ap-batch-bar">
            <span className="ap-batch-count">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {selectedIds.size} seleccionada{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="ap-batch-actions">
              <button className="ap-batch-approve" onClick={() => setShowBulkAction('approve')}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Aprobar
              </button>
              <button className="ap-batch-reject" onClick={() => setShowBulkAction('reject')}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                Rechazar
              </button>
            </div>
          </div>
        )}

        {/* ── Select all ── */}
        {filtered.length > 0 && masterTab === 'pendientes' && (
          <div className="ap-select-all-row">
            <label className="ap-select-all-label">
              <input
                type="checkbox"
                className="ap-checkbox"
                checked={allPageSelected(paged)}
                onChange={() => toggleSelectAll(paged)}
              />
              <span>Seleccionar todas ({filtered.length})</span>
            </label>
          </div>
        )}

        {/* ── List ── */}
        <div className="ap-list">
          {filtered.length === 0 ? (
            <div className="ap-list-empty">
              <div className="ap-list-empty-icon">📭</div>
              <p>Sin solicitudes en esta categoría</p>
            </div>
          ) : (
            paged.map(req => {
              const lastEntry   = req.history[req.history.length - 1];
              const tag         = STATUS_TAG[req.status];
              const avatarColor = AVATAR_COLORS[req.userRole] ?? '#DA291C';
              const isActive    = (selected?.id ?? '') === req.id;
              const isChecked   = selectedIds.has(req.id);
              const itemPhoto   = USERS.find(u => u.id === req.userId)?.photo;
              const isPend      = ['pendiente_jefe','pendiente_gh','pendiente_anulacion'].includes(req.status);

              return (
                <div
                  key={req.id}
                  className={`ap-list-item${isActive ? ' ap-list-item--active' : ''}${isChecked ? ' ap-list-item--checked' : ''}`}
                  onClick={() => { setSelectedId(req.id); setMobileView('detail'); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && (setSelectedId(req.id), setMobileView('detail'))}
                >
                  {/* Checkbox – only for pendientes tab */}
                  {masterTab === 'pendientes' && isPend && (
                    <label
                      className="ap-item-check-wrap"
                      onClick={e => { e.stopPropagation(); toggleSelectOne(req.id); }}
                    >
                      <input
                        type="checkbox"
                        className="ap-checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectOne(req.id)}
                      />
                    </label>
                  )}

                  {/* Avatar */}
                  <div
                    className="ap-list-avatar"
                    style={itemPhoto ? { background: 'transparent', padding: 0, overflow: 'hidden' } : { background: avatarColor }}
                  >
                    {itemPhoto
                      ? <img src={`${import.meta.env.BASE_URL}${itemPhoto}`} alt={req.userName} className="ap-avatar-img"/>
                      : getInitials(req.userName)}
                  </div>

                  {/* Main info */}
                  <div className="ap-list-body">
                    <div className="ap-list-name">{req.userName}</div>
                    <div className="ap-list-id">{req.id}</div>
                    <div className="ap-list-dates">
                      {fmtShort(req.startDate)} – {fmtShort(req.endDate)}
                      <span className="ap-list-days-badge">({req.days} {req.days === 1 ? 'día' : 'días'})</span>
                    </div>
                  </div>

                  {/* Right: status + time */}
                  <div className="ap-list-right">
                    <div className="ap-list-status">
                      <span className={`ap-status-dot ap-status-dot--${tag.cls}`}/>
                      <span className="ap-list-status-lbl">{tag.label}</span>
                    </div>
                    <div className="ap-list-time">
                      {fmtRelTime(lastEntry?.date ?? '', lastEntry?.time)}
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ap-list-arrow">
                    <path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              );
            })
          )}
        </div>

        {/* ── Pagination ── */}
        {filtered.length > 0 && (
          <div className="ap-pagination">
            <span className="ap-pagination-info">
              Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)} a {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} solicitudes
            </span>
            <div className="ap-page-btns">
              <button className="ap-page-arrow" disabled={page === 1}            onClick={() => setPage(1)}>«</button>
              <button className="ap-page-arrow" disabled={page === 1}            onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => (
                <button
                  key={i}
                  className={`ap-page-num${page === i + 1 ? ' ap-page-num--active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              {totalPages > 4 && <span className="ap-pg-dots">…</span>}
              {totalPages > 3 && (
                <button
                  className={`ap-page-num${page === totalPages ? ' ap-page-num--active' : ''}`}
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </button>
              )}
              <button className="ap-page-arrow" disabled={page === totalPages}  onClick={() => setPage(p => p + 1)}>›</button>
              <button className="ap-page-arrow" disabled={page === totalPages}  onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        )}
      </aside>

      {/* ═══════════════ DETAIL — right panel ═════════════════════ */}
      <div className="ap-detail-column">
      <main className="ap-detail">
        {!selected ? (
          <div className="ap-detail-empty">
            <div className="ap-detail-empty-icon">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="27" fill="#FFF5F5" stroke="#FFCDD2" strokeWidth="1.5"/>
                <rect x="16" y="14" width="24" height="28" rx="3" stroke="#E53935" strokeWidth="1.5" fill="#fff"/>
                <path d="M21 22h14M21 27h14M21 32h8" stroke="#E53935" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <p>Selecciona una solicitud para ver el detalle</p>
          </div>
        ) : (() => {
          const isRotativo   = selected.userRole === 'colaborador_rotativo';
          const hasVencidas  = (collaborator?.vacationBalanceVencidas ?? 0) > 0;
          const tag          = STATUS_TAG[selected.status];

          /* ── Approval flow data ── */
          const lvl1User  = collaborator?.managerId ? USERS.find(u => u.id === collaborator!.managerId) : null;
          const lvl2User  = isRotativo ? USERS.find(u => u.role === 'administrador_gh') : null;

          const lvl1Done  = ['aprobado_jefe','pendiente_gh','aprobado','rechazado'].includes(selected.status);
          const lvl1Stat  = selected.status === 'rechazado' && !['pendiente_gh','aprobado'].includes(selected.status)
            ? 'rechazado'
            : lvl1Done ? 'aprobado' : 'pendiente';
          const lvl2Stat  = selected.status === 'aprobado' ? 'aprobado'
            : selected.status === 'rechazado' && ['pendiente_gh'].includes(selected.status) ? 'rechazado'
            : 'pendiente';

          const lvl1Entry = selected.history.find(h => ['aprobado_jefe','aprobado'].includes(h.status as string));
          const lvl2Entry = selected.history.find(h => h.status === 'aprobado' && isRotativo);

          const vacType = isRotativo ? 'Vacaciones días rotativos' : 'Vacaciones días útiles';

          return (
            <>
              {/* ── Top bar: título + Delegación ── */}
              <div className="ap-det-topbar">
                <button
                  className="ap-mob-back-btn"
                  aria-label="Volver a la lista"
                  onClick={() => setMobileView('master')}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M11 14l-6-5 6-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="ap-det-topbar-title">Detalle de la solicitud</span>
                <button className="ap-delegation-btn">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M1 13c0-2.76 2.24-5 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    <circle cx="12" cy="9" r="2" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M9 14c0-1.66 1.34-3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    <path d="M14.5 7.5l-2-2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Delegación
                </button>
              </div>

              {/* ── Employee header ── */}
              <div className="ap-det-emp-card">
                <div
                  className="ap-det-emp-avatar"
                  style={collaborator?.photo ? { background: 'transparent', padding: 0, overflow: 'hidden' } : { background: AVATAR_COLORS[selected.userRole] ?? '#DA291C' }}
                >
                  {collaborator?.photo
                    ? <img src={`${import.meta.env.BASE_URL}${collaborator.photo}`} alt={selected.userName} className="ap-avatar-img"/>
                    : getInitials(selected.userName)}
                </div>
                <div className="ap-det-emp-body">
                  <div className="ap-det-emp-name-row">
                    <span className="ap-det-emp-name">{selected.userName}</span>
                    <span className={`ap-det-status-pill ap-det-status-pill--${tag.cls}`}>{tag.label}</span>
                  </div>
                  <div className="ap-det-emp-meta">
                    <span>Código: <strong>{collaborator?.codigoEmpleado ?? selected.id}</strong></span>
                    <span className="ap-det-emp-sep">·</span>
                    <span>Área: <strong>{collaborator?.department ?? ROLE_LABELS[selected.userRole]}</strong></span>
                  </div>
                </div>
              </div>

              {/* ── Main vacation info card ── */}
              <div className="ap-vc2">
                {/* Left: dates */}
                <div className="ap-vc2-left">
                  <div className="ap-vc2-dates-label">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1.5" y="3" width="13" height="11.5" rx="1.5" stroke="#888" strokeWidth="1.2"/>
                      <path d="M1.5 6.5h13" stroke="#888" strokeWidth="1.1"/>
                      <rect x="4.5" y="1" width="1.4" height="4" rx="0.7" fill="#888"/>
                      <rect x="10.1" y="1" width="1.4" height="4" rx="0.7" fill="#888"/>
                    </svg>
                    Fechas solicitadas
                  </div>
                  <div className="ap-vc2-dates">
                    {fmtLong(selected.startDate)} –<br/>
                    {fmtLong(selected.endDate)}
                    <span className="ap-vc2-days-badge"> ({calDays} {calDays === 1 ? 'día' : 'días'})</span>
                  </div>
                  <div className="ap-vc2-return">
                    <span className="ap-vc2-return-lbl">Retorna al trabajo:</span>
                    <strong>{fmtLong(retDate)}</strong>
                  </div>
                </div>

                {/* Right: stats */}
                <div className="ap-vc2-stats">
                  <div className="ap-vc2-stat">
                    <div className="ap-vc2-stat-ico ap-vc2-ico--gray">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v6l3.5 2" stroke="#666" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="7" cy="7" r="6" stroke="#666" strokeWidth="1.2"/>
                      </svg>
                    </div>
                    <div>
                      <div className="ap-vc2-stat-lbl">Tipo de tiempo</div>
                      <div className="ap-vc2-stat-val">{vacType}</div>
                    </div>
                  </div>
                  <div className="ap-vc2-stat">
                    <div className="ap-vc2-stat-ico ap-vc2-ico--gray">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="2.5" width="12" height="10" rx="1.5" stroke="#666" strokeWidth="1.2"/>
                        <path d="M1 5.5h12" stroke="#666" strokeWidth="1"/>
                        <rect x="4" y="1" width="1.2" height="3" rx="0.6" fill="#666"/>
                        <rect x="8.8" y="1" width="1.2" height="3" rx="0.6" fill="#666"/>
                      </svg>
                    </div>
                    <div>
                      <div className="ap-vc2-stat-lbl">Días solicitados</div>
                      <div className="ap-vc2-stat-val">{workDays} días (días útiles)</div>
                    </div>
                  </div>
                  <div className="ap-vc2-stat">
                    <div className="ap-vc2-stat-ico ap-vc2-ico--green">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" fill="#E8F5E9" stroke="#43A047" strokeWidth="1.2"/>
                        <path d="M4 7l2.5 2.5L10 4.5" stroke="#43A047" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <div className="ap-vc2-stat-lbl">Saldo disponible actual</div>
                      <div className="ap-vc2-stat-val ap-vc2-stat-val--green">{collaborator?.vacationBalance ?? '—'} días</div>
                    </div>
                  </div>
                  <div className="ap-vc2-stat">
                    <div className="ap-vc2-stat-ico ap-vc2-ico--gray">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" stroke="#666" strokeWidth="1.2"/>
                        <rect x="6.3" y="4" width="1.4" height="4.5" rx="0.7" fill="#666"/>
                        <rect x="6.3" y="9.5" width="1.4" height="1.4" rx="0.7" fill="#666"/>
                      </svg>
                    </div>
                    <div>
                      <div className="ap-vc2-stat-lbl">Días con esta solicitud</div>
                      <div className="ap-vc2-stat-val">{workDays} días laborables</div>
                    </div>
                  </div>
                </div>

                {/* Beach illustration */}
                <div className="ap-vc2-illustration" aria-hidden="true">
                  <img
                    src={`${import.meta.env.BASE_URL}beach-scene.png`}
                    alt="Vacaciones"
                    className="ap-vc2-beach-img"
                  />
                </div>
              </div>

              {/* ── Alerts ── */}

              {/* Rotativo alert */}
              {isRotativo && (
                <div className="ap-det-alert ap-det-alert--orange">
                  <div className="ap-det-alert-left">
                    <span className="ap-det-alert-ico">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2L1.5 14h13L8 2Z" fill="#FFF3E0" stroke="#E65100" strokeWidth="1.2" strokeLinejoin="round"/>
                        <rect x="7.3" y="7" width="1.4" height="4" rx="0.7" fill="#E65100"/>
                        <circle cx="8" cy="12.5" r="0.8" fill="#E65100"/>
                      </svg>
                    </span>
                    <div>
                      <div className="ap-det-alert-title">Horario rotativo detectado</div>
                      <div className="ap-det-alert-tags">
                        <span className="ap-det-tag">Turno: Noche</span>
                        <span className="ap-det-tag">Patrón: 4×2</span>
                      </div>
                    </div>
                  </div>
                  <div className="ap-det-alert-right">
                    Las fechas solicitadas han sido validadas según el horario rotativo.
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{marginLeft:6,flexShrink:0,verticalAlign:'middle'}}>
                      <circle cx="7" cy="7" r="6" stroke="#E65100" strokeWidth="1.2"/>
                      <rect x="6.3" y="6" width="1.4" height="4.5" rx="0.7" fill="#E65100"/>
                      <circle cx="7" cy="4.5" r="0.8" fill="#E65100"/>
                    </svg>
                  </div>
                </div>
              )}

              {/* Vencidas alert */}
              {hasVencidas && (
                <div className="ap-det-alert ap-det-alert--red">
                  <span className="ap-det-alert-ico">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" fill="#FFEBEE" stroke="#C62828" strokeWidth="1.2"/>
                      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#C62828" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <div>
                    <div className="ap-det-alert-title">La solicitud incluye fechas vencidas</div>
                    <div className="ap-det-alert-desc">
                      {collaborator?.vacationBalanceVencidas ?? 0} día(s) solicitado(s) está(n) fuera del plazo permitido.
                    </div>
                  </div>
                </div>
              )}

              {/* Short period suggestion */}
              {isShortPeriod && !isRotativo && (
                <div className="ap-det-alert ap-det-alert--orange">
                  <span className="ap-det-alert-ico">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2L1.5 14h13L8 2Z" fill="#FFF3E0" stroke="#E65100" strokeWidth="1.2" strokeLinejoin="round"/>
                      <rect x="7.3" y="7" width="1.4" height="4" rx="0.7" fill="#E65100"/>
                      <circle cx="8" cy="12.5" r="0.8" fill="#E65100"/>
                    </svg>
                  </span>
                  <div className="ap-det-alert-body">
                    <div className="ap-det-alert-title">
                      Sugerencia: período muy corto ({workDays} {workDays === 1 ? 'día laborable' : 'días laborables'})
                    </div>
                    <div className="ap-det-alert-desc">Recomendación: Evaluar si el colaborador requiere más días para su descanso.</div>
                  </div>
                  <button className="ap-det-alert-link">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" stroke="#E65100" strokeWidth="1.2"/>
                      <rect x="6.3" y="6" width="1.4" height="4.5" rx="0.7" fill="#E65100"/>
                      <circle cx="7" cy="4.5" r="0.8" fill="#E65100"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Team impact warning */}
              {teamImpactWarning && (
                <div className="ap-det-alert ap-det-alert--orange">
                  <span className="ap-det-alert-ico">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2L1.5 14h13L8 2Z" fill="#FFF3E0" stroke="#E65100" strokeWidth="1.2" strokeLinejoin="round"/>
                      <rect x="7.3" y="7" width="1.4" height="4" rx="0.7" fill="#E65100"/>
                      <circle cx="8" cy="12.5" r="0.8" fill="#E65100"/>
                    </svg>
                  </span>
                  <div className="ap-det-alert-title">Atención: {teamImpactWarning}</div>
                </div>
              )}

              {/* ── Bottom 2-column: Comment + Approval flow ── */}
              <div className="ap-det-bottom-row">

                {/* Comment */}
                <div className="ap-det-comment-card">
                  <div className="ap-det-section-title">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2h10a1 1 0 011 1v6a1 1 0 01-1 1H8l-3 3V10H2a1 1 0 01-1-1V3a1 1 0 011-1Z" stroke="#555" strokeWidth="1.2" fill="#f5f5f5"/>
                    </svg>
                    Comentario del colaborador
                  </div>
                  <div className="ap-det-comment-box">
                    {selected.comments
                      ? <p className="ap-det-comment-text">{selected.comments}</p>
                      : <p className="ap-det-comment-empty">Sin comentarios adicionales.</p>}
                  </div>
                </div>

                {/* Approval flow */}
                <div className="ap-det-flow-card">
                  <div className="ap-det-section-title">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7h10M9 4l3 3-3 3" stroke="#555" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Flujo de aprobación
                  </div>
                  <div className="ap-flow-steps">
                    {/* Level 1 */}
                    <div className="ap-flow-step">
                      <div className="ap-flow-level-lbl">Nivel 1</div>
                      <div
                        className="ap-flow-avatar"
                        style={lvl1User?.photo ? { background: 'transparent', padding: 0, overflow: 'hidden' } : { background: '#188918' }}
                      >
                        {lvl1User?.photo
                          ? <img src={`${import.meta.env.BASE_URL}${lvl1User.photo}`} alt={lvl1User.name} className="ap-avatar-img"/>
                          : getInitials(lvl1User?.name ?? collaborator?.approver ?? 'JA')}
                      </div>
                      <div className="ap-flow-name">{lvl1User?.name ?? collaborator?.approver ?? '—'}</div>
                      <div className="ap-flow-role">Jefe Directo</div>
                      <div className={`ap-flow-status ap-flow-status--${lvl1Stat}`}>
                        {lvl1Stat === 'aprobado' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5.5" fill="#E8F5E9" stroke="#43A047" strokeWidth="1"/>
                            <path d="M3 6l2.5 2.5L9 4" stroke="#43A047" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {lvl1Stat === 'aprobado' ? 'Aprobado' : lvl1Stat === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                      </div>
                      {lvl1Entry && (
                        <div className="ap-flow-date">{fmtShort(lvl1Entry.date)}{lvl1Entry.time ? `, ${lvl1Entry.time}` : ''}</div>
                      )}
                    </div>

                    {/* Arrow between levels */}
                    {isRotativo && (
                      <>
                        <div className="ap-flow-arrow">
                          <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
                            <path d="M0 8h24M20 3l5 5-5 5" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>

                        {/* Level 2 — only for rotativo */}
                        <div className="ap-flow-step">
                          <div className="ap-flow-level-lbl">Nivel 2</div>
                          <div
                            className="ap-flow-avatar"
                            style={lvl2User?.photo ? { background: 'transparent', padding: 0, overflow: 'hidden' } : { background: '#6b3fa0' }}
                          >
                            {lvl2User?.photo
                              ? <img src={`${import.meta.env.BASE_URL}${lvl2User.photo}`} alt={lvl2User.name} className="ap-avatar-img"/>
                              : getInitials(lvl2User?.name ?? 'GH')}
                          </div>
                          <div className="ap-flow-name">{lvl2User?.name ?? 'Administrador GH'}</div>
                          <div className="ap-flow-role">Gerente GH</div>
                          <div className={`ap-flow-status ap-flow-status--${lvl2Stat}`}>
                            {lvl2Stat === 'aprobado' && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <circle cx="6" cy="6" r="5.5" fill="#E8F5E9" stroke="#43A047" strokeWidth="1"/>
                                <path d="M3 6l2.5 2.5L9 4" stroke="#43A047" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                            {lvl2Stat === 'aprobado' ? 'Aprobado' : lvl2Stat === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                          </div>
                          {lvl2Entry && (
                            <div className="ap-flow-date">{fmtShort(lvl2Entry.date)}{lvl2Entry.time ? `, ${lvl2Entry.time}` : ''}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>
            </>
          );
        })()}
      </main>

      {isPending && selected && (
        <div className="ap-bottom-bar" role="toolbar" aria-label="Acciones de aprobación">
          <div className="ap-bottom-info">
            <span className="ap-bottom-info-icon" aria-hidden="true">ℹ️</span>
            <span>
              Revisa el detalle de la solicitud de <strong>{selected.userName}</strong> antes de tomar una decisión.
              El colaborador será notificado por correo y en el centro de tareas.
            </span>
          </div>
          <div className="ap-bottom-actions">
            <button type="button" className="ap-btn-reject"
              onClick={() => { setShowAction('reject'); setComment(''); setCommentErr(''); }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              {isAnnulMode ? 'Rechazar anulación' : 'Rechazar'}
            </button>
            <button type="button" className="ap-btn-approve"
              onClick={() => { setShowAction('approve'); setComment(''); setCommentErr(''); }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3.5 3.5L10 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isAnnulMode ? 'Confirmar anulación' : 'Aprobar'}
            </button>
          </div>
        </div>
      )}
      </div>

      {/* ═══════════════ MOBILE NAV BAR ═══════════════════════════ */}
      <nav className="ap-mob-nav" aria-label="Navegación aprobación">

        {/* Pendientes */}
        <button
          className={`ap-mob-nav-btn${masterTab === 'pendientes' ? ' ap-mob-nav-btn--active' : ''}`}
          onClick={() => { setMasterTab('pendientes'); setMobileView('master'); }}
        >
          <span className="ap-mob-nav-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a6 6 0 016 6c0 3.5 1.5 5 1.5 5H2.5S4 11.5 4 8a6 6 0 016-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 16a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {counts.pendientes > 0 && (
              <span className="ap-mob-nav-badge">{counts.pendientes}</span>
            )}
          </span>
          <span className="ap-mob-nav-label">Pendientes</span>
        </button>

        {/* Historial */}
        <button
          className={`ap-mob-nav-btn${masterTab === 'historial' ? ' ap-mob-nav-btn--active' : ''}`}
          onClick={() => { setMasterTab('historial'); setMobileView('master'); }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 6.5V10l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="ap-mob-nav-label">Historial</span>
        </button>

        {/* FAB — Acción principal */}
        <div className="ap-mob-fab-wrap">
          <button
            className={`ap-mob-fab${!isPending ? ' ap-mob-fab--disabled' : ''}`}
            disabled={!isPending}
            onClick={() => {
              if (isPending) { setShowAction('approve'); setComment(''); setCommentErr(''); }
            }}
            aria-label={isPending ? 'Aprobar solicitud' : 'Sin acción disponible'}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 11l5.5 5.5L18 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Delegación */}
        <button className="ap-mob-nav-btn">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M1.5 16c0-3.03 2.46-5.5 5.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="14.5" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 17.5c0-1.93 1.57-3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M17.5 9l-2.5-2.5-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="ap-mob-nav-label">Delegación</span>
        </button>

        {/* Perfil */}
        <button className="ap-mob-nav-btn">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2.5 18c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="ap-mob-nav-label">Perfil</span>
        </button>
      </nav>

      {/* ═══════════════ ACTION MODAL ══════════════════════════════ */}
      {showAction && selected && (
        <div className="wz-overlay" onClick={() => setShowAction(null)}>
          <div className="wz-modal ap-action-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wz-modal-header">
              <div>
                <div className="wz-modal-title">
                  {showAction === 'approve'
                    ? (isAnnulMode ? 'Confirmar anulación' : 'Aprobar solicitud')
                    : (isAnnulMode ? 'Rechazar anulación' : 'Rechazar solicitud')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--wz-text-secondary)', marginTop: 2 }}>
                  {selected.id} · {selected.userName}
                </div>
              </div>
              <button className="wz-modal-close" onClick={() => setShowAction(null)}>✕</button>
            </div>

            <div className="wz-modal-body">
              {/* Quick summary */}
              <div className="ap-modal-summary">
                <div className="ap-modal-summary-item">
                  <span>📅 Período</span>
                  <strong>{fmtShort(selected.startDate)} – {fmtShort(selected.endDate)}</strong>
                </div>
                <div className="ap-modal-summary-item">
                  <span>📊 Días laborables</span>
                  <strong>{workDays} días</strong>
                </div>
              </div>

              <div className="wz-field" style={{ marginTop: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Comentario{' '}
                  {showAction === 'reject'
                    ? <span style={{ color: 'var(--wz-error)' }}>*</span>
                    : <span style={{ color: 'var(--wz-text-secondary)', fontWeight: 400 }}>(opcional)</span>}
                </label>
                <textarea
                  className="wz-textarea"
                  placeholder={
                    showAction === 'reject'
                      ? 'Motivo del rechazo (obligatorio)...'
                      : 'Agrega un comentario (opcional)...'
                  }
                  value={comment}
                  onChange={(e) => { setComment(e.target.value); setCommentErr(''); }}
                  rows={4}
                />
                {commentErr && (
                  <span style={{ fontSize: 12, color: 'var(--wz-error)', marginTop: 4, display: 'block' }}>
                    {commentErr}
                  </span>
                )}
              </div>
            </div>

            <div className="wz-modal-footer">
              <button
                className="wz-btn wz-btn-outline"
                onClick={() => { setShowAction(null); setComment(''); setCommentErr(''); }}
              >
                Cancelar
              </button>
              {showAction === 'approve' ? (
                <button className="ap-btn-approve ap-btn-approve--sm" onClick={handleApprove}>
                  ✓ {isAnnulMode ? 'Confirmar anulación' : 'Aprobar'}
                </button>
              ) : (
                <button className="ap-btn-reject ap-btn-reject--sm" onClick={handleReject}>
                  ✕ {isAnnulMode ? 'Rechazar anulación' : 'Rechazar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ BULK ACTION MODAL ═════════════════════════ */}
      {showBulkAction && (
        <div className="wz-overlay" onClick={() => setShowBulkAction(null)}>
          <div className="wz-modal ap-action-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="wz-modal-header">
              <div>
                <h3 className="wz-modal-title">
                  {showBulkAction === 'approve' ? '✓ Aprobar solicitudes' : '✕ Rechazar solicitudes'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--wz-text-secondary)', margin: '4px 0 0' }}>
                  {selectedIds.size} solicitud{selectedIds.size > 1 ? 'es' : ''} seleccionada{selectedIds.size > 1 ? 's' : ''}
                </p>
              </div>
              <button className="wz-modal-close" onClick={() => setShowBulkAction(null)}>✕</button>
            </div>
            <div className="wz-modal-body">
              {showBulkAction === 'reject' && (
                <div className="wz-alert wz-alert-warning" style={{ marginBottom: 12 }}>
                  El motivo es obligatorio para el rechazo.
                </div>
              )}
              <div className="wz-field">
                <label htmlFor="bulk-comment">
                  {showBulkAction === 'approve' ? 'Comentario (opcional)' : 'Motivo del rechazo'}
                  {showBulkAction === 'reject' && <span style={{ color: 'var(--wz-primary)' }}> *</span>}
                </label>
                <textarea
                  id="bulk-comment"
                  className="wz-textarea"
                  rows={3}
                  placeholder={showBulkAction === 'approve' ? 'Añade un comentario opcional…' : 'Indica el motivo del rechazo…'}
                  value={bulkComment}
                  onChange={e => setBulkComment(e.target.value)}
                />
              </div>
            </div>
            <div className="wz-modal-footer">
              <button className="wz-btn wz-btn-outline" onClick={() => setShowBulkAction(null)}>Cancelar</button>
              {showBulkAction === 'approve' ? (
                <button className="wz-btn" style={{ background: '#188918', color: '#fff' }} onClick={handleBulkApprove}>
                  ✓ Confirmar aprobación
                </button>
              ) : (
                <button
                  className="wz-btn wz-btn-danger"
                  disabled={!bulkComment.trim()}
                  onClick={handleBulkReject}
                >
                  ✕ Confirmar rechazo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AprobacionVacaciones;
