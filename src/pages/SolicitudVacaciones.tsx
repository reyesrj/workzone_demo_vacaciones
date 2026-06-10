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

  const [showBalanceDetails, setShowBalanceDetails] = useState(false);
  const days = countWorkingDays(startDate, endDate);
  const returnDate = calcReturnDate(endDate);
  const isRotativo = user.role === 'colaborador_rotativo';
  const totalBalance = user.vacationBalanceTruncas + user.vacationBalancePendientes + user.vacationBalanceVencidas;

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
              enviada al Jefe Aprobador.
            </p>
            {isRotativo && (
              <div className="wz-flow" style={{ marginTop: 16, justifyContent: 'center' }}>
                <span className="wz-flow-step">Jefe Aprobador</span>
                <span className="wz-flow-arrow">→</span>
                <span className="wz-flow-step">Administrador GH</span>
                <span className="wz-flow-arrow">→</span>
                <span className="wz-flow-step">Aprobado</span>
              </div>
            )}
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

      <Ui5Card title="Saldo Vacacional" subtitle="Disponible" style={{ marginBottom: 18 }}>
        <div className="wz-saldo-panel">
          <div>
            <span className="wz-saldo-summary-label">Saldo Disponible</span>
            <div className="wz-saldo-summary-value-large">{totalBalance} días</div>
          </div>
          <button
            type="button"
            className="wz-accordion-trigger"
            onClick={() => setShowBalanceDetails((value) => !value)}
          >
            {showBalanceDetails ? 'Ocultar detalle' : 'Ver detalle'}
          </button>
        </div>
        {showBalanceDetails && (
          <div className="wz-saldo-accordion-panel">
            <div className="wz-saldo-accordion-row truncas">
              <span>🟢 Truncas</span>
              <strong>{user.vacationBalanceTruncas} días</strong>
            </div>
            <div className="wz-saldo-accordion-row pendientes">
              <span>🟡 Pendientes</span>
              <strong>{user.vacationBalancePendientes} días</strong>
            </div>
            <div className="wz-saldo-accordion-row vencidas">
              <span>🔴 Vencidas</span>
              <strong>{user.vacationBalanceVencidas} días</strong>
            </div>
          </div>
        )}
      </Ui5Card>

      <Ui5Card title="Nueva Solicitud" subtitle="Solicitud de vacaciones días hábiles">

        <div className="wz-request-note" style={{ marginBottom: 20 }}>
          Aprobación requerida: {isRotativo ? 'Jefe Aprobador y Administrador GH' : 'Jefe Aprobador'}
        </div>

        {error && (
          <div className="wz-alert wz-alert-error" style={{ marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        <div className="wz-request-form-grid">
          <div className="wz-request-field">
            <label className="wz-request-label req">Fecha Inicio</label>
            <input
              type="date"
              className="wz-input"
              value={startDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="wz-request-field">
            <label className="wz-request-label req">Fecha Fin</label>
            <input
              type="date"
              className="wz-input"
              value={endDate}
              min={startDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="wz-request-field">
            <label className="wz-request-label">Días Solicitados</label>
            <span className="wz-request-value" style={{ color: days > 0 ? 'var(--wz-primary)' : 'var(--wz-text-muted)' }}>
              {days > 0 ? `${days} días hábiles` : '—'}
            </span>
          </div>

          <div className="wz-request-field">
            <label className="wz-request-label">Fecha de regreso</label>
            <span className="wz-request-value" style={{ color: returnDate ? 'var(--wz-text)' : 'var(--wz-text-muted)' }}>
              {returnDate || '—'}
            </span>
          </div>

          <div className="wz-request-field">
            <label className="wz-request-label">Adelanto Vacaciones</label>
            <div className="wz-toggle">
              <div className="wz-toggle-track">
                <div className="wz-toggle-thumb" />
              </div>
              <span className="wz-toggle-label">OFF</span>
            </div>
          </div>

          <div className="wz-request-field">
            <label className="wz-request-label">Préstamo Vacaciones</label>
            <div className="wz-toggle">
              <div className="wz-toggle-track">
                <div className="wz-toggle-thumb" />
              </div>
              <span className="wz-toggle-label">OFF</span>
            </div>
          </div>

          <div className="wz-request-field wz-request-field-full">
            <label className="wz-request-label">Comentario</label>
            <textarea
              className="wz-textarea"
              placeholder="Motivo o comentario adicional (opcional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="wz-form-actions" style={{ marginTop: 12 }}>
          <button
            className="wz-btn wz-btn-primary"
            onClick={handleSubmit}
            disabled={!startDate || !endDate}
          >
            Enviar Solicitud
          </button>
          <button className="wz-btn wz-btn-outline" onClick={handleReset}>
            Limpiar
          </button>
        </div>
      </Ui5Card>

    </SpacePage>
  );
};

export default SolicitudVacaciones;
