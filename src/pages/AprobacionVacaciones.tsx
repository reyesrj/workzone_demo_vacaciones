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

type FilterTab  = 'todas' | 'por_aprobar' | 'anulacion_pend' | 'aprobadas' | 'rechazadas' | 'anulaciones';
type MasterTab  = 'pendientes' | 'historial';

const FILTER_LABELS: Record<FilterTab, string> = {
  todas:          'Todas las pendientes',
  por_aprobar:    'Por aprobar',
  anulacion_pend: 'Anulación pendiente',
  aprobadas:      'Aprobadas',
  rechazadas:     'Rechazadas',
  anulaciones:    'Anulaciones',
};

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
    mode === 'anulaciones' ? 'anulaciones' : 'todas',
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
  const [actionResult, setActionResult] = useState<{
    kind: 'approve' | 'reject' | 'annul' | 'annul_reject' | 'bulk_approve' | 'bulk_reject';
    userName?: string;
    reqId?: string;
    count?: number;
  } | null>(null);
  const [comment,      setComment]      = useState('');
  const [bulkComment,  setBulkComment]  = useState('');
  const [commentErr,   setCommentErr]   = useState('');
  const [mobileView,     setMobileView]     = useState<'master' | 'detail'>('master');
  const [filtersOpen,    setFiltersOpen]    = useState(false);

  /* ---- sync filter when mode prop changes ------------------------- */
  useEffect(() => {
    if (mode === 'anulaciones') {
      setActiveFilter('anulaciones');
      setMasterTab('historial');
    } else {
      setActiveFilter('todas');
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
      if (activeFilter === 'por_aprobar') {
        base = requests.filter((r) =>
          isAdmin ? r.status === 'pendiente_gh' : r.status === 'pendiente_jefe',
        );
      } else if (activeFilter === 'anulacion_pend') {
        base = requests.filter((r) => r.status === 'pendiente_anulacion');
      } else {
        base = requests.filter((r) =>
          isAdmin
            ? ['pendiente_gh', 'pendiente_anulacion'].includes(r.status)
            : ['pendiente_jefe', 'pendiente_anulacion'].includes(r.status),
        );
      }
    } else if (activeFilter === 'aprobadas') {
      base = requests.filter((r) => ['aprobado', 'aprobado_jefe'].includes(r.status));
    } else if (activeFilter === 'rechazadas') {
      base = requests.filter((r) => r.status === 'rechazado');
    } else if (activeFilter === 'anulaciones') {
      base = requests.filter((r) =>
        ['pendiente_anulacion', 'anulado', 'anulacion_rechazada'].includes(r.status),
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
  }, [requests, masterTab, activeFilter, search, isAdmin]);

  const pendingCount  = useMemo(() => requests.filter((r) =>
    isAdmin
      ? ['pendiente_gh','pendiente_anulacion'].includes(r.status)
      : ['pendiente_jefe','pendiente_anulacion'].includes(r.status)
  ).length, [requests, isAdmin]);

  const filterCounts = useMemo(() => ({
    todas: pendingCount,
    por_aprobar: requests.filter((r) =>
      isAdmin ? r.status === 'pendiente_gh' : r.status === 'pendiente_jefe',
    ).length,
    anulacion_pend: requests.filter((r) => r.status === 'pendiente_anulacion').length,
    aprobadas: counts.aprobadas,
    rechazadas: counts.rechazadas,
    anulaciones: counts.anulaciones,
  }), [requests, isAdmin, pendingCount, counts]);

  const pendienteFilters: FilterTab[] = ['todas', 'por_aprobar', 'anulacion_pend'];
  const historialFilters: FilterTab[] = ['aprobadas', 'rechazadas', 'anulaciones'];
  const currentFilters = masterTab === 'pendientes' ? pendienteFilters : historialFilters;

  const activeFilterLabel = useMemo(() => {
    const isDefault = masterTab === 'pendientes'
      ? activeFilter === 'todas'
      : activeFilter === 'aprobadas';
    if (isDefault) return null;
    if (activeFilter === 'por_aprobar' && isAdmin) return 'Por aprobar GH';
    return FILTER_LABELS[activeFilter].replace(' las pendientes', '');
  }, [masterTab, activeFilter, isAdmin]);

  /* ---- auto-select first on filter/search change ------------------ */
  useEffect(() => {
    setSelectedId(filtered[0]?.id ?? null);
    setSelectedIds(new Set());
    setPage(1);
    setMobileView('master');
  }, [masterTab, activeFilter, search]);

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
    const count = selectedIds.size;
    const newStatus: RequestStatus = isAdmin ? 'aprobado' : 'aprobado_jefe';
    selectedIds.forEach(id => onUpdateStatus(id, newStatus, user.name, bulkComment.trim() || undefined));
    setSelectedIds(new Set()); setShowBulkAction(null); setBulkComment('');
    setActionResult({ kind: 'bulk_approve', count });
    setMobileView('master');
  };

  const handleBulkReject = () => {
    if (!bulkComment.trim()) return;
    const count = selectedIds.size;
    selectedIds.forEach(id => onUpdateStatus(id, 'rechazado', user.name, bulkComment.trim()));
    setSelectedIds(new Set()); setShowBulkAction(null); setBulkComment('');
    setActionResult({ kind: 'bulk_reject', count });
    setMobileView('master');
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

  /* ---- detail derived constants ----------------------------------- */
  const tag = selected
    ? STATUS_TAG[selected.status]
    : { cls: 'info', label: '' };

  const vacType = 'Vacaciones días útiles';

  // Level 1 approval (jefe directo)
  const lvl1Entry = selected?.history.find(h =>
    ['aprobado_jefe', 'rechazado'].includes(h.status) ||
    (h.status === 'aprobado' && selected.userRole !== 'colaborador_rotativo')
  ) ?? null;
  const lvl1Stat: string =
    (lvl1Entry?.status === 'aprobado_jefe' || lvl1Entry?.status === 'aprobado') ? 'aprobado' :
    lvl1Entry?.status === 'rechazado' ? 'rechazado' : 'pendiente';
  const lvl1User = USERS.find(u => u.name === collaborator?.approver) ?? null;

  // Level 2 approval (administrador GH) — only for colaborador_rotativo
  const lvl2Entry = selected?.history.find(h =>
    h.status === 'aprobado' && selected.userRole === 'colaborador_rotativo'
  ) ?? null;
  const lvl2Stat: string =
    lvl2Entry?.status === 'aprobado' ? 'aprobado' :
    lvl2Entry?.status === 'rechazado' ? 'rechazado' : 'pendiente';
  const lvl2User = USERS.find(u => u.role === 'administrador_gh') ?? null;

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

  /* ---- derived flags for detail alerts ----------------------------- */
  const today       = new Date().toISOString().split('T')[0];
  const isRotativo  = selected?.userRole === 'colaborador_rotativo';
  // Only warn about expired dates when the START date is strictly before today
  const hasVencidas = selected != null && selected.startDate < today;

  /* ---- team impact warning (independent from short-period alert) -- */
  const teamImpactWarning = useMemo(() => {
    if (!selected || teamImpact.length < 2) return null;
    return `Hay ${teamImpact.length} personas del equipo ausentes en las mismas fechas. Revise el impacto operacional antes de aprobar.`;
  }, [selected, teamImpact]);

  /* ---- action handlers -------------------------------------------- */
  const handleApprove = () => {
    if (!selected) return;
    let newStatus: RequestStatus;
    let resultKind: 'approve' | 'annul';
    if (isAnnulMode)     { newStatus = 'anulado'; resultKind = 'annul'; }
    else if (isAdmin)    { newStatus = 'aprobado'; resultKind = 'approve'; }
    else                 { newStatus = 'aprobado_jefe'; resultKind = 'approve'; }
    onUpdateStatus(selected.id, newStatus, user.name, comment.trim() || undefined);
    setShowAction(null); setComment(''); setCommentErr('');
    setActionResult({
      kind: resultKind,
      userName: selected.userName,
      reqId: selected.id,
    });
    setMobileView('master');
  };

  const handleReject = () => {
    if (!selected) return;
    if (!comment.trim()) { setCommentErr('El motivo del rechazo es obligatorio.'); return; }
    const newStatus: RequestStatus = isAnnulMode ? 'anulacion_rechazada' : 'rechazado';
    onUpdateStatus(selected.id, newStatus, user.name, comment.trim());
    setShowAction(null); setComment(''); setCommentErr('');
    setActionResult({
      kind: isAnnulMode ? 'annul_reject' : 'reject',
      userName: selected.userName,
      reqId: selected.id,
    });
    setMobileView('master');
  };

  const closeConfirmModal = () => {
    setShowAction(null);
    setComment('');
    setCommentErr('');
  };

  const confirmCopy = useMemo(() => {
    if (!showAction || !selected) return null;
    if (isAnnulMode) {
      return showAction === 'approve'
        ? {
            title: 'Confirmar anulación',
            question: `¿Confirma la anulación de la solicitud de vacaciones de ${selected.userName}?`,
            hint: 'La solicitud quedará anulada y el colaborador será notificado.',
            confirmLabel: 'Confirmar anulación',
            variant: 'warning' as const,
          }
        : {
            title: 'Rechazar anulación',
            question: `¿Rechaza la solicitud de anulación de ${selected.userName}?`,
            hint: 'La solicitud de vacaciones seguirá vigente según su estado anterior.',
            confirmLabel: 'Rechazar anulación',
            variant: 'reject' as const,
          };
    }
    return showAction === 'approve'
      ? {
          title: 'Aprobar solicitud',
          question: `¿Aprueba la solicitud de vacaciones de ${selected.userName}?`,
          hint: 'El colaborador será notificado por correo y en el centro de tareas.',
          confirmLabel: 'Aprobar solicitud',
          variant: 'approve' as const,
        }
      : {
          title: 'Rechazar solicitud',
          question: `¿Rechaza la solicitud de vacaciones de ${selected.userName}?`,
          hint: 'Indica el motivo del rechazo. El colaborador será notificado.',
          confirmLabel: 'Rechazar solicitud',
          variant: 'reject' as const,
        };
  }, [showAction, selected, isAnnulMode]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className={`ap-page ap-page--mob-${mobileView}`}>

      {/* ═══════════════ MASTER — left panel ══════════════════════ */}
      <aside className="ap-master">
        <div className="ap-master-header">
          <h2 className="ap-master-title">Mis solicitudes para tu aprobación</h2>
        </div>

        {/* ── Tabs: Pendientes / Historial ── */}
        <div className="ap-master-tabs">
          <button
            className={`ap-master-tab${masterTab === 'pendientes' ? ' ap-master-tab--active' : ''}`}
            onClick={() => { setMasterTab('pendientes'); setActiveFilter('todas'); setFiltersOpen(false); }}
          >
            Pendientes
            {pendingCount > 0 && <span className="ap-master-tab-badge">{pendingCount}</span>}
          </button>
          <button
            className={`ap-master-tab${masterTab === 'historial' ? ' ap-master-tab--active' : ''}`}
            onClick={() => { setMasterTab('historial'); setActiveFilter('aprobadas'); setFiltersOpen(false); }}
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
            className={`ap-filter-btn${(filtersOpen || activeFilterLabel) ? ' ap-filter-btn--active' : ''}`}
            onClick={() => setFiltersOpen(o => !o)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M1 3h14M3 8h10M5 13h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            {activeFilterLabel ?? 'Filtros'}
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

        {/* ── Filter dropdown (SAP ViewSettings pattern) ── */}
        {filtersOpen && (
          <div className="ap-filter-panel" role="listbox" aria-label="Filtros de solicitudes">
            <div className="ap-filter-panel-hdr">
              {masterTab === 'pendientes' ? 'Filtrar pendientes' : 'Filtrar historial'}
            </div>
            {currentFilters.map(f => (
              <button
                key={f}
                type="button"
                role="option"
                aria-selected={activeFilter === f}
                className={`ap-filter-option${activeFilter === f ? ' ap-filter-option--active' : ''}`}
                onClick={() => { setActiveFilter(f); setFiltersOpen(false); }}
              >
                <span className="ap-filter-option-lbl">
                  {f === 'por_aprobar' && isAdmin ? 'Por aprobar GH' : FILTER_LABELS[f]}
                </span>
                <span className="ap-filter-option-count">{filterCounts[f]}</span>
              </button>
            ))}
          </div>
        )}

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
                  onClick={() => {
                    setSelectedId(req.id);
                    setMobileView('detail');
                  }}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId(req.id)}
                >
                  {/* Checkbox — sap.m.List mode MultiSelect */}
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
                        aria-label={`Seleccionar solicitud de ${req.userName}`}
                      />
                    </label>
                  )}

                  {/* Avatar — sap.m.Avatar / StandardListItem icon (foto o iniciales) */}
                  <div
                    className="ap-list-avatar"
                    style={itemPhoto ? { background: 'transparent', padding: 0, overflow: 'hidden' } : { background: avatarColor }}
                  >
                    {itemPhoto
                      ? <img src={`${import.meta.env.BASE_URL}${itemPhoto}`} alt="" className="ap-avatar-img"/>
                      : getInitials(req.userName)}
                  </div>

                  {/* Content — title + description (StandardListItem) */}
                  <div className="ap-list-body">
                    <div className="ap-list-title">{req.userName}</div>
                    <div className="ap-list-desc">
                      <span className="ap-list-id">{req.id}</span>
                      <span className="ap-list-sep">·</span>
                      <span>{fmtShort(req.startDate)} – {fmtShort(req.endDate)}</span>
                      <span className="ap-list-days-badge">({req.days} {req.days === 1 ? 'día' : 'días'})</span>
                    </div>
                  </div>

                  {/* Info — estado + fecha (ObjectListItem number/status) */}
                  <div className="ap-list-info">
                    <div className="ap-list-status">
                      <span className={`ap-status-dot ap-status-dot--${tag.cls}`}/>
                      <span className={`ap-list-status-lbl ap-list-status-lbl--${tag.cls}`}>{tag.label}</span>
                    </div>
                    <div className="ap-list-time">
                      {fmtRelTime(lastEntry?.date ?? '', lastEntry?.time)}
                    </div>
                  </div>

                  {/* Navigation indicator */}
                  <span className="ap-list-nav" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M4.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
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
        ) : (
          <>
            {/* ── Detail panel (SAPUI5 Object Page) ── */}
            <div className="ap-det-panel">

              {/* Top bar — mobile: botón sandwich para volver al master */}
              <div className="ap-det-topbar">
                <button
                  type="button"
                  className="ap-mob-back-btn"
                  onClick={() => setMobileView('master')}
                  aria-label="Volver a la lista de solicitudes"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M3 5.5h14" stroke="#32363a" strokeWidth="2.2" strokeLinecap="round"/>
                    <path d="M3 10h14" stroke="#32363a" strokeWidth="2.2" strokeLinecap="round"/>
                    <path d="M3 14.5h14" stroke="#32363a" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                </button>
                <span className="ap-det-topbar-title">Detalle de la solicitud</span>
                <button type="button" className="ap-delegation-btn">
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

              {/* Employee profile */}
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
                  <div className="ap-det-emp-name">{selected.userName}</div>
                  <div className="ap-det-emp-meta">
                    <span>Código: <strong>{collaborator?.codigoEmpleado ?? selected.id}</strong></span>
                    <span className="ap-det-emp-sep">·</span>
                    <span>Área: <strong>{collaborator?.department ?? ROLE_LABELS[selected.userRole]}</strong></span>
                  </div>
                </div>
                <span className={`ap-det-status-pill ap-det-status-pill--${tag.cls}`}>{tag.label}</span>
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
                    {fmtLong(selected.startDate)} – {fmtLong(selected.endDate)}
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
            </div>{/* /ap-det-panel */}
            </>
          )
        }
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

      {/* ═══════════════ MOBILE NAV — solo en vista master ═════════ */}
      <nav className="ap-mob-nav" aria-label="Navegación aprobación">

        <button
          type="button"
          className={`ap-mob-nav-btn${masterTab === 'pendientes' ? ' ap-mob-nav-btn--active' : ''}`}
          onClick={() => {
            setMasterTab('pendientes');
            setActiveFilter('todas');
            setFiltersOpen(false);
            setMobileView('master');
          }}
        >
          <span className="ap-mob-nav-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a6 6 0 016 6c0 3.5 1.5 5 1.5 5H2.5S4 11.5 4 8a6 6 0 016-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 16a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {pendingCount > 0 && (
              <span className="ap-mob-nav-badge">{pendingCount}</span>
            )}
          </span>
          <span className="ap-mob-nav-label">Pendientes</span>
        </button>

        <button
          type="button"
          className={`ap-mob-nav-btn${masterTab === 'historial' ? ' ap-mob-nav-btn--active' : ''}`}
          onClick={() => {
            setMasterTab('historial');
            setActiveFilter('aprobadas');
            setFiltersOpen(false);
            setMobileView('master');
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 6.5V10l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="ap-mob-nav-label">Historial</span>
        </button>

        <button
          type="button"
          className={`ap-mob-nav-btn${filtersOpen ? ' ap-mob-nav-btn--active' : ''}`}
          onClick={() => {
            setFiltersOpen(o => !o);
            setMobileView('master');
          }}
          aria-expanded={filtersOpen}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M2 4h16M4 10h12M6 16h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="ap-mob-nav-label">Filtros</span>
        </button>
      </nav>

      {/* ═══════════════ CONFIRM ACTION MODAL ═══════════════════════ */}
      {showAction && selected && confirmCopy && (
        <div className="wz-overlay" onClick={closeConfirmModal}>
          <div className="wz-modal ap-confirm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ap-confirm-title">
            <div className="ap-confirm-hdr">
              <div className={`ap-confirm-icon ap-confirm-icon--${confirmCopy.variant}`} aria-hidden="true">
                {confirmCopy.variant === 'approve' && (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M6 14l6 6L22 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {confirmCopy.variant === 'reject' && (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M8 8l12 12M20 8L8 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                )}
                {confirmCopy.variant === 'warning' && (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M14 5L4 23h20L14 5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    <rect x="12.5" y="12" width="3" height="6" rx="1" fill="currentColor"/>
                    <circle cx="14" cy="21" r="1.5" fill="currentColor"/>
                  </svg>
                )}
              </div>
              <div className="ap-confirm-hdr-text">
                <h3 id="ap-confirm-title" className="wz-modal-title">{confirmCopy.title}</h3>
                <p className="ap-confirm-sub">{selected.id} · {selected.userName}</p>
              </div>
              <button type="button" className="wz-modal-close" onClick={closeConfirmModal} aria-label="Cerrar">✕</button>
            </div>

            <div className="wz-modal-body">
              <p className="ap-confirm-question">{confirmCopy.question}</p>
              <p className="ap-confirm-hint">{confirmCopy.hint}</p>

              <div className="ap-modal-summary">
                <div className="ap-modal-summary-item">
                  <span>Período</span>
                  <strong>{fmtShort(selected.startDate)} – {fmtShort(selected.endDate)}</strong>
                </div>
                <div className="ap-modal-summary-item">
                  <span>Días laborables</span>
                  <strong>{workDays} {workDays === 1 ? 'día' : 'días'}</strong>
                </div>
              </div>

              <div className="wz-field ap-confirm-field">
                <label htmlFor="ap-action-comment">
                  Comentario{' '}
                  {showAction === 'reject'
                    ? <span className="ap-confirm-required">*</span>
                    : <span className="ap-confirm-optional">(opcional)</span>}
                </label>
                <textarea
                  id="ap-action-comment"
                  className="wz-textarea"
                  placeholder={
                    showAction === 'reject'
                      ? 'Motivo del rechazo (obligatorio)...'
                      : 'Agrega un comentario (opcional)...'
                  }
                  value={comment}
                  onChange={(e) => { setComment(e.target.value); setCommentErr(''); }}
                  rows={3}
                />
                {commentErr && <span className="ap-confirm-err">{commentErr}</span>}
              </div>
            </div>

            <div className="wz-modal-footer">
              <button type="button" className="wz-btn wz-btn-outline" onClick={closeConfirmModal}>
                Cancelar
              </button>
              {showAction === 'approve' ? (
                <button type="button" className="ap-btn-approve ap-btn-approve--sm" onClick={handleApprove}>
                  {confirmCopy.confirmLabel}
                </button>
              ) : (
                <button type="button" className="ap-btn-reject ap-btn-reject--sm" onClick={handleReject}>
                  {confirmCopy.confirmLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ SUCCESS RESULT MODAL ═════════════════════ */}
      {actionResult && (
        <div className="wz-overlay" onClick={() => setActionResult(null)}>
          <div className="wz-modal ap-result-modal" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="ap-result-body">
              <div className={`ap-result-icon ap-result-icon--${
                ['approve', 'annul', 'bulk_approve'].includes(actionResult.kind) ? 'success' : 'error'
              }`}>
                {['approve', 'annul', 'bulk_approve'].includes(actionResult.kind) ? (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M7 16l7 8L25 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M9 9l14 14M23 9L9 23" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              <h3 className="ap-result-title">
                {actionResult.kind === 'approve' && 'Solicitud aprobada'}
                {actionResult.kind === 'reject' && 'Solicitud rechazada'}
                {actionResult.kind === 'annul' && 'Anulación confirmada'}
                {actionResult.kind === 'annul_reject' && 'Anulación rechazada'}
                {actionResult.kind === 'bulk_approve' && `${actionResult.count} solicitud${(actionResult.count ?? 0) > 1 ? 'es' : ''} aprobada${(actionResult.count ?? 0) > 1 ? 's' : ''}`}
                {actionResult.kind === 'bulk_reject' && `${actionResult.count} solicitud${(actionResult.count ?? 0) > 1 ? 'es' : ''} rechazada${(actionResult.count ?? 0) > 1 ? 's' : ''}`}
              </h3>
              <p className="ap-result-sub">
                {actionResult.userName
                  ? <>La acción sobre la solicitud de <strong>{actionResult.userName}</strong> ({actionResult.reqId}) se registró correctamente.</>
                  : <>La acción masiva se registró correctamente. Los colaboradores serán notificados.</>}
              </p>
              <button type="button" className="ap-result-btn" onClick={() => setActionResult(null)}>
                Entendido
              </button>
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
              <p className="ap-confirm-question">
                {showBulkAction === 'approve'
                  ? `¿Aprueba las ${selectedIds.size} solicitud${selectedIds.size > 1 ? 'es' : ''} seleccionada${selectedIds.size > 1 ? 's' : ''}?`
                  : `¿Rechaza las ${selectedIds.size} solicitud${selectedIds.size > 1 ? 'es' : ''} seleccionada${selectedIds.size > 1 ? 's' : ''}?`}
              </p>
              <p className="ap-confirm-hint">
                {showBulkAction === 'approve'
                  ? 'Los colaboradores serán notificados por correo y en el centro de tareas.'
                  : 'Indica el motivo del rechazo. Es obligatorio para continuar.'}
              </p>
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
                <button type="button" className="ap-btn-approve ap-btn-approve--sm" onClick={handleBulkApprove}>
                  Confirmar aprobación
                </button>
              ) : (
                <button
                  type="button"
                  className="ap-btn-reject ap-btn-reject--sm"
                  disabled={!bulkComment.trim()}
                  onClick={handleBulkReject}
                >
                  Confirmar rechazo
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
