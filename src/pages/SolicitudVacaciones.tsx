import React, { useState } from 'react';
import { ROLE_LABELS } from '../data/users';
import type { User } from '../data/users';
import { INITIAL_REQUESTS } from '../data/vacationRequests';
import type { VacationRequest, RequestStatus } from '../data/vacationRequests';
import type { NavigateFn } from '../types';
import Ui5Card from '../components/Ui5Card';
import SpacePage from '../components/SpacePage';

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

/** Returns the next working day after the given date string */
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

const getCalendarDays = (year: number, month: number) => {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekDay = (firstOfMonth.getDay() + 6) % 7; // Lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells = [] as Array<{ date: Date; currentMonth: boolean }>;

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - firstWeekDay + 1;
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [photoUrl, setPhotoUrl] = useState('');

  const [photoName, setPhotoName] = useState('');
  const [advanceRequest, setAdvanceRequest] = useState(false);
  const [loanRequest, setLoanRequest] = useState(false);
  const days = countWorkingDays(startDate, endDate);
  const returnDate = calcReturnDate(endDate);
  const isRotativo = user.role === 'colaborador_rotativo';
  const totalBalance = user.vacationBalanceTruncas + user.vacationBalancePendientes + user.vacationBalanceVencidas;
  const firstName = user.name.split(' ')[0];

  const pendingApprovalDays = INITIAL_REQUESTS
    .filter((req) => req.userId === user.id && ['pendiente_jefe', 'pendiente_gh', 'pendiente_anulacion'].includes(req.status))
    .reduce((sum, req) => sum + req.days, 0);

  const scheduledDays = INITIAL_REQUESTS
    .filter((req) => req.userId === user.id && ['aprobado', 'aprobado_jefe'].includes(req.status))
    .reduce((sum, req) => sum + req.days, 0);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
      setPhotoUrl(URL.createObjectURL(file));
      setPhotoName(file.name);
    }
  };

  const validate = (): string => {
    if (!startDate) return 'Selecciona una fecha de inicio.';
    if (!endDate) return 'Selecciona una fecha de fin.';
    if (new Date(endDate + 'T00:00:00') < new Date(startDate + 'T00:00:00'))
      return 'La fecha de fin debe ser posterior a la de inicio.';
    if (days === 0) return 'El período seleccionado no contiene días hábiles.';
    if (days > user.vacationBalance)
      return `No tienes suficientes días disponibles (saldo: ${user.vacationBalance} días).`;
    return '';
  };

  const handleSubmit = () => {
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
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
      currentApprover: 'María López',
      photo: photoName || undefined,
      history: [
        { status: 'creado', label: 'Solicitud creada', by: user.name, actorRole: ROLE_LABELS[user.role], date: today, time: now },
        { status: 'pendiente_jefe', label: 'Enviada a Jefe Aprobador', by: 'Sistema', date: today, time: now },
      ],
    };

    onAddRequest(newReq);
    setSubmitted(true);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setComments('');
    setPhotoName('');
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }
    setPhotoUrl('');
    setSubmitted(false);
    setError('');
  };

  if (submitted) {
    return (
      <SpacePage spaceName="Mis Vacaciones" pageName="Solicitar Vacaciones">
        <Ui5Card title="Solicitud Enviada">
          <div className="wz-empty" style={{ paddingTop: 32, paddingBottom: 32 }}>
            <div className="wz-empty-icon">✅</div>
            <h3>¡Solicitud enviada correctamente!</h3>
            <p>
              Tu solicitud de {days} días hábiles ({startDate} → {endDate}) ha sido
              enviada {isRotativo ? 'al Jefe Aprobador y Administración GH.' : 'al Jefe Aprobador.'}
            </p>
            {photoName && (
              <p style={{ marginTop: 8 }}><strong>Archivo adjunto:</strong> {photoName}</p>
            )}
            <div className="wz-flow" style={{ marginTop: 16, justifyContent: 'center' }}>
              <span className="wz-flow-step">Jefe Aprobador</span>
              {isRotativo && (
                <>
                  <span className="wz-flow-arrow">→</span>
                  <span className="wz-flow-step">Administrador GH</span>
                </>
              )}
              <span className="wz-flow-arrow">→</span>
              <span className="wz-flow-step">Aprobado</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="wz-btn wz-btn-outline" onClick={handleReset}>
                Nueva Solicitud
              </button>
              <button
                className="wz-btn wz-btn-primary"
                onClick={() => onNavigate('mis-solicitudes')}
              >
                Ver Mis Solicitudes
              </button>
            </div>
          </div>
        </Ui5Card>
      </SpacePage>
    );
  }

  return (
    <SpacePage spaceName="Mis Vacaciones" pageName="Solicitar Vacaciones">
      <div className="wz-request-top-hero wz-request-top-hero-bg">
        <div className="wz-request-top-avatar">
          <div className="wz-request-avatar-frame">
            {photoUrl ? (
              <img src={photoUrl} alt={`${firstName}`} className="wz-request-avatar-image" />
            ) : (
              <div className="wz-request-avatar-circle">{user.initials}</div>
            )}
            <label className="wz-photo-upload-label">
              <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
              <span className="wz-photo-upload-icon">📷</span>
            </label>
          </div>
          <div>
            <h2>{firstName}, planifica tu próxima aventura</h2>
            <p>Estás a un paso de disfrutar tu descanso.</p>
            <div className="wz-request-top-info">
              <span>Código: {user.codigoEmpleado} | </span>
              <span>Área: {user.department} | </span>
              <span>Aprobador: {user.approver ?? 'No asignado'}</span>
            </div>
          </div>
        </div>

        
      </div>
      <div className="wz-request-hero-cards">
        <div className="wz-metric-card available">
          <div className="wz-metric-card-head">
            <span
              className="wz-metric-card-icon"
              style={{
                fontSize: '26px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              🌴
            </span>
            <span>Días disponibles</span>
          </div>
          <strong>{user.vacationBalance} días</strong>
          <p>Listos para ti</p>
        </div>
        <div className="wz-metric-card expiring">
          <div className="wz-metric-card-head">
            <span
              className="wz-metric-card-icon"
              style={{
                fontSize: '26px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              ⏳
            </span>
            <span>Por vencer al 31/12/2026</span>
          </div>
          <strong>{user.vacationBalancePendientes} días</strong>
          <p>Úsalos antes de esa fecha</p>
        </div>
        <div className="wz-metric-card pending">
          <div className="wz-metric-card-head">
            <span
              className="wz-metric-card-icon"
              style={{
                fontSize: '26px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              🕒
            </span>
            <span>Pendiente de aprobación</span>
          </div>
          <strong>{pendingApprovalDays} días</strong>
          <p>En revisión</p>
        </div>
        <div className="wz-metric-card scheduled">
          <div className="wz-metric-card-head">
            <span
              className="wz-metric-card-icon"
              style={{
                fontSize: '26px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              📅
            </span>
            <span>Ya programados</span>
          </div>
          <strong>{scheduledDays} días</strong>
          <p>Este año</p>
        </div>
      </div>
      <div className="wz-request-layout">
        <Ui5Card title="¿Cuándo te gustaría tomar tu descanso?" className="wz-request-form-card">
          

          {error && (
            <div className="wz-alert wz-alert-error" style={{ marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          <div className="wz-request-calendar-panel">
            <div className="wz-request-calendar-header">
              
              <div className="wz-calendar-nav">
                <button
                  type="button"
                  className="wz-calendar-nav-btn"
                  onClick={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear((prev) => prev - 1);
                    } else {
                      setCalendarMonth((prev) => prev - 1);
                    }
                  }}
                >
                  ‹
                </button>
                <span>{SPANISH_MONTHS[calendarMonth]} {calendarYear}</span>
                <button
                  type="button"
                  className="wz-calendar-nav-btn"
                  onClick={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear((prev) => prev + 1);
                    } else {
                      setCalendarMonth((prev) => prev + 1);
                    }
                  }}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="wz-calendar-grid">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((weekday) => (
                <div key={weekday} className="wz-calendar-weekday">{weekday}</div>
              ))}
              {getCalendarDays(calendarYear, calendarMonth).map((cell) => {
                const cellDate = cell.date.toISOString().split('T')[0];
                const selectedStart = startDate ? new Date(startDate + 'T00:00:00') : null;
                const selectedEnd = endDate ? new Date(endDate + 'T00:00:00') : null;
                const isStart = selectedStart?.toISOString().split('T')[0] === cellDate;
                const isEnd = selectedEnd?.toISOString().split('T')[0] === cellDate;
                const inRange = selectedStart && selectedEnd
                  ? cell.date > selectedStart && cell.date < selectedEnd
                  : false;
                const isDisabled = !cell.currentMonth;
                const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;

                return (
                  <button
                    key={cellDate}
                    type="button"
                    className={`wz-calendar-cell${isDisabled ? ' disabled' : ''}${isWeekend ? ' weekend' : ''}${isStart ? ' start' : ''}${isEnd ? ' end' : ''}${inRange ? ' in-range' : ''}`}
                    onClick={() => {
                      if (isDisabled) return;
                      if (!startDate || (startDate && endDate)) {
                        setStartDate(cellDate);
                        setEndDate('');
                      } else if (cellDate < startDate) {
                        setStartDate(cellDate);
                        setEndDate('');
                      } else {
                        setEndDate(cellDate);
                      }
                    }}
                  >
                    {cell.date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="wz-calendar-legend">
              <span><strong>Inicio</strong></span>
              <span><strong>Fin</strong></span>
              <span><strong>Días seleccionados</strong></span>
              <span><strong>No laborables</strong></span>
            </div>
          </div>

          <div className="wz-request-summary-panel">
            <div className="wz-request-summary-item">
              <span>Inicio</span>
              <strong>{startDate || '—'}</strong>
            </div>
            <div className="wz-request-summary-item">
              <span>Fin</span>
              <strong>{endDate || '—'}</strong>
            </div>
            <div className="wz-request-summary-item">
              <span>Días laborables</span>
              <strong>{days > 0 ? `${days}` : '—'}</strong>
            </div>
            <div className="wz-request-summary-item">
              <span>Vuelves</span>
              <strong>{returnDate || '—'}</strong>
            </div>
          </div>
        </Ui5Card>

        <Ui5Card title="Detalles de tu solicitud" className="wz-request-side-card">
          <div className="wz-request-card-header">
            
          </div>

          <div className="wz-request-detail-panel">
            <div className="wz-request-detail-item">
              <span className="wz-request-detail-label">Tipo de vacaciones</span>
              <span className="wz-request-detail-value">Vacaciones con días laborables</span>
            </div>
            <div className="wz-request-detail-item">
              <span className="wz-request-detail-label">Jornada laboral</span>
              <span className="wz-request-detail-value">Lunes a Viernes · 08:00 a 17:00</span>
            </div>
            <div className="wz-request-detail-item">
              <span className="wz-request-detail-label">Retorno estimado</span>
              <span className="wz-request-detail-value">{returnDate ? `Volverás el ${returnDate}` : 'Pendiente'}</span>
            </div>
          </div>

          <div className="wz-request-approver-card">
            <span className="wz-request-detail-label">Tu aprobador</span>
            <div className="wz-request-approver-row">
              <div className="wz-request-approver-avatar">{user.initials}</div>
              <div className="wz-request-approver-info">
                <strong>{user.approver ?? 'Jefe directo'}</strong>
                <span>Jefe Aprobador</span>
              </div>
            </div>
            <div className="wz-request-approver-status">
              {isRotativo
                ? 'Esta solicitud pasará por Jefe Aprobador y Administración GH.'
                : 'Esta solicitud será revisada por tu Jefe Aprobador.'}
            </div>
          </div>

          <div className="wz-request-advice-card">
            <strong>Recomendación</strong>
            <p>Procura que las fechas seleccionadas no afecten la operación de tu equipo.</p>
          </div>
        </Ui5Card>
        <div className="wz-request-additional-section">
            <div className="wz-request-additional-title">
              <h3>¿Necesitas algo adicional?</h3>
              <span>(Opcional)</span>
            </div>

            <div className="wz-request-additional-grid">
              <div className="wz-request-additional-switches">
                <div className="wz-request-extra-item">
                  <div>
                    <strong>¿Te gustaría salir antes?</strong>
                    <p>Puedes pedir un adelanto de vacaciones.</p>
                  </div>
                  <button
                    type="button"
                    className="wz-toggle"
                    onClick={() => setAdvanceRequest((prev) => !prev)}
                    aria-pressed={advanceRequest}
                  >
                    <span className={`wz-toggle-track ${advanceRequest ? 'on' : ''}`}>
                      <span className="wz-toggle-thumb" />
                    </span>
                    <span className="wz-toggle-label">{advanceRequest ? 'Sí' : 'No'}</span>
                  </button>
                </div>
                <div className="wz-request-extra-item">
                  <div>
                    <strong>¿Necesitas más días?</strong>
                    <p>Puedes solicitar un préstamo de vacaciones.</p>
                  </div>
                  <button
                    type="button"
                    className="wz-toggle"
                    onClick={() => setLoanRequest((prev) => !prev)}
                    aria-pressed={loanRequest}
                  >
                    <span className={`wz-toggle-track ${loanRequest ? 'on' : ''}`}>
                      <span className="wz-toggle-thumb" />
                    </span>
                    <span className="wz-toggle-label">{loanRequest ? 'Sí' : 'No'}</span>
                  </button>
                </div>
              </div>

              <div className="wz-request-additional-comment">
                <label className="wz-request-label">Comentario (Opcional)</label>
                <textarea
                  className="wz-textarea"
                  placeholder="Agrega un comentario para tu aprobador..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={5}
                />
                <div className="wz-form-actions" style={{ marginTop: 18 }}>
                  <button
                    className="wz-btn wz-btn-primary"
                    onClick={handleSubmit}
                    disabled={!startDate || !endDate}
                  >
                    Enviar solicitud
                  </button>
                  <button className="wz-btn wz-btn-outline" onClick={handleReset}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>
    </SpacePage>
  );
};

export default SolicitudVacaciones;
