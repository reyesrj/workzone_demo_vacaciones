import React, { useState } from 'react';
import { ROLE_LABELS } from '../data/users';
import type { User } from '../data/users';
import { INITIAL_REQUESTS } from '../data/vacationRequests';
import type { VacationRequest, RequestStatus } from '../data/vacationRequests';
import type { NavigateFn } from '../types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const countWorkingDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const calcReturnDate = (endDate: string): string => {
  if (!endDate) return '';
  const d = new Date(endDate + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const SHORT_MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const fmtDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}. ${d.getFullYear()}`;
};

const getCalendarDays = (year: number, month: number) => {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekDay = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: Array<{ date: Date; currentMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const dayNumber = i - firstWeekDay + 1;
    if (dayNumber < 1) {
      cells.push({ date: new Date(year, month - 1, prevMonthDays + dayNumber), currentMonth: false });
    } else if (dayNumber > daysInMonth) {
      cells.push({ date: new Date(year, month + 1, dayNumber - daysInMonth), currentMonth: false });
    } else {
      cells.push({ date: new Date(year, month, dayNumber), currentMonth: true });
    }
  }
  return cells;
};

const nextId = (): string => {
  const existing = INITIAL_REQUESTS.map((r) => parseInt(r.id.replace('VR-', ''), 10));
  const max = existing.length ? Math.max(...existing) : 0;
  return `VR-${String(max + 1).padStart(3, '0')}`;
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface Props {
  user: User;
  onAddRequest: (req: VacationRequest) => void;
  onNavigate: NavigateFn;
}

const SolicitudVacaciones: React.FC<Props> = ({ user, onAddRequest, onNavigate }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate]       = useState(today);
  const [endDate, setEndDate]           = useState(today);
  const [comments, setComments]         = useState('');
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState('');
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [advanceRequest, setAdvanceRequest] = useState(false);
  const [loanRequest, setLoanRequest]   = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [detailsOpen, setDetailsOpen]   = useState(false);

  const days        = countWorkingDays(startDate, endDate);
  const returnDate  = calcReturnDate(endDate);
  const isRotativo  = user.role === 'colaborador_rotativo';
  const firstName   = user.name.split(' ')[0];
  const currentYear = new Date().getFullYear();

  const pendingDays = INITIAL_REQUESTS
    .filter((r) => r.userId === user.id &&
      ['pendiente_jefe', 'pendiente_gh', 'pendiente_anulacion'].includes(r.status))
    .reduce((sum, r) => sum + r.days, 0);

  const approverInitials = (user.approver ?? 'JA')
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const validate = (): string => {
    if (!startDate) return 'Selecciona una fecha de inicio.';
    if (!endDate)   return 'Selecciona una fecha de fin.';
    if (new Date(endDate + 'T00:00:00') < new Date(startDate + 'T00:00:00'))
      return 'La fecha de fin debe ser posterior a la de inicio.';
    if (days === 0) return 'El período seleccionado no contiene días hábiles.';
    if (days > user.vacationBalance)
      return `No tienes suficientes días disponibles (saldo: ${user.vacationBalance} días).`;
    return '';
  };

  const handleSubmitClick = () => {
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    const today = new Date().toISOString().split('T')[0];
    const now   = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const initialStatus: RequestStatus = 'pendiente_jefe';

    const newReq: VacationRequest = {
      id: nextId(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      startDate,
      endDate,
      days,
      status: initialStatus,
      comments: comments.trim() || undefined,
      currentApprover: user.approver ?? 'Jefe Aprobador',
      history: [
        {
          status: 'creado',
          label: 'Solicitud creada',
          by: user.name,
          actorRole: ROLE_LABELS[user.role],
          date: today,
          time: now,
        },
        {
          status: 'pendiente_jefe',
          label: 'Enviada a Jefe Aprobador',
          by: 'Sistema',
          date: today,
          time: now,
        },
      ],
    };

    onAddRequest(newReq);
    setShowConfirm(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setComments('');
    setSubmitted(false);
    setError('');
    setAdvanceRequest(false);
    setLoanRequest(false);
  };

  /* ---------------------------------------------------------------- */
  /*  Success state                                                    */
  /* ---------------------------------------------------------------- */
  if (submitted) {
    return (
      <div className="wz-space-page">
        <div className="wz-breadcrumb">Mis Vacaciones › Solicitar Vacaciones</div>
        <h2 className="wz-page-heading">Solicitar Vacaciones</h2>
        <div className="sv-success-card">
          <div className="sv-success-emoji">🎉</div>
          <h3 className="sv-success-title">¡Solicitud enviada!</h3>
          <p className="sv-success-body">
            Tu solicitud de <strong>{days} días hábiles</strong> ({fmtDate(startDate)} → {fmtDate(endDate)})
            fue enviada correctamente{' '}
            {isRotativo
              ? 'al Jefe Aprobador y Administración GH.'
              : 'al Jefe Aprobador.'}
          </p>
          <div className="sv-success-flow">
            <span className="sv-success-step sv-success-step--done">✓ Enviada</span>
            <span className="sv-success-arrow">→</span>
            <span className="sv-success-step">Jefe Aprobador</span>
            {isRotativo && (
              <>
                <span className="sv-success-arrow">→</span>
                <span className="sv-success-step">Admin GH</span>
              </>
            )}
            <span className="sv-success-arrow">→</span>
            <span className="sv-success-step">Aprobado</span>
          </div>
          <div className="sv-success-actions">
            <button className="wz-btn wz-btn-outline" onClick={handleReset}>
              Nueva Solicitud
            </button>
            <button className="wz-btn wz-btn-primary" onClick={() => onNavigate('mis-solicitudes')}>
              Ver Mis Solicitudes
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main form                                                        */
  /* ---------------------------------------------------------------- */
  const calendarCells = getCalendarDays(calendarYear, calendarMonth);
  const hasSelection  = !!startDate;
  const hasRange      = !!(startDate && endDate);

  return (
    <>
      {/* ── Main content wrapper ─────────────────────────────────── */}
      <div className="wz-space-page sv-wrapper">
        <div className="wz-breadcrumb">Mis Vacaciones › Solicitar Vacaciones</div>
        <h2 className="wz-page-heading">Solicitar Vacaciones</h2>

        {/* ── User hero ──────────────────────────────────────────── */}
        <div className="sv-hero">
          <div className="sv-hero-profile">
            <div
              className="sv-hero-avatar"
              style={user.photo ? { background: 'transparent', padding: 0, overflow: 'hidden' } : {}}
            >
              {user.photo
                ? <img src={`${import.meta.env.BASE_URL}${user.photo}`} alt={user.name} className="sv-avatar-img" />
                : user.initials}
            </div>
            <div className="sv-hero-info">
              <div className="sv-hero-name">Hola, {firstName} 👋</div>
              {/* Desktop: muestra área/departamento */}
              <div className="sv-hero-dept">{user.department}</div>
              {/* Mobile: muestra días disponibles en lugar del área */}
              <div className="sv-hero-mobile-balance">
                Tienes <strong>{user.vacationBalance} días</strong> disponibles
              </div>
              <button
                className="sv-hero-link"
                onClick={() => onNavigate('mis-solicitudes')}
              >
                ℹ️ ¿Cuántos días tengo disponibles? ›
              </button>
            </div>
          </div>
          {/* Mobile-only beach illustration */}
          <div className="sv-hero-illustration" aria-hidden="true">🏖️</div>

          <div className="sv-hero-kpis">
            <div className="sv-kpi sv-kpi--green">
              <div className="sv-kpi-row-top">
                <span className="sv-kpi-icon" style={{ background: '#E8F5E9' }}>📅</span>
                <span className="sv-kpi-label">Días disponibles</span>
              </div>
              <span className="sv-kpi-value">{user.vacationBalance} días</span>
            </div>
            <div className="sv-kpi sv-kpi--orange">
              <div className="sv-kpi-row-top">
                <span className="sv-kpi-icon" style={{ background: '#FFF3E0' }}>⏰</span>
                <span className="sv-kpi-label">Por vencer este año</span>
              </div>
              <span className="sv-kpi-value">{user.vacationBalancePendientes} días</span>
              <span className="sv-kpi-sub">Vence el 31/12/{currentYear}</span>
            </div>
            <div className="sv-kpi sv-kpi--amber">
              <div className="sv-kpi-row-top">
                <span className="sv-kpi-icon" style={{ background: '#FFF8E1' }}>⏳</span>
                <span className="sv-kpi-label">Pendientes de aprobación</span>
              </div>
              <span className="sv-kpi-value">{pendingDays} días</span>
            </div>
          </div>
        </div>

        {/* ── Main two-column grid ────────────────────────────────── */}
        <div className="sv-main-grid">

          {/* ── LEFT: Calendar card ────────────────────────────────── */}
          <div className="sv-cal-card">
            <div className="sv-cal-card-header">
              <div className="sv-cal-card-title-row">
                <span className="sv-cal-card-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="5" width="24" height="21" rx="4" fill="#fff" stroke="#DA291C" strokeWidth="2"/>
                    <rect x="2" y="5" width="24" height="8" rx="4" fill="#DA291C"/>
                    <rect x="8" y="1" width="3" height="7" rx="1.5" fill="#DA291C"/>
                    <rect x="17" y="1" width="3" height="7" rx="1.5" fill="#DA291C"/>
                    <rect x="7" y="17" width="3" height="3" rx="1" fill="#DA291C"/>
                    <rect x="12.5" y="17" width="3" height="3" rx="1" fill="#DA291C"/>
                    <rect x="18" y="17" width="3" height="3" rx="1" fill="#DA291C"/>
                    <rect x="7" y="22" width="3" height="2" rx="1" fill="#DA291C" opacity="0.5"/>
                    <rect x="12.5" y="22" width="3" height="2" rx="1" fill="#DA291C" opacity="0.5"/>
                  </svg>
                </span>
                <div>
                  <h3 className="sv-cal-card-title">¿Cuándo quieres tomar tu descanso?</h3>
                  <p className="sv-cal-card-sub">Selecciona las fechas de inicio y fin.</p>
                </div>
              </div>
            </div>

            {error && <div className="sv-error-bar">⚠ {error}</div>}

            <div className="sv-cal-inner">
              {/* Calendar column */}
              <div className="sv-cal-col">
                <div className="sv-month-nav">
                  <button
                    type="button"
                    className="sv-month-btn"
                    onClick={() => {
                      if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear((y) => y - 1); }
                      else setCalendarMonth((m) => m - 1);
                    }}
                  >‹</button>
                  <span className="sv-month-label">
                    {SPANISH_MONTHS[calendarMonth]} {calendarYear}
                  </span>
                  <button
                    type="button"
                    className="sv-month-btn"
                    onClick={() => {
                      if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear((y) => y + 1); }
                      else setCalendarMonth((m) => m + 1);
                    }}
                  >›</button>
                </div>

                <div className="sv-grid">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                    <div key={i} className="sv-weekday">{d}</div>
                  ))}
                  {calendarCells.map((cell) => {
                    const cd = cell.date.toISOString().split('T')[0];
                    const selStart = startDate ? new Date(startDate + 'T00:00:00') : null;
                    const selEnd   = endDate   ? new Date(endDate   + 'T00:00:00') : null;
                    const isStart  = selStart?.toISOString().split('T')[0] === cd;
                    const isEnd    = selEnd?.toISOString().split('T')[0] === cd;
                    const inRange  = selStart && selEnd
                      ? cell.date > selStart && cell.date < selEnd
                      : false;
                    const isDisabled = !cell.currentMonth;
                    const isWeekend  = cell.date.getDay() === 0 || cell.date.getDay() === 6;

                    return (
                      <button
                        key={cd}
                        type="button"
                        className={[
                          'sv-cell',
                          isDisabled ? 'sv-cell--off'     : '',
                          isWeekend  ? 'sv-cell--weekend' : '',
                          isStart    ? 'sv-cell--start'   : '',
                          isEnd      ? 'sv-cell--end'     : '',
                          inRange    ? 'sv-cell--range'   : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => {
                          if (isDisabled) return;
                          if (!startDate || (startDate && endDate)) {
                            setStartDate(cd);
                            setEndDate('');
                          } else if (cd < startDate) {
                            setStartDate(cd);
                            setEndDate('');
                          } else {
                            setEndDate(cd);
                          }
                          setError('');
                        }}
                      >
                        {cell.date.getDate()}
                      </button>
                    );
                  })}
                </div>

                <div className="sv-legend">
                  <span className="sv-legend-item">
                    <i className="sv-dot sv-dot--start" /> Inicio
                  </span>
                  <span className="sv-legend-item">
                    <i className="sv-dot sv-dot--end" /> Fin
                  </span>
                  <span className="sv-legend-item">
                    <i className="sv-dot sv-dot--range" /> Días seleccionados
                  </span>
                  <span className="sv-legend-item">
                    <i className="sv-dot sv-dot--weekend" /> No laborables
                  </span>
                </div>
              </div>

              {/* Tu selección panel */}
              <div className="sv-sel-col">
                {!hasSelection ? (
                  <div className="sv-sel-empty">
                    <img
                      src="/beach-umbrella.png"
                      alt="Selecciona tus fechas de vacaciones"
                      className="sv-sel-empty-img"
                    />
                    <p className="sv-sel-empty-text">Selecciona las fechas en el calendario</p>
                  </div>
                ) : (
                  <div className="sv-sel-panel">
                    <div className="sv-sel-illustration">🌴</div>
                    <div className="sv-sel-title">Tu selección</div>

                    <div className="sv-sel-item">
                      <span className="sv-sel-item-icon" style={{ background: '#FFEBEE' }}>📅</span>
                      <div className="sv-sel-item-body">
                        <span className="sv-sel-item-label">Inicio</span>
                        <span className="sv-sel-item-value">{fmtDate(startDate)}</span>
                      </div>
                    </div>

                    <div className="sv-sel-item">
                      <span className="sv-sel-item-icon" style={{ background: '#FFEBEE' }}>📅</span>
                      <div className="sv-sel-item-body">
                        <span className="sv-sel-item-label">Fin</span>
                        <span className="sv-sel-item-value">{endDate ? fmtDate(endDate) : '—'}</span>
                      </div>
                    </div>

                    {hasRange && (
                      <>
                        <div className="sv-sel-item">
                          <span className="sv-sel-item-icon" style={{ background: '#E8F5E9' }}>📊</span>
                          <div className="sv-sel-item-body">
                            <span className="sv-sel-item-label">Días laborables</span>
                            <span className="sv-sel-item-value">{days} días</span>
                          </div>
                        </div>

                        <div className="sv-sel-item">
                          <span className="sv-sel-item-icon" style={{ background: '#E3F2FD' }}>✈️</span>
                          <div className="sv-sel-item-body">
                            <span className="sv-sel-item-label">Retorno al trabajo</span>
                            <span className="sv-sel-item-value">{fmtDate(returnDate)}</span>
                          </div>
                        </div>

                        <p className="sv-sel-note">Se cuentan solo tus días de trabajo</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Details + Options card ──────────────────────── */}
          <div className="sv-right-card">
            {/*
             * Tipo + Horario: siempre visible en desktop.
             * En mobile: se muestra una fila resumen colapsable;
             * al abrirla aparecen las dos filas de detalle.
             */}
            <div className="sv-details-section">
              {/* Fila resumen solo visible en mobile */}
              <button
                className="sv-details-toggle"
                onClick={() => setDetailsOpen((v) => !v)}
                aria-expanded={detailsOpen}
              >
                <span className="sv-detail-icon" style={{ background: '#EFF6FF' }}>📋</span>
                <div className="sv-detail-text">
                  <span className="sv-detail-label">Detalles de la solicitud</span>
                  <span className="sv-detail-value">Vacaciones · Lun–Vie 08:00–17:00</span>
                </div>
                <span className={`sv-details-chevron${detailsOpen ? ' sv-details-chevron--open' : ''}`}>
                  ›
                </span>
              </button>

              {/* Filas de detalle: siempre visibles en desktop, desplegables en mobile */}
              <div className={`sv-details-body${detailsOpen ? ' sv-details-body--open' : ''}`}>
                {/* Tipo de vacaciones */}
                <div className="sv-detail-row">
                  <span className="sv-detail-icon" style={{ background: '#E3F2FD' }}>🏖️</span>
                  <div className="sv-detail-text">
                    <span className="sv-detail-label">Tipo de vacaciones</span>
                    <span className="sv-detail-value">Vacaciones (días laborables)</span>
                  </div>
                  <span className="sv-detail-chevron">›</span>
                </div>

                {/* Horario laboral */}
                <div className="sv-detail-row">
                  <span className="sv-detail-icon" style={{ background: '#F3E5F5' }}>⏰</span>
                  <div className="sv-detail-text">
                    <span className="sv-detail-label">Horario laboral</span>
                    <span className="sv-detail-value">Lunes a Viernes · 08:00 a 17:00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="sv-opts">
              <div className="sv-opts-title">
                ¿Necesitas algo adicional?
                <span className="sv-opts-badge">(Opcional)</span>
              </div>

              <div className="sv-toggle-row">
                <span className="sv-toggle-icon" style={{ background: '#EDE7F6' }}>✈️</span>
                <div className="sv-toggle-text">
                  <strong>Adelanto de vacaciones</strong>
                  <span>Pedir días por adelantado</span>
                </div>
                <button
                  type="button"
                  className="wz-toggle"
                  onClick={() => setAdvanceRequest((v) => !v)}
                  aria-pressed={advanceRequest}
                >
                  <span className={`wz-toggle-track${advanceRequest ? ' on' : ''}`}>
                    <span className="wz-toggle-thumb" />
                  </span>
                </button>
              </div>

              <div className="sv-toggle-row">
                <span className="sv-toggle-icon" style={{ background: '#E8F5E9' }}>💰</span>
                <div className="sv-toggle-text">
                  <strong>Préstamo de vacaciones</strong>
                  <span>Pedir días adicionales</span>
                </div>
                <button
                  type="button"
                  className="wz-toggle"
                  onClick={() => setLoanRequest((v) => !v)}
                  aria-pressed={loanRequest}
                >
                  <span className={`wz-toggle-track${loanRequest ? ' on' : ''}`}>
                    <span className="wz-toggle-thumb" />
                  </span>
                </button>
              </div>
            </div>

            {/* Comment */}
            <div className="sv-comment">
              <label className="sv-comment-label">
                Comentario{' '}
                <span className="sv-comment-optional">(opcional)</span>
              </label>
              <textarea
                className="sv-comment-area"
                placeholder="Escribe un comentario si lo deseas..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                maxLength={250}
                rows={4}
              />
              <div className="sv-comment-count">{comments.length}/250</div>
            </div>

            {/* Mobile-only submit button */}
            <div className="sv-mobile-submit">
              <button
                className="sv-submit-btn"
                onClick={handleSubmitClick}
                disabled={!startDate || !endDate}
              >
                Enviar solicitud <span className="sv-submit-icon">✈</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop bottom action bar ────────────────────────────── */}
      <div className="sv-bottom-bar">
        <div className="sv-bottom-info">
          <span className="sv-bottom-info-icon">ℹ️</span>
          <span>
            Tu solicitud será enviada a{' '}
            <strong>
              {isRotativo ? 'tu jefe directo y Administración GH' : 'tu jefe directo'}
            </strong>
            {' '}para aprobación. Te notificaremos por correo y en el centro de tareas.
          </span>
        </div>
        <button
          className="sv-submit-btn"
          onClick={handleSubmitClick}
          disabled={!startDate || !endDate}
        >
          Enviar solicitud <span className="sv-submit-icon">✈</span>
        </button>
      </div>

      {/* ── Confirmation modal ───────────────────────────────────── */}
      {showConfirm && (
        <div className="wz-overlay" onClick={() => setShowConfirm(false)}>
          <div className="wz-modal sv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wz-modal-header sv-modal-header">
              <div>
                <div className="wz-modal-title">Revisa tu solicitud</div>
                <div className="sv-modal-subtitle">
                  Confirma los detalles antes de enviar.
                </div>
              </div>
              <button className="wz-modal-close" onClick={() => setShowConfirm(false)}>✕</button>
            </div>

            <div className="wz-modal-body">
              <div className="sv-confirm-grid">
                {/* Left column */}
                <div className="sv-confirm-col">
                  <div className="sv-confirm-item">
                    <span className="sv-confirm-item-label">
                      <span className="sv-ci-icon">👤</span> Colaborador
                    </span>
                    <span className="sv-confirm-item-value">{user.name}</span>
                  </div>
                  <div className="sv-confirm-item">
                    <span className="sv-confirm-item-label">
                      <span className="sv-ci-icon">🏢</span> Área
                    </span>
                    <span className="sv-confirm-item-value">{user.department}</span>
                  </div>
                  <div className="sv-confirm-item">
                    <span className="sv-confirm-item-label">
                      <span className="sv-ci-icon">🏖️</span> Tipo de vacaciones
                    </span>
                    <span className="sv-confirm-item-value">Vacaciones (días laborables)</span>
                  </div>
                  <div className="sv-confirm-item">
                    <span className="sv-confirm-item-label">
                      <span className="sv-ci-icon">⏰</span> Horario laboral
                    </span>
                    <span className="sv-confirm-item-value">Lunes a Viernes · 08:00 a 17:00</span>
                  </div>
                </div>

                {/* Right column */}
                <div className="sv-confirm-col">
                  <div className="sv-confirm-item">
                    <span className="sv-confirm-item-label">
                      <span className="sv-ci-icon">📅</span> Inicio
                    </span>
                    <span className="sv-confirm-item-value">{fmtDate(startDate)}</span>
                  </div>
                  <div className="sv-confirm-item">
                    <span className="sv-confirm-item-label">
                      <span className="sv-ci-icon">📅</span> Fin
                    </span>
                    <span className="sv-confirm-item-value">{fmtDate(endDate)}</span>
                  </div>
                  <div className="sv-confirm-item">
                    <span className="sv-confirm-item-label">
                      <span className="sv-ci-icon">📊</span> Días laborables
                    </span>
                    <span className="sv-confirm-item-value sv-confirm-item-value--accent">
                      {days} días
                    </span>
                  </div>
                  <div className="sv-confirm-item">
                    <span className="sv-confirm-item-label">
                      <span className="sv-ci-icon">↩️</span> Retorno al trabajo
                    </span>
                    <span className="sv-confirm-item-value">{fmtDate(returnDate)}</span>
                  </div>
                  <div className="sv-confirm-item">
                    <span className="sv-confirm-item-label">
                      <span className="sv-ci-icon">💬</span> Comentario
                    </span>
                    <span className="sv-confirm-item-value sv-confirm-item-value--muted">
                      {comments.trim() || 'Sin comentarios'}
                    </span>
                  </div>

                  {/* Approver card */}
                  <div className="sv-approver-card">
                    <div className="sv-approver-header">Aprobador</div>
                    <div className="sv-approver-row">
                      <div className="sv-approver-avatar">{approverInitials}</div>
                      <div>
                        <div className="sv-approver-name">{user.approver ?? 'Jefe Directo'}</div>
                        <div className="sv-approver-role">Jefe Directo</div>
                      </div>
                    </div>
                    <div className="sv-approver-note">
                      <span>✅</span>
                      <span>
                        Tu solicitud será enviada a tu jefe directo para aprobación.
                        Te notificaremos por correo y en el centro de tareas.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="wz-modal-footer">
              <button className="wz-btn wz-btn-outline" onClick={() => setShowConfirm(false)}>
                Cancelar
              </button>
              <button className="wz-btn wz-btn-primary sv-confirm-btn" onClick={handleConfirm}>
                Confirmar solicitud ✈
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom navigation ─────────────────────────────── */}
      <nav className="sv-mobile-nav" aria-label="Navegación principal">
        <div className="sv-mobile-nav-inner-wrap">
          <button className="sv-nav-item" onClick={() => onNavigate('inicio')}>
            <span className="sv-nav-icon">🏠</span>
            <span className="sv-nav-label">Inicio</span>
          </button>
          <button className="sv-nav-item" onClick={() => onNavigate('mis-solicitudes')}>
            <span className="sv-nav-icon">📋</span>
            <span className="sv-nav-label">Solicitudes</span>
          </button>
          <button className="sv-nav-item sv-nav-item--fab">
            <span className="sv-nav-fab">+</span>
            <span className="sv-nav-label sv-nav-label--active">Vacaciones</span>
          </button>
          {(user.role === 'jefe_aprobador' || user.role === 'administrador_gh') && (
            <button
              className="sv-nav-item"
              onClick={() => onNavigate('solicitudes-pendientes', 'aprobaciones')}
            >
              <span className="sv-nav-icon">✅</span>
              <span className="sv-nav-label">Aprobac.</span>
            </button>
          )}
          <button className="sv-nav-item">
            <span className="sv-nav-icon">👤</span>
            <span className="sv-nav-label">Perfil</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default SolicitudVacaciones;
