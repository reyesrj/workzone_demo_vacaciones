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

type FilterTab = 'pendientes' | 'aprobadas' | 'rechazadas' | 'anulaciones';

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

const dotCls = (s: RequestStatus) => {
  if (s === 'aprobado' || s === 'aprobado_jefe') return 'success';
  if (['rechazado','anulado','anulacion_rechazada'].includes(s)) return 'error';
  if (['pendiente_jefe','pendiente_gh','pendiente_anulacion'].includes(s)) return 'warning';
  return 'info';
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
  const [search,       setSearch]       = useState('');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [page,         setPage]         = useState(1);
  const [showAction,   setShowAction]   = useState<'approve' | 'reject' | null>(null);
  const [comment,      setComment]      = useState('');
  const [commentErr,   setCommentErr]   = useState('');
  const [historyOpen,  setHistoryOpen]  = useState(false);

  /* ---- sync filter when mode prop changes ------------------------- */
  useEffect(() => {
    setActiveFilter(mode === 'anulaciones' ? 'anulaciones' : 'pendientes');
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
    switch (activeFilter) {
      case 'pendientes':
        base = requests.filter((r) =>
          isAdmin ? r.status === 'pendiente_gh' : r.status === 'pendiente_jefe',
        );
        break;
      case 'aprobadas':
        base = requests.filter((r) => ['aprobado', 'aprobado_jefe'].includes(r.status));
        break;
      case 'rechazadas':
        base = requests.filter((r) => r.status === 'rechazado');
        break;
      case 'anulaciones':
        base = requests.filter((r) =>
          ['pendiente_anulacion', 'anulado', 'anulacion_rechazada'].includes(r.status),
        );
        break;
      default:
        base = [];
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(
        (r) => r.userName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
      );
    }
    return [...base].sort((a, b) => {
      const aDate = a.history.at(-1)?.date ?? '';
      const bDate = b.history.at(-1)?.date ?? '';
      return bDate.localeCompare(aDate);
    });
  }, [requests, activeFilter, search, isAdmin]);

  /* ---- auto-select first on filter/search change ------------------ */
  useEffect(() => {
    setSelectedId(filtered[0]?.id ?? null);
    setPage(1);
  }, [activeFilter, search]);

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

  /* ---- smart suggestion ------------------------------------------- */
  const suggestion = useMemo(() => {
    if (!selected) return null;
    if (workDays <= 2)
      return `El colaborador está solicitando un período muy corto (solo ${workDays} días laborables). Recomendación: Evaluar si requiere más días para su descanso.`;
    if (teamImpact.length >= 2)
      return `Hay ${teamImpact.length} personas del equipo ausentes en las mismas fechas. Revise el impacto operacional antes de aprobar.`;
    return null;
  }, [selected, workDays, teamImpact]);

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
    <div className="ap-page">

      {/* ═══════════════ MASTER — left panel ══════════════════════ */}
      <aside className="ap-master">
        <div className="ap-master-header">
          <h2 className="ap-master-title">Mis solicitudes para tu aprobación</h2>
        </div>

        {/* Filter tabs */}
        <div className="ap-tabs">
          {(
            [
              { key: 'pendientes',  label: 'Pendientes',  count: counts.pendientes,  cls: 'warning' },
              { key: 'rechazadas',  label: 'Rechazadas',  count: counts.rechazadas,  cls: 'error'   },
              { key: 'aprobadas',   label: 'Aprobadas',   count: counts.aprobadas,   cls: 'success' },
              { key: 'anulaciones', label: 'Anulaciones', count: counts.anulaciones, cls: 'muted'   },
            ] as const
          ).map(({ key, label, count, cls }) => (
            <button
              key={key}
              className={`ap-tab${activeFilter === key ? ' ap-tab--active' : ''}`}
              onClick={() => { setActiveFilter(key); }}
            >
              {label}
              {count > 0 && (
                <span className={`ap-tab-badge ap-tab-badge--${cls}`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="ap-search">
          <span className="ap-search-icon">🔍</span>
          <input
            type="text"
            className="ap-search-input"
            placeholder="Buscar por nombre o código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="ap-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* List */}
        <div className="ap-list">
          {filtered.length === 0 ? (
            <div className="ap-list-empty">
              <div className="ap-list-empty-icon">📭</div>
              <p>Sin solicitudes en esta categoría</p>
            </div>
          ) : (
            paged.map((req) => {
              const lastEntry = req.history.at(-1);
              const tag = STATUS_TAG[req.status];
              const avatarColor = AVATAR_COLORS[req.userRole] ?? '#DA291C';
              const isActive = (selected?.id ?? '') === req.id;
              const itemPhoto = USERS.find((u) => u.id === req.userId)?.photo;

              return (
                <div
                  key={req.id}
                  className={`ap-item${isActive ? ' ap-item--active' : ''}`}
                  onClick={() => setSelectedId(req.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId(req.id)}
                >
                  <div className="ap-item-top">
                    <div
                      className="ap-item-avatar"
                      style={{ background: itemPhoto ? 'transparent' : avatarColor, padding: itemPhoto ? 0 : undefined, overflow: 'hidden' }}
                    >
                      {itemPhoto
                        ? <img src={`${import.meta.env.BASE_URL}${itemPhoto}`} alt={req.userName} className="ap-avatar-img" />
                        : getInitials(req.userName)}
                    </div>
                    <div className="ap-item-meta">
                      <span className="ap-item-id">N° {req.id}</span>
                      <span className="ap-item-time">
                        {fmtRelTime(lastEntry?.date ?? '', lastEntry?.time)}
                      </span>
                    </div>
                  </div>
                  <div className="ap-item-name">{req.userName}</div>
                  <div className="ap-item-dates">
                    {fmtShort(req.startDate)} – {fmtShort(req.endDate)}
                  </div>
                  <div className="ap-item-footer">
                    <span className={`ap-status-pill ap-status-pill--${tag.cls}`}>
                      {tag.label}
                    </span>
                    <span className="ap-item-days">{req.days} días</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="ap-pagination">
            <span className="ap-pagination-info">
              Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
              {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} solicitudes
            </span>
            <div className="ap-page-btns">
              <button
                className="ap-page-arrow"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`ap-page-num${page === i + 1 ? ' ap-page-num--active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="ap-page-arrow"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >›</button>
            </div>
          </div>
        )}
      </aside>

      {/* ═══════════════ DETAIL — right panel ═════════════════════ */}
      <main className="ap-detail">
        {!selected ? (
          <div className="ap-detail-empty">
            <div className="ap-detail-empty-icon">📋</div>
            <p>Selecciona una solicitud para ver el detalle</p>
          </div>
        ) : (
          <>
            {/* Employee header */}
            <div className="ap-det-header">
              <div className="ap-det-emp">
                <div
                  className="ap-det-emp-avatar"
                  style={{ background: collaborator?.photo ? 'transparent' : (AVATAR_COLORS[selected.userRole] ?? '#DA291C'), padding: collaborator?.photo ? 0 : undefined, overflow: 'hidden' }}
                >
                  {collaborator?.photo
                    ? <img src={`${import.meta.env.BASE_URL}${collaborator.photo}`} alt={selected.userName} className="ap-avatar-img" />
                    : getInitials(selected.userName)}
                </div>
                <div className="ap-det-emp-info">
                  <div className="ap-det-emp-name">{selected.userName}</div>
                  <div className="ap-det-emp-meta">
                    {collaborator && (
                      <>Código: {collaborator.codigoEmpleado} &nbsp;·&nbsp; </>
                    )}
                    Área: {collaborator?.department ?? ROLE_LABELS[selected.userRole]}
                  </div>
                </div>
              </div>
              <span className={`ap-status-pill ap-status-pill--${STATUS_TAG[selected.status].cls}`}>
                {STATUS_TAG[selected.status].label}
              </span>
            </div>

            {/* Main vacation info card */}
            <div className="ap-vacation-card">
              <div className="ap-vc-left">
                <div className="ap-vc-title-row">
                  <div className="ap-vc-cal-icon">📅</div>
                  <div>
                    <div className="ap-vc-subtitle">Solicitud de vacaciones</div>
                    <div className="ap-vc-dates">
                      {fmtLong(selected.startDate)} –<br />
                      {fmtLong(selected.endDate)}
                    </div>
                  </div>
                </div>
                <div className="ap-vc-return">
                  Retorno al trabajo:{' '}
                  <strong>{fmtLong(retDate)}</strong>
                </div>
              </div>

              <div className="ap-vc-stats">
                <div className="ap-vc-stat">
                  <span className="ap-vc-stat-icon">📊</span>
                  <div>
                    <div className="ap-vc-stat-label">Días solicitados</div>
                    <div className="ap-vc-stat-value">
                      {calDays} días calendario
                      <span className="ap-vc-stat-sub">({workDays} días laborables)</span>
                    </div>
                  </div>
                </div>
                <div className="ap-vc-stat">
                  <span className="ap-vc-stat-icon">🏖️</span>
                  <div>
                    <div className="ap-vc-stat-label">Tipo de vacaciones</div>
                    <div className="ap-vc-stat-value">Días laborables</div>
                  </div>
                </div>
                <div className="ap-vc-stat">
                  <span className="ap-vc-stat-icon">💼</span>
                  <div>
                    <div className="ap-vc-stat-label">Saldo disponible actual</div>
                    <div className="ap-vc-stat-value">
                      {collaborator?.vacationBalance ?? '—'} días
                    </div>
                  </div>
                </div>
                <div className="ap-vc-stat">
                  <span className="ap-vc-stat-icon">✂️</span>
                  <div>
                    <div className="ap-vc-stat-label">Días con esta solicitud</div>
                    <div className="ap-vc-stat-value">{workDays} días laborables</div>
                  </div>
                </div>
              </div>

              <div className="ap-vc-illustration" aria-hidden="true">🏖️</div>
            </div>

            {/* Smart suggestion */}
            {suggestion && (
              <div className="ap-suggestion">
                <span className="ap-suggestion-icon">⚠️</span>
                <span className="ap-suggestion-text">
                  <strong>Sugerencia:</strong> {suggestion}
                </span>
                <button className="ap-suggestion-link">ℹ️ Ver política</button>
              </div>
            )}

            {/* Comment + Team impact */}
            <div className="ap-bottom-row">
              {/* Collaborator comment */}
              <div className="ap-panel ap-comment-panel">
                <div className="ap-panel-title">
                  <span>💬</span> Comentario del colaborador
                </div>
                <p className="ap-comment-text">
                  {selected.comments ?? (
                    <em style={{ color: 'var(--wz-text-muted)' }}>Sin comentarios</em>
                  )}
                </p>
              </div>

              {/* Team impact */}
              <div className="ap-panel ap-impact-panel">
                <div className="ap-panel-title">
                  <span>👥</span> Impacto en el equipo
                </div>
                {teamImpact.length === 0 ? (
                  <p className="ap-impact-none">
                    ✅ Ninguna otra persona ausente en esas fechas.
                  </p>
                ) : (
                  <>
                    <div className="ap-impact-avatars">
                      {teamImpact.slice(0, 5).map((r) => (
                        <div
                          key={r.id}
                          className="ap-impact-avatar"
                          title={r.userName}
                          style={{ background: AVATAR_COLORS[r.userRole] ?? '#DA291C' }}
                        >
                          {getInitials(r.userName)}
                        </div>
                      ))}
                      {teamImpact.length > 5 && (
                        <div className="ap-impact-avatar ap-impact-more">
                          +{teamImpact.length - 5}
                        </div>
                      )}
                    </div>
                    <p className="ap-impact-count">
                      <strong>{teamImpact.length}</strong> persona(s) estarán ausentes en esas fechas
                    </p>
                    <button className="ap-calendar-link">
                      📅 Ver calendario del equipo
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Collapsible history */}
            <div className="ap-history-section">
              <button
                className="ap-history-toggle"
                onClick={() => setHistoryOpen((v) => !v)}
                aria-expanded={historyOpen}
              >
                <span>🕐 Historial de la solicitud</span>
                <span className={`ap-history-arrow${historyOpen ? ' ap-history-arrow--open' : ''}`}>›</span>
              </button>

              {historyOpen && (
                <div className="wz-timeline ap-timeline">
                  {selected.history.map((step, i) => (
                    <div key={i} className="wz-tl-item">
                      <div className={`wz-tl-dot ${dotCls(step.status)}`} />
                      <div className="wz-tl-content">
                        <div className="wz-tl-header">
                          <span className="wz-tl-label">{step.label}</span>
                          <span className="wz-tl-date">
                            {step.date}{step.time ? ` · ${step.time}` : ''}
                          </span>
                        </div>
                        <div className="wz-tl-by">
                          {step.by}{step.actorRole ? ` (${step.actorRole})` : ''}
                        </div>
                        {step.comment && (
                          <div className="wz-tl-comment">"{step.comment}"</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {isPending && (
              <div className="ap-action-bar">
                <button
                  className="ap-btn-reject"
                  onClick={() => { setShowAction('reject'); setComment(''); setCommentErr(''); }}
                >
                  ✕&nbsp; {isAnnulMode ? 'Rechazar anulación' : 'Rechazar'}
                </button>
                <button
                  className="ap-btn-approve"
                  onClick={() => { setShowAction('approve'); setComment(''); setCommentErr(''); }}
                >
                  ✓&nbsp; {isAnnulMode ? 'Confirmar anulación' : 'Aprobar'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ═══════════════ MOBILE NAV BAR ═══════════════════════════ */}
      <nav className="ap-mob-nav" aria-label="Navegación aprobación">
        {/* Pendientes */}
        <button
          className={`ap-mob-nav-btn${activeFilter === 'pendientes' ? ' ap-mob-nav-btn--active' : ''}`}
          onClick={() => setActiveFilter('pendientes')}
        >
          <span className="ap-mob-nav-icon">🔔</span>
          {counts.pendientes > 0 && (
            <span className="ap-mob-nav-badge">{counts.pendientes}</span>
          )}
          <span className="ap-mob-nav-label">Pendientes</span>
        </button>

        {/* Historial */}
        <button
          className="ap-mob-nav-btn"
          onClick={() => setHistoryOpen((v) => !v)}
        >
          <span className="ap-mob-nav-icon">📋</span>
          <span className="ap-mob-nav-label">Historial</span>
        </button>

        {/* FAB — Aprobar (primary action) */}
        <div className="ap-mob-fab-wrap">
          <button
            className={`ap-mob-fab${!isPending ? ' ap-mob-fab--disabled' : ''}`}
            disabled={!isPending}
            onClick={() => {
              if (isPending) { setShowAction('approve'); setComment(''); setCommentErr(''); }
            }}
            aria-label={isPending ? 'Aprobar solicitud' : 'Sin acción disponible'}
          >
            ✓
          </button>
        </div>

        {/* Delegación */}
        <button
          className={`ap-mob-nav-btn${activeFilter === 'aprobadas' ? ' ap-mob-nav-btn--active' : ''}`}
          onClick={() => setActiveFilter('aprobadas')}
        >
          <span className="ap-mob-nav-icon">🤝</span>
          <span className="ap-mob-nav-label">Aprobadas</span>
        </button>

        {/* Anulaciones */}
        <button
          className={`ap-mob-nav-btn${activeFilter === 'anulaciones' ? ' ap-mob-nav-btn--active' : ''}`}
          onClick={() => setActiveFilter('anulaciones')}
        >
          <span className="ap-mob-nav-icon">↩️</span>
          <span className="ap-mob-nav-label">Anulaciones</span>
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
    </div>
  );
};

export default AprobacionVacaciones;
