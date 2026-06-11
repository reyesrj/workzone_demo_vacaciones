import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { USERS, ROLE_LABELS } from '../data/users';
import type { User } from '../data/users';
import { INITIAL_REQUESTS } from '../data/vacationRequests';
import type { VacationRequest, RequestStatus } from '../data/vacationRequests';
import type { NavigateFn } from '../types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** "1 día hábil" / "N días hábiles" */
const dayLabel = (n: number) => n === 1 ? '1 día hábil' : `${n} días hábiles`;

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

/* ── Status helpers for "Mis solicitudes" tab ─────────────────── */
type MisTab = 'pendientes' | 'aprobadas' | 'rechazadas' | 'anuladas';

const MIS_STATUS_GROUPS: Record<MisTab, RequestStatus[]> = {
  pendientes: ['creado', 'pendiente_jefe', 'aprobado_jefe', 'pendiente_gh', 'pendiente_anulacion'],
  aprobadas:  ['aprobado'],
  rechazadas: ['rechazado', 'anulacion_rechazada'],
  anuladas:   ['anulado'],
};

const MIS_STATUS_LABEL: Record<RequestStatus, { label: string; cls: string }> = {
  creado:              { label: 'Creado',          cls: 'info'    },
  pendiente_jefe:      { label: 'Pendiente',        cls: 'warning' },
  aprobado_jefe:       { label: 'Aprob. Jefe',      cls: 'info'    },
  pendiente_gh:        { label: 'Pend. GH',          cls: 'warning' },
  aprobado:            { label: 'Aprobada',          cls: 'success' },
  rechazado:           { label: 'Rechazada',         cls: 'error'   },
  pendiente_anulacion: { label: 'Anulación pend.',   cls: 'warning' },
  anulado:             { label: 'Anulada',           cls: 'neutral' },
  anulacion_rechazada: { label: 'Anul. rechazada',   cls: 'error'   },
};

const ANNUL_REASONS = [
  'Cambio de planes',
  'Emergencia personal',
  'Motivo laboral',
  'Postergación acordada con el jefe',
  'Otro',
];

const MIS_PAGE_SIZE = 5;

interface Props {
  user: User;
  requests: VacationRequest[];
  onAddRequest: (req: VacationRequest) => void;
  onUpdateStatus: (id: string, status: RequestStatus, by: string, comment?: string) => void;
  onUpdateRequest: (id: string, updates: { startDate: string; endDate: string; days: number }) => void;
  onNavigate: NavigateFn;
  initialTab?: 'nueva' | 'mis';
}

const SolicitudVacaciones: React.FC<Props> = ({ user, requests, onAddRequest, onUpdateStatus, onUpdateRequest, onNavigate, initialTab }) => {
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
  const [localPhoto, setLocalPhoto]     = useState<string | null>(null);

  /* ── Tab system ─────────────────────────────────────────────── */
  const [mainTab,    setMainTab]    = useState<'nueva' | 'mis'>(initialTab ?? 'nueva');

  /* ── Mis solicitudes ─────────────────────────────────────────── */
  const [misTab,     setMisTab]     = useState<MisTab>('pendientes');
  const [misSearch,  setMisSearch]  = useState('');
  const [misPage,    setMisPage]    = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  /* ── Detail modal ────────────────────────────────────────────── */
  const [showDetail,  setShowDetail]  = useState(false);
  const [detailReq,   setDetailReq]   = useState<VacationRequest | null>(null);

  /* ── Edit modal ──────────────────────────────────────────────── */
  const [showEdit,    setShowEdit]    = useState(false);
  const [editReq,     setEditReq]     = useState<VacationRequest | null>(null);
  const [editStart,   setEditStart]   = useState('');
  const [editEnd,     setEditEnd]     = useState('');
  const [editYear,    setEditYear]    = useState(new Date().getFullYear());
  const [editMonth,   setEditMonth]   = useState(new Date().getMonth());
  const [editErr,     setEditErr]     = useState('');

  /* ── Annul modal ─────────────────────────────────────────────── */
  const [showAnnul,   setShowAnnul]   = useState(false);
  const [annulReq,    setAnnulReq]    = useState<VacationRequest | null>(null);
  const [annulReason, setAnnulReason] = useState('');
  const [annulObs,    setAnnulObs]    = useState('');
  const [annulErr,    setAnnulErr]    = useState('');

  /* ── Annul confirmation ──────────────────────────────────────── */
  const [showAnnulDone, setShowAnnulDone] = useState(false);
  const [annulDoneReq,  setAnnulDoneReq]  = useState<VacationRequest | null>(null);

  /* close any open menu on outside click */
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarPhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') setLocalPhoto(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';   // reset so the same file can be re-selected
  }, []);

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
  const approverUser  = user.managerId ? USERS.find((u) => u.id === user.managerId) : null;
  const approverPhoto = approverUser?.photo;
  const approverName  = user.approver ?? 'tu jefe directo';

  /* ── Mis solicitudes data ──────────────────────────────────── */
  const canEdit  = (r: VacationRequest) =>
    ['creado', 'pendiente_jefe'].includes(r.status);

  const canAnnul = (r: VacationRequest) =>
    r.status === 'aprobado' && r.startDate > today;

  const misCounts = useMemo(() => ({
    pendientes: requests.filter(r => MIS_STATUS_GROUPS.pendientes.includes(r.status)).length,
    aprobadas:  requests.filter(r => MIS_STATUS_GROUPS.aprobadas.includes(r.status)).length,
    rechazadas: requests.filter(r => MIS_STATUS_GROUPS.rechazadas.includes(r.status)).length,
    anuladas:   requests.filter(r => MIS_STATUS_GROUPS.anuladas.includes(r.status)).length,
  }), [requests]);

  const misFiltered = useMemo(() => {
    const group = MIS_STATUS_GROUPS[misTab];
    return requests
      .filter(r => group.includes(r.status))
      .filter(r => !misSearch || r.id.toLowerCase().includes(misSearch.toLowerCase()))
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [requests, misTab, misSearch]);

  const misTotalPages = Math.max(1, Math.ceil(misFiltered.length / MIS_PAGE_SIZE));
  const misPaged = misFiltered.slice((misPage - 1) * MIS_PAGE_SIZE, misPage * MIS_PAGE_SIZE);

  /* ── Action handlers ────────────────────────────────────────── */
  const openDetail = (r: VacationRequest) => {
    setDetailReq(r); setShowDetail(true); setOpenMenuId(null);
  };

  const openEdit = (r: VacationRequest) => {
    setEditReq(r);
    setEditStart(r.startDate); setEditEnd(r.endDate);
    const dt = new Date(r.startDate + 'T00:00:00');
    setEditYear(dt.getFullYear()); setEditMonth(dt.getMonth());
    setEditErr('');
    setShowEdit(true); setOpenMenuId(null);
  };

  const handleSaveEdit = () => {
    if (!editReq) return;
    if (!editStart || !editEnd) { setEditErr('Selecciona ambas fechas.'); return; }
    if (editEnd < editStart)    { setEditErr('La fecha fin debe ser ≥ inicio.'); return; }
    const newDays = countWorkingDays(editStart, editEnd);
    if (newDays === 0)          { setEditErr('El período no contiene días hábiles.'); return; }
    if (newDays > user.vacationBalance) { setEditErr(`Saldo insuficiente (${user.vacationBalance} días disponibles).`); return; }
    onUpdateRequest(editReq.id, { startDate: editStart, endDate: editEnd, days: newDays });
    setShowEdit(false);
  };

  const openAnnul = (r: VacationRequest) => {
    setAnnulReq(r); setAnnulReason(''); setAnnulObs(''); setAnnulErr('');
    setShowAnnul(true); setOpenMenuId(null);
  };

  const handleConfirmAnnul = () => {
    if (!annulReq) return;
    if (!annulReason) { setAnnulErr('Selecciona un motivo de anulación.'); return; }
    const comment = annulObs.trim()
      ? `${annulReason}. ${annulObs.trim()}`
      : annulReason;
    const doneReq = annulReq;
    onUpdateStatus(annulReq.id, 'pendiente_anulacion', user.name, comment);
    setShowAnnul(false);
    setAnnulDoneReq(doneReq);
    setShowAnnulDone(true);
    setMainTab('mis');
  };

  /* ── Edit calendar cells ─────────────────────────────────────── */
  const editCalCells = getCalendarDays(editYear, editMonth);

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
    const returnDate = calcReturnDate(endDate);
    return (
      <div className="wz-space-page sv-sent-page">
        <div className="wz-breadcrumb">Mis Vacaciones › Solicitar Vacaciones</div>
        <h2 className="wz-page-heading">Solicitar Vacaciones</h2>

        <div className="sv-sent-card">
          {/* ── Green check circle ── */}
          <div className="sv-sent-check-wrap">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M8 18l7 8L28 10" stroke="#4CAF50" strokeWidth="3.5"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h3 className="sv-sent-title">¡Solicitud enviada!</h3>
          <p className="sv-sent-sub">
            Tu solicitud de vacaciones ha sido enviada a{' '}
            <strong>{approverName}</strong>{' '}
            {isRotativo ? 'y Administración GH ' : ''}para aprobación.
          </p>

          {/* ── Summary box ── */}
          <div className="sv-sent-summary">
            <div className="sv-sent-summary-hdr">Resumen de tu solicitud</div>
            <div className="sv-sent-row">
              <span className="sv-sent-row-lbl">Fechas</span>
              <span className="sv-sent-row-val">{fmtDate(startDate)} – {fmtDate(endDate)}</span>
            </div>
            <div className="sv-sent-row">
              <span className="sv-sent-row-lbl">Días laborables</span>
              <span className="sv-sent-row-val">{days} {days === 1 ? 'día' : 'días'} (días útiles)</span>
            </div>
            <div className="sv-sent-row">
              <span className="sv-sent-row-lbl">Retorno al trabajo</span>
              <span className="sv-sent-row-val">{fmtDate(returnDate)}</span>
            </div>
          </div>

          {/* ── Actions ── */}
          <button
            className="sv-sent-btn-primary"
            onClick={() => {
              setSubmitted(false);
              setMainTab('mis');
              setMisTab('pendientes');
            }}
          >
            Ir a Mis solicitudes
          </button>
          <button className="sv-sent-link" onClick={handleReset}>
            Crear nueva solicitud
          </button>
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
            {/* Avatar with upload button */}
            <div className="sv-hero-avatar-wrap">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarPhotoChange}
              />
              <div
                className="sv-hero-avatar"
                style={(localPhoto || user.photo) ? { background: 'transparent', padding: 0, overflow: 'hidden' } : {}}
              >
                {localPhoto
                  ? <img src={localPhoto} alt={user.name} className="sv-avatar-img" />
                  : user.photo
                    ? <img src={`${import.meta.env.BASE_URL}${user.photo}`} alt={user.name} className="sv-avatar-img" />
                    : user.initials}
              </div>
              <button
                className="sv-hero-avatar-btn"
                title="Actualizar foto de perfil"
                aria-label="Actualizar foto de perfil"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2.5h4l1.5 1.5H12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1.5L5 2.5Z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
                  <circle cx="7" cy="7.5" r="1.8" stroke="white" strokeWidth="1.2"/>
                </svg>
              </button>
            </div>

            <div className="sv-hero-info">
              <div className="sv-hero-name">Hola, {firstName} 👋</div>
              {/* Desktop: departamento */}
              <div className="sv-hero-dept">{user.department}</div>
              {/* Texto amigable — en mobile aparece ENCIMA del balance via CSS order */}
              <p className="sv-hero-hint">
                ¿Cuántos días tengo disponibles?
              </p>
              {/* Mobile: balance de días */}
              <div className="sv-hero-mobile-balance">
                Tienes <strong>{user.vacationBalance} días</strong> disponibles
              </div>
            </div>
          </div>
          {/* Beach illustration (hidden — replaced by CSS bg image) */}
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

        {/* ── Page tabs: Nueva solicitud | Mis solicitudes ─────────── */}
        <div className="sv-page-tabs">
          <button
            className={`sv-page-tab${mainTab === 'nueva' ? ' sv-page-tab--active' : ''}`}
            onClick={() => setMainTab('nueva')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1.5 6h13" stroke="currentColor" strokeWidth="1.1"/>
              <rect x="4.5" y="1" width="1.2" height="3" rx="0.6" fill="currentColor"/>
              <rect x="10.3" y="1" width="1.2" height="3" rx="0.6" fill="currentColor"/>
              <path d="M5 9.5h2M9 9.5h2M5 11.5h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            Nueva solicitud
          </button>
          <button
            className={`sv-page-tab${mainTab === 'mis' ? ' sv-page-tab--active' : ''}`}
            onClick={() => setMainTab('mis')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="1.5" width="12" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            Mis solicitudes
            {misCounts.pendientes > 0 && (
              <span className="sv-page-tab-badge">{misCounts.pendientes}</span>
            )}
          </button>
        </div>

        {/* ── Main two-column grid ────────────────────────────────── */}
        {mainTab === 'nueva' && <div className="sv-main-grid">

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
        </div>}
        {/* ═══════════════════════════════════════════════════════
            TAB 2: MIS SOLICITUDES
            ═══════════════════════════════════════════════════════ */}
        {mainTab === 'mis' && (
          <div className="ms2-wrap">
            {/* ── Annul confirmation state ─────────────────── */}
            {showAnnulDone && annulDoneReq ? (
              <div className="ms2-annul-done">
                <div className="ms2-annul-done-circle">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="23" fill="#E8F5E9" stroke="#43A047" strokeWidth="2"/>
                    <path d="M13 24l8 8 14-16" stroke="#43A047" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="ms2-annul-done-title">¡Solicitud anulada!</h3>
                <p className="ms2-annul-done-sub">Tu solicitud ha sido anulada correctamente.</p>
                <div className="ms2-annul-done-detail">
                  <div className="ms2-done-row"><span>Solicitud</span><strong>{annulDoneReq.id}</strong></div>
                  <div className="ms2-done-row"><span>Fechas</span><strong>{fmtDate(annulDoneReq.startDate)} – {fmtDate(annulDoneReq.endDate)}</strong></div>
                  <div className="ms2-done-row"><span>Anulada el</span><strong>{new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })}</strong></div>
                </div>
                <button className="ms2-done-btn" onClick={() => { setShowAnnulDone(false); setAnnulDoneReq(null); }}>
                  Ir a Mis solicitudes
                </button>
              </div>
            ) : (
              <>
                {/* ── Sub-tabs ─────────────────────────────────── */}
                <div className="ms2-tabs">
                  {(['pendientes','aprobadas','rechazadas','anuladas'] as MisTab[]).map(tab => (
                    <button
                      key={tab}
                      className={`ms2-tab${misTab === tab ? ' ms2-tab--active' : ''}`}
                      onClick={() => { setMisTab(tab); setMisPage(1); }}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {misCounts[tab] > 0 && <span className="ms2-tab-badge">{misCounts[tab]}</span>}
                    </button>
                  ))}
                </div>

                {/* ── Toolbar: search + filter ──────────────────── */}
                <div className="ms2-toolbar">
                  <div className="ms2-search-wrap">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="ms2-search-ico">
                      <circle cx="6.5" cy="6.5" r="5" stroke="#888" strokeWidth="1.4"/>
                      <path d="M11 11l3.5 3.5" stroke="#888" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    <input
                      className="ms2-search"
                      type="text"
                      placeholder="Buscar por número de solicitud"
                      value={misSearch}
                      onChange={e => { setMisSearch(e.target.value); setMisPage(1); }}
                    />
                  </div>
                  <button className="ms2-filter-btn" title="Filtros">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M1.5 3.5h13M4 8h8M6.5 12.5h3" stroke="#555" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {misFiltered.length === 0 ? (
                  <div className="ms2-empty">
                    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                      <circle cx="22" cy="22" r="21" fill="#FFF5F5" stroke="#FFCDD2" strokeWidth="1.5"/>
                      <path d="M13 22h18M22 13v18" stroke="#E53935" strokeWidth="1.5" strokeLinecap="round" opacity=".3"/>
                    </svg>
                    <p>No hay solicitudes en esta categoría.</p>
                  </div>
                ) : (
                  <>
                    {/* ── Desktop table ─────────────────────────── */}
                    <div className="ms2-table-wrap">
                      <table className="ms2-table">
                        <thead>
                          <tr>
                            <th>Solicitud</th>
                            <th>Fechas</th>
                            <th>Días (útiles)</th>
                            <th>Estado</th>
                            <th>Jefe aprobador</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {misPaged.map(req => {
                            const tag = MIS_STATUS_LABEL[req.status];
                            const approver = req.currentApprover ?? req.history.find(h => h.actorRole?.includes('Jefe'))?.by ?? '—';
                            return (
                              <tr key={req.id} className={`ms2-row${req.id === openMenuId ? ' ms2-row--menu-open' : ''}`}>
                                <td>
                                  <div className="ms2-cell-id">{req.id}</div>
                                  <div className="ms2-cell-created">
                                    Creada: {fmtDate(req.history[0]?.date ?? '')}
                                  </div>
                                  <div className="ms2-cell-return">
                                    Retorno: {fmtDate(calcReturnDate(req.endDate))}
                                  </div>
                                </td>
                                <td>
                                  <div className="ms2-cell-dates">{fmtDate(req.startDate)} –</div>
                                  <div className="ms2-cell-dates">{fmtDate(req.endDate)}</div>
                                </td>
                                <td><strong>{req.days} días</strong></td>
                                <td>
                                  <span className={`ms2-pill ms2-pill--${tag.cls}`}>{tag.label}</span>
                                </td>
                                <td className="ms2-td-approver">{approver}</td>
                                <td>
                                  <div className="ms2-action-cell">
                                    <button
                                      className="ms2-action-btn"
                                      aria-label="Acciones"
                                      onClick={e => { e.stopPropagation(); setOpenMenuId(id => id === req.id ? null : req.id); }}
                                    >
                                      <span className="ms2-dots">•••</span>
                                    </button>
                                    {openMenuId === req.id && (
                                      <div className="ms2-action-menu" onClick={e => e.stopPropagation()}>
                                        <button className="ms2-menu-item" onClick={() => openDetail(req)}>
                                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#555" strokeWidth="1.2"/><path d="M7 6v4M7 5h.01" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>
                                          Ver detalle
                                        </button>
                                        {canEdit(req) && (
                                          <button className="ms2-menu-item" onClick={() => openEdit(req)}>
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="#555" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                                            Editar solicitud
                                          </button>
                                        )}
                                        {canAnnul(req) && (
                                          <button className="ms2-menu-item ms2-menu-item--danger" onClick={() => openAnnul(req)}>
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#C62828" strokeWidth="1.2"/><path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#C62828" strokeWidth="1.2" strokeLinecap="round"/></svg>
                                            Anular solicitud
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* ── Mobile cards ──────────────────────────── */}
                    <div className="ms2-cards-list">
                      {misPaged.map(req => {
                        const tag = MIS_STATUS_LABEL[req.status];
                        const approver = req.currentApprover ?? '—';
                        return (
                          <div key={req.id} className="ms2-card">
                            <div className="ms2-card-top">
                              <div>
                                <div className="ms2-card-id">{req.id}</div>
                                <div className="ms2-card-dates">{fmtDate(req.startDate)} – {fmtDate(req.endDate)}</div>
                                <div className="ms2-card-days">{req.days} días útiles · Retorno: {fmtDate(calcReturnDate(req.endDate))}</div>
                              </div>
                              <div className="ms2-card-right">
                                <span className={`ms2-pill ms2-pill--${tag.cls}`}>{tag.label}</span>
                                <div className="ms2-card-action-wrap">
                                  <button
                                    className="ms2-action-btn"
                                    aria-label="Acciones"
                                    onClick={e => { e.stopPropagation(); setOpenMenuId(id => id === req.id ? null : req.id); }}
                                  >
                                    <span className="ms2-dots">•••</span>
                                  </button>
                                  {openMenuId === req.id && (
                                    <div className="ms2-action-menu ms2-action-menu--card" onClick={e => e.stopPropagation()}>
                                      <button className="ms2-menu-item" onClick={() => openDetail(req)}>
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#555" strokeWidth="1.2"/><path d="M7 6v4M7 5h.01" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>
                                        Ver detalle
                                      </button>
                                      {canEdit(req) && (
                                        <button className="ms2-menu-item" onClick={() => openEdit(req)}>
                                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="#555" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                                          Editar solicitud
                                        </button>
                                      )}
                                      {canAnnul(req) && (
                                        <button className="ms2-menu-item ms2-menu-item--danger" onClick={() => openAnnul(req)}>
                                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#C62828" strokeWidth="1.2"/><path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#C62828" strokeWidth="1.2" strokeLinecap="round"/></svg>
                                          Anular solicitud
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="ms2-card-footer">
                              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6" cy="5" r="2.5" stroke="#888" strokeWidth="1.1"/><path d="M1 12c0-2.76 2.24-5 5-5" stroke="#888" strokeWidth="1.1" strokeLinecap="round"/></svg>
                              {approver}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Pagination ────────────────────────────── */}
                    {misTotalPages > 1 && (
                      <div className="ms2-pagination">
                        <span className="ms2-pag-info">
                          {Math.min((misPage-1)*MIS_PAGE_SIZE+1, misFiltered.length)}–{Math.min(misPage*MIS_PAGE_SIZE, misFiltered.length)} de {misFiltered.length}
                        </span>
                        <div className="ms2-pag-btns">
                          <button className="ms2-pag-btn" disabled={misPage===1} onClick={()=>setMisPage(p=>p-1)}>‹</button>
                          {Array.from({length: misTotalPages}, (_, i) => (
                            <button
                              key={i}
                              className={`ms2-pag-num${misPage===i+1?' ms2-pag-num--active':''}`}
                              onClick={()=>setMisPage(i+1)}
                            >{i+1}</button>
                          ))}
                          <button className="ms2-pag-btn" disabled={misPage===misTotalPages} onClick={()=>setMisPage(p=>p+1)}>›</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop bottom action bar ────────────────────────────── */}
      <div className="sv-bottom-bar">
        <div className="sv-bottom-info">
          <span className="sv-bottom-info-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" fill="#0070F2" opacity="0.15"/>
              <circle cx="9" cy="9" r="8" stroke="#0070F2" strokeWidth="1.4"/>
              <rect x="8.2" y="7.5" width="1.6" height="5.5" rx="0.8" fill="#0070F2"/>
              <circle cx="9" cy="5.5" r="0.9" fill="#0070F2"/>
            </svg>
          </span>
          <span className="sv-bottom-info-text">
            Tu solicitud será enviada a{' '}
            <strong className="sv-bottom-info-name">
              {isRotativo ? `${approverName} y Administración GH` : approverName}
            </strong>
            {' '}para aprobación.{' '}
            <span className="sv-bottom-info-sub">Te notificaremos por correo y en el centro de tareas.</span>
          </span>
        </div>
        <button
          className="sv-submit-btn"
          onClick={handleSubmitClick}
          disabled={!startDate || !endDate}
        >
          Enviar solicitud
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="sv-submit-icon-svg">
            <path d="M2 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ── Confirmation modal ───────────────────────────────────── */}
      {/* ══════════ MODAL: VER DETALLE ══════════════════════════════ */}
      {showDetail && detailReq && (
        <div className="wz-overlay" onClick={() => setShowDetail(false)}>
          <div className="ms2-modal" onClick={e => e.stopPropagation()}>
            <div className="ms2-modal-header">
              <span className="ms2-modal-title">Detalle de solicitud</span>
              <button className="wz-modal-close" onClick={() => setShowDetail(false)}>✕</button>
            </div>
            <div className="ms2-modal-body">
              <div className="ms2-detail-row"><span>N° Solicitud</span><strong>{detailReq.id}</strong></div>
              <div className="ms2-detail-row"><span>Fechas</span><strong>{fmtDate(detailReq.startDate)} – {fmtDate(detailReq.endDate)}</strong></div>
              <div className="ms2-detail-row"><span>Días</span><strong>{detailReq.days} días útiles</strong></div>
              <div className="ms2-detail-row"><span>Retorno</span><strong>{fmtDate(calcReturnDate(detailReq.endDate))}</strong></div>
              <div className="ms2-detail-row"><span>Estado</span>
                <span className={`ms2-pill ms2-pill--${MIS_STATUS_LABEL[detailReq.status].cls}`}>
                  {MIS_STATUS_LABEL[detailReq.status].label}
                </span>
              </div>
              {detailReq.currentApprover && (
                <div className="ms2-detail-row"><span>Jefe aprobador</span><strong>{detailReq.currentApprover}</strong></div>
              )}
              {detailReq.comments && (
                <div className="ms2-detail-row ms2-detail-row--comment">
                  <span>Comentario</span><p>{detailReq.comments}</p>
                </div>
              )}
              <div className="ms2-detail-timeline">
                <div className="ms2-timeline-title">Historial</div>
                {detailReq.history.map((h, i) => (
                  <div key={i} className="ms2-tl-item">
                    <div className={`ms2-tl-dot ms2-tl-dot--${MIS_STATUS_LABEL[h.status]?.cls ?? 'info'}`}/>
                    <div className="ms2-tl-body">
                      <div className="ms2-tl-label">{h.label}</div>
                      <div className="ms2-tl-meta">{h.by}{h.date ? ` · ${fmtDate(h.date)}` : ''}{h.time ? `, ${h.time}` : ''}</div>
                      {h.comment && <div className="ms2-tl-comment">"{h.comment}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="ms2-modal-footer">
              <button className="wz-btn wz-btn-primary" onClick={() => setShowDetail(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: EDITAR SOLICITUD ════════════════════════ */}
      {showEdit && editReq && (
        <div className="wz-overlay" onClick={() => setShowEdit(false)}>
          <div className="ms2-modal ms2-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="ms2-modal-header">
              <span className="ms2-modal-title">Editar solicitud</span>
              <button className="wz-modal-close" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <div className="ms2-modal-body">
              <p className="ms2-edit-sub">Modifica las fechas o detalles de tu solicitud.</p>
              <div className="ms2-edit-subtitle">¿Cuándo quieres tomar tu descanso?</div>
              <p className="ms2-edit-hint">Selecciona las fechas de inicio y fin.</p>

              {editErr && <div className="sv-error-bar">⚠ {editErr}</div>}

              {/* Calendar */}
              <div className="ms2-edit-cal">
                <div className="sv-month-nav">
                  <button type="button" className="sv-month-btn" onClick={() => {
                    if (editMonth === 0) { setEditMonth(11); setEditYear(y => y-1); }
                    else setEditMonth(m => m-1);
                  }}>‹</button>
                  <span className="sv-month-label">{SPANISH_MONTHS[editMonth]} {editYear}</span>
                  <button type="button" className="sv-month-btn" onClick={() => {
                    if (editMonth === 11) { setEditMonth(0); setEditYear(y => y+1); }
                    else setEditMonth(m => m+1);
                  }}>›</button>
                </div>
                <div className="sv-grid">
                  {['L','M','M','J','V','S','D'].map((d,i) => (
                    <div key={i} className="sv-weekday">{d}</div>
                  ))}
                  {editCalCells.map(cell => {
                    const cd = cell.date.toISOString().split('T')[0];
                    const isStart  = editStart === cd;
                    const isEnd    = editEnd === cd;
                    const inRange  = editStart && editEnd
                      ? cell.date > new Date(editStart+'T00:00:00') && cell.date < new Date(editEnd+'T00:00:00')
                      : false;
                    return (
                      <button
                        key={cd}
                        type="button"
                        className={[
                          'sv-cell',
                          !cell.currentMonth ? 'sv-cell--off' : '',
                          cell.date.getDay()===0||cell.date.getDay()===6 ? 'sv-cell--weekend' : '',
                          isStart ? 'sv-cell--start' : '',
                          isEnd   ? 'sv-cell--end'   : '',
                          inRange ? 'sv-cell--range'  : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => {
                          if (!cell.currentMonth) return;
                          if (!editStart || (editStart && editEnd)) {
                            setEditStart(cd); setEditEnd('');
                          } else if (cd < editStart) {
                            setEditStart(cd); setEditEnd('');
                          } else {
                            setEditEnd(cd);
                          }
                          setEditErr('');
                        }}
                      >{cell.date.getDate()}</button>
                    );
                  })}
                </div>
                <div className="sv-legend">
                  <span className="sv-legend-item"><i className="sv-dot sv-dot--start"/>Inicio</span>
                  <span className="sv-legend-item"><i className="sv-dot sv-dot--end"/>Fin</span>
                  <span className="sv-legend-item"><i className="sv-dot sv-dot--range"/>Sel.</span>
                  <span className="sv-legend-item"><i className="sv-dot" style={{background:'#ddd'}}/>No lab.</span>
                </div>
              </div>

              {/* Tipo de tiempo */}
              <div className="ms2-edit-tipo">
                <div className="ms2-edit-tipo-row">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2C6.69 2 4 4.69 4 8c0 4 6 10 6 10s6-6 6-10c0-3.31-2.69-6-6-6z" stroke="#DA291C" strokeWidth="1.3" fill="#FFF5F5"/>
                    <circle cx="10" cy="8" r="2" stroke="#DA291C" strokeWidth="1.2"/>
                  </svg>
                  <div>
                    <div className="ms2-tipo-label">Tipo de tiempo</div>
                    <div className="ms2-tipo-val">Vacaciones días útiles</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{marginLeft:'auto'}}>
                    <path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="ms2-modal-footer ms2-modal-footer--2">
              <button className="wz-btn wz-btn-outline" onClick={() => setShowEdit(false)}>Cancelar</button>
              <button className="wz-btn wz-btn-primary" onClick={handleSaveEdit}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: ANULAR SOLICITUD ════════════════════════ */}
      {showAnnul && annulReq && (
        <div className="wz-overlay" onClick={() => setShowAnnul(false)}>
          <div className="ms2-modal" onClick={e => e.stopPropagation()}>
            <div className="ms2-modal-header">
              <span className="ms2-modal-title">Anular solicitud</span>
              <button className="wz-modal-close" onClick={() => setShowAnnul(false)}>✕</button>
            </div>
            <div className="ms2-modal-body">
              {/* Warning strip */}
              <div className="ms2-annul-warning">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L2 17h16L10 2Z" fill="#FFF3E0" stroke="#E65100" strokeWidth="1.3" strokeLinejoin="round"/>
                  <rect x="9.2" y="9" width="1.6" height="4.5" rx="0.8" fill="#E65100"/>
                  <circle cx="10" cy="15.5" r="0.9" fill="#E65100"/>
                </svg>
                <div>
                  <div className="ms2-annul-warn-title">Esta acción no se puede deshacer.</div>
                  <div className="ms2-annul-warn-body">La solicitud será anulada y no continuará con el proceso de aprobación.</div>
                </div>
              </div>

              <div className="ms2-field">
                <label className="ms2-label">Motivo de anulación <span className="ms2-required">*</span></label>
                <select
                  className={`ms2-select${annulErr ? ' ms2-select--error' : ''}`}
                  value={annulReason}
                  onChange={e => { setAnnulReason(e.target.value); setAnnulErr(''); }}
                >
                  <option value="">Selecciona el motivo</option>
                  {ANNUL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {annulErr && <span className="ms2-field-err">{annulErr}</span>}
              </div>

              <div className="ms2-field">
                <label className="ms2-label">Observaciones (opcional)</label>
                <textarea
                  className="ms2-textarea"
                  rows={3}
                  placeholder="Escribe más detalles (opcional)..."
                  maxLength={250}
                  value={annulObs}
                  onChange={e => setAnnulObs(e.target.value)}
                />
                <div className="ms2-char-count">{annulObs.length}/250</div>
              </div>
            </div>
            <div className="ms2-modal-footer ms2-modal-footer--2">
              <button className="wz-btn wz-btn-outline" onClick={() => setShowAnnul(false)}>Cancelar</button>
              <button className="wz-btn wz-btn-danger" onClick={handleConfirmAnnul}>Confirmar anulación</button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="wz-overlay" onClick={() => setShowConfirm(false)}>
          <div className="wz-modal sv-modal" onClick={(e) => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className="wz-modal-header sv-modal-header">
              <div className="sv-modal-header-title-group">
                <span className="sv-modal-header-icon" aria-hidden="true">
                  {/* Beach umbrella + sun */}
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="32" cy="12" r="8" fill="#FFB300"/>
                    <path d="M5 24 Q15 7 27 24 Z" fill="#DA291C"/>
                    <line x1="16" y1="10" x2="16" y2="24" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                    <line x1="10.5" y1="16" x2="10.5" y2="24" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                    <line x1="21.5" y1="14" x2="21.5" y2="24" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                    <line x1="16" y1="24" x2="20" y2="39" stroke="#8D6E63" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M7 40 Q20 37 33 40" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                <div>
                  <div className="wz-modal-title">Revisa tu solicitud</div>
                  <div className="sv-modal-subtitle">Confirma los detalles antes de enviar.</div>
                </div>
              </div>
              <button className="wz-modal-close" onClick={() => setShowConfirm(false)}>✕</button>
            </div>

            {/* ── Body: 3 columns ── */}
            <div className="wz-modal-body">
              <div className="sv-confirm-grid">

                {/* Col 1 – Employee info */}
                <div className="sv-confirm-col">
                  {/* Colaborador */}
                  <div className="sv-ci">
                    <span className="sv-ci-ico sv-ci-ico--gray">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3" stroke="#5A6069" strokeWidth="1.4"/><path d="M2.5 17c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5" stroke="#5A6069" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    </span>
                    <div className="sv-ci-body">
                      <span className="sv-ci-lbl">Colaborador</span>
                      <span className="sv-ci-val">{user.name}</span>
                    </div>
                  </div>

                  {/* Área */}
                  <div className="sv-ci">
                    <span className="sv-ci-ico sv-ci-ico--gray">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="11" height="14" rx="1" stroke="#5A6069" strokeWidth="1.4"/><line x1="2" y1="6" x2="13" y2="6" stroke="#5A6069" strokeWidth="1"/><rect x="5" y="10" width="2.5" height="6" rx="0.5" fill="#5A6069" opacity="0.4"/><rect x="8.5" y="9" width="2" height="2" rx="0.5" fill="#5A6069" opacity="0.4"/><rect x="5" y="9" width="2" height="2" rx="0.5" fill="#5A6069" opacity="0.4"/></svg>
                    </span>
                    <div className="sv-ci-body">
                      <span className="sv-ci-lbl">Área</span>
                      <span className="sv-ci-val">{user.department}</span>
                    </div>
                  </div>

                  {/* Tipo de vacaciones */}
                  <div className="sv-ci">
                    <span className="sv-ci-ico sv-ci-ico--gray">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 6h11M10 3.5l3.5 2.5L10 8.5" stroke="#5A6069" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12H4m4 2.5L4.5 12 8 9.5" stroke="#5A6069" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    <div className="sv-ci-body">
                      <span className="sv-ci-lbl">Tipo de vacaciones</span>
                      <span className="sv-ci-val">Vacaciones (días laborables)</span>
                    </div>
                  </div>

                  {/* Horario laboral */}
                  <div className="sv-ci">
                    <span className="sv-ci-ico sv-ci-ico--gray">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#5A6069" strokeWidth="1.4"/><path d="M9 5.5V9l2.5 2" stroke="#5A6069" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    <div className="sv-ci-body">
                      <span className="sv-ci-lbl">Horario laboral</span>
                      <span className="sv-ci-val">Lunes a Viernes – 08:00 a 17:00</span>
                    </div>
                  </div>
                </div>

                {/* Col 2 – Dates */}
                <div className="sv-confirm-col">
                  {/* Inicio */}
                  <div className="sv-ci">
                    <span className="sv-ci-ico sv-ci-ico--red">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="3.5" width="15" height="13" rx="1.5" stroke="#DA291C" strokeWidth="1.4" fill="#FFEBEE"/><path d="M1.5 7.5h15" stroke="#DA291C" strokeWidth="1.2"/><rect x="5.5" y="1" width="1.8" height="5" rx="0.9" fill="#DA291C"/><rect x="10.7" y="1" width="1.8" height="5" rx="0.9" fill="#DA291C"/></svg>
                    </span>
                    <div className="sv-ci-body">
                      <span className="sv-ci-lbl">Inicio</span>
                      <span className="sv-ci-val">{fmtDate(startDate)}</span>
                    </div>
                  </div>

                  {/* Fin */}
                  <div className="sv-ci">
                    <span className="sv-ci-ico sv-ci-ico--red">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="3.5" width="15" height="13" rx="1.5" stroke="#DA291C" strokeWidth="1.4" fill="#FFEBEE"/><path d="M1.5 7.5h15" stroke="#DA291C" strokeWidth="1.2"/><rect x="5.5" y="1" width="1.8" height="5" rx="0.9" fill="#DA291C"/><rect x="10.7" y="1" width="1.8" height="5" rx="0.9" fill="#DA291C"/></svg>
                    </span>
                    <div className="sv-ci-body">
                      <span className="sv-ci-lbl">Fin</span>
                      <span className="sv-ci-val">{fmtDate(endDate)}</span>
                    </div>
                  </div>

                  {/* Días laborables */}
                  <div className="sv-ci">
                    <span className="sv-ci-ico sv-ci-ico--red">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="3.5" width="15" height="13" rx="1.5" stroke="#DA291C" strokeWidth="1.4" fill="#FFEBEE"/><path d="M1.5 7.5h15" stroke="#DA291C" strokeWidth="1.2"/><rect x="5.5" y="1" width="1.8" height="5" rx="0.9" fill="#DA291C"/><rect x="10.7" y="1" width="1.8" height="5" rx="0.9" fill="#DA291C"/><path d="M6 12l2 2 4-4" stroke="#DA291C" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    <div className="sv-ci-body">
                      <span className="sv-ci-lbl">Días laborables</span>
                      <span className="sv-ci-val sv-ci-val--accent">{days} {days === 1 ? 'día' : 'días'}</span>
                    </div>
                  </div>

                  {/* Retorno al trabajo */}
                  <div className="sv-ci">
                    <span className="sv-ci-ico sv-ci-ico--blue">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 9V7a5 5 0 0 0-5-5H6" stroke="#0070F2" strokeWidth="1.4" strokeLinecap="round"/><path d="M3 4l3-2-3-2" stroke="#0070F2" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" transform="translate(0,2)"/><path d="M3 9v2a5 5 0 0 0 5 5h4" stroke="#0070F2" strokeWidth="1.4" strokeLinecap="round"/><path d="M15 14l-3 2 3 2" stroke="#0070F2" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" transform="translate(0,-2)"/></svg>
                    </span>
                    <div className="sv-ci-body">
                      <span className="sv-ci-lbl">Retorno al trabajo</span>
                      <span className="sv-ci-val">{fmtDate(returnDate)}</span>
                    </div>
                  </div>

                  {/* Comentario */}
                  <div className="sv-ci">
                    <span className="sv-ci-ico sv-ci-ico--blue">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="10" rx="2.5" stroke="#0070F2" strokeWidth="1.4" fill="#EBF4FF"/><path d="M5 16l2-4" stroke="#0070F2" strokeWidth="1.4" strokeLinecap="round"/><line x1="5.5" y1="6" x2="12.5" y2="6" stroke="#0070F2" strokeWidth="1" strokeLinecap="round"/><line x1="5.5" y1="8.5" x2="10" y2="8.5" stroke="#0070F2" strokeWidth="1" strokeLinecap="round"/></svg>
                    </span>
                    <div className="sv-ci-body">
                      <span className="sv-ci-lbl">Comentario</span>
                      <span className={`sv-ci-val${comments.trim() ? '' : ' sv-ci-val--muted'}`}>
                        {comments.trim() || 'Sin comentarios'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Col 3 – Approver */}
                <div className="sv-confirm-col sv-confirm-col--approver">
                  <div className="sv-approver-header">Aprobador</div>
                  <div className="sv-approver-row">
                    <div
                      className="sv-approver-avatar"
                      style={approverPhoto ? { background: 'transparent', padding: 0, overflow: 'hidden' } : {}}
                    >
                      {approverPhoto
                        ? <img src={`${import.meta.env.BASE_URL}${approverPhoto}`} alt={approverName} className="sv-avatar-img" />
                        : approverInitials}
                    </div>
                    <div>
                      <div className="sv-approver-name">{approverName}</div>
                      <div className="sv-approver-role">Jefe Directo</div>
                    </div>
                  </div>
                  <div className="sv-approver-note">
                    <span className="sv-approver-note-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L3 4.5v4C3 12 5.6 14.8 9 15.5 12.4 14.8 15 12 15 8.5v-4L9 2z" fill="#E8F5E9" stroke="#107E3E" strokeWidth="1.4"/><path d="M6 9l2.5 2.5 4-4" stroke="#107E3E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    <span>
                      Tu solicitud será enviada a{' '}
                      <strong>{approverName}</strong>{' '}
                      para aprobación. Te notificaremos por correo y en el centro de tareas.
                    </span>
                  </div>
                </div>

              </div>
            </div>

            <div className="wz-modal-footer">
              <button className="wz-btn wz-btn-outline" onClick={() => setShowConfirm(false)}>
                Cancelar
              </button>
              <button className="wz-btn wz-btn-primary sv-confirm-btn" onClick={handleConfirm}>
                Confirmar solicitud
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{marginLeft:'6px'}}><path d="M2 8l10 0M9 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom navigation ─────────────────────────────── */}
      <nav className="sv-mobile-nav" aria-label="Navegación principal">
        <div className="sv-mobile-nav-inner-wrap">
          {/* Inicio — izquierda */}
          <button className="sv-nav-item" onClick={() => onNavigate('inicio')}>
            <svg className="sv-nav-svg" viewBox="0 0 24 24" fill="none">
              <path d="M3 12L12 4l9 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="sv-nav-label">Inicio</span>
          </button>

          {/* Vacaciones — centro FAB */}
          <button className="sv-nav-item sv-nav-item--fab">
            <span className="sv-nav-fab">+</span>
            <span className="sv-nav-label sv-nav-label--active">Vacaciones</span>
          </button>

          {/* Solicitudes — derecha */}
          <button className="sv-nav-item" onClick={() => onNavigate('mis-solicitudes')}>
            <svg className="sv-nav-svg" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="9" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="9" y1="16" x2="12" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="sv-nav-label">Solicitudes</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default SolicitudVacaciones;
