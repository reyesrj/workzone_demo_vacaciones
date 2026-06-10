import React, { useState } from 'react';
import { ROLE_LABELS } from '../data/users';
import type { User } from '../data/users';
import { STATUS_LABELS, STATUS_CSS_CLASS } from '../data/vacationRequests';
import type { VacationRequest, RequestStatus } from '../data/vacationRequests';
import Section from '../components/Section';
import SpacePage from '../components/SpacePage';
import Ui5Card from '../components/Ui5Card';

interface Props {
  user: User;
  requests: VacationRequest[];
  mode: 'pendientes' | 'anulaciones';
  onUpdateStatus: (id: string, status: RequestStatus, by: string, comment?: string) => void;
}

const AprobacionVacaciones: React.FC<Props> = ({ user, requests, mode, onUpdateStatus }) => {
  const [actionTarget, setActionTarget] = useState<{ id: string; action: 'aprobar' | 'rechazar' } | null>(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [detail, setDetail] = useState<VacationRequest | null>(null);

  /* ---- filter requests by mode and role -------------------------- */
  const isAdmin = user.role === 'administrador_gh';
  const isJefe = user.role === 'jefe_aprobador';

  const filtered = (() => {
    if (mode === 'anulaciones') {
      // Only jefe handles anulaciones; admin does not participate
      return isJefe
        ? requests.filter((r) => r.status === 'pendiente_anulacion')
        : [];
    }
    // pendientes
    if (isAdmin) {
      return requests.filter((r) => r.status === 'pendiente_gh');
    }
    // jefe: sees pendiente_jefe
    return requests.filter((r) => r.status === 'pendiente_jefe');
  })();

  /* ---- approval logic -------------------------------------------- */
  const handleApprove = (req: VacationRequest) => {
    if (mode === 'anulaciones') {
      onUpdateStatus(req.id, 'anulado', user.name, comment.trim() || undefined);
    } else if (isAdmin) {
      onUpdateStatus(req.id, 'aprobado', user.name, comment.trim() || undefined);
    } else {
      // jefe_aprobador: hook handles the rotativo → pendiente_gh atomic transition
      onUpdateStatus(req.id, 'aprobado_jefe', user.name, comment.trim() || undefined);
    }
    setActionTarget(null);
    setComment('');
    setCommentError('');
  };

  const handleReject = (req: VacationRequest) => {
    if (!comment.trim()) {
      setCommentError('El comentario es obligatorio para rechazar.');
      return;
    }
    if (mode === 'anulaciones') {
      // Rejection of anulación → anulacion_rechazada (vacation remains valid)
      onUpdateStatus(req.id, 'anulacion_rechazada', user.name, comment.trim());
    } else {
      onUpdateStatus(req.id, 'rechazado', user.name, comment.trim());
    }
    setActionTarget(null);
    setComment('');
    setCommentError('');
  };

  /* ---- labels ---------------------------------------------------- */
  const pageTitle = mode === 'anulaciones' ? 'Gestión de Anulaciones' : 'Solicitudes Pendientes';
  const spaceName = 'Aprobaciones';

  const approveBtnLabel = mode === 'anulaciones' ? '✓ Confirmar Anulación' : '✓ Aprobar';
  const rejectBtnLabel  = mode === 'anulaciones' ? '✕ Rechazar Anulación' : '✕ Rechazar';

  const actionReq = actionTarget
    ? requests.find((r) => r.id === actionTarget.id)
    : null;

  return (
    <SpacePage spaceName={spaceName} pageName={pageTitle}>
      <Section title={pageTitle} subtitle="Solicitudes en cola para revisión">
        {mode === 'pendientes' && (
        <div className="wz-alert wz-alert-info" style={{ marginBottom: 16 }}>
          {isAdmin
            ? 'Mostrando solicitudes de Colaboradores Rotativos pendientes de aprobación GH.'
            : 'Mostrando solicitudes de tu equipo pendientes de aprobación.'}
        </div>
      )}
      {mode === 'anulaciones' && isAdmin && (
        <div className="wz-alert wz-alert-info" style={{ marginBottom: 16 }}>
          El Administrador GH no gestiona anulaciones. Las anulaciones son aprobadas por el Jefe Aprobador.
        </div>
      )}

      {filtered.length === 0 ? (
        <Ui5Card title={pageTitle}>
          <div className="wz-empty">
            <div className="wz-empty-icon">🎉</div>
            <h3>Sin pendientes</h3>
            <p>
              {mode === 'anulaciones'
                ? 'No hay solicitudes de anulación pendientes.'
                : 'No hay solicitudes pendientes de aprobación.'}
            </p>
          </div>
        </Ui5Card>
      ) : (
        <Ui5Card
          title={pageTitle}
          subtitle={`${filtered.length} solicitud(es) pendiente(s)`}
        >
          <div className="wz-table-wrap">
            <table className="wz-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Colaborador</th>
                  <th>Rol</th>
                  <th>Período</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Comentario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--wz-primary)' }}>
                        {req.id}
                      </span>
                    </td>
                    <td>{req.userName}</td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--wz-text-secondary)' }}>
                        {ROLE_LABELS[req.userRole]}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {req.startDate} → {req.endDate}
                    </td>
                    <td>
                      <span className="wz-req-days">{req.days}</span>
                    </td>
                    <td>
                      <span className={`wz-status ${STATUS_CSS_CLASS[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--wz-text-secondary)', maxWidth: 180 }}>
                      {req.comments ?? '—'}
                    </td>
                    <td>
                      <div className="wz-table-actions">
                        <button
                          className="wz-btn wz-btn-outline wz-btn-sm"
                          onClick={() => setDetail(req)}
                        >
                          Detalle
                        </button>
                        <button
                          className="wz-btn wz-btn-success wz-btn-sm"
                          onClick={() => setActionTarget({ id: req.id, action: 'aprobar' })}
                        >
                          ✓
                        </button>
                        <button
                          className="wz-btn wz-btn-danger wz-btn-sm"
                          onClick={() => setActionTarget({ id: req.id, action: 'rechazar' })}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Ui5Card>
      )}
      </Section>

      {/* ── Action Confirmation Modal ─────────────────── */}
      {actionTarget && actionReq && (
        <div className="wz-overlay" onClick={() => setActionTarget(null)}>
          <div className="wz-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="wz-modal-header">
              <h3 className="wz-modal-title">
                {actionTarget.action === 'aprobar' ? approveBtnLabel : rejectBtnLabel} — {actionReq.id}
              </h3>
              <button className="wz-modal-close" onClick={() => setActionTarget(null)}>✕</button>
            </div>
            <div className="wz-modal-body">
              <div className="wz-detail-grid" style={{ marginBottom: 16 }}>
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Colaborador</span>
                  <span className="wz-detail-val">{actionReq.userName}</span>
                </div>
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Período</span>
                  <span className="wz-detail-val">
                    {actionReq.startDate} → {actionReq.endDate} ({actionReq.days} días)
                  </span>
                </div>
              </div>
              <div className="wz-field">
                <label htmlFor="action-comment">
                  Comentario {actionTarget.action === 'rechazar' ? <span style={{ color: 'var(--wz-error)' }}>*</span> : '(opcional)'}
                </label>
                <textarea
                  id="action-comment"
                  className="wz-textarea"
                  placeholder={actionTarget.action === 'rechazar' ? 'Motivo del rechazo (obligatorio)...' : 'Agrega un comentario...'}
                  value={comment}
                  onChange={(e) => { setComment(e.target.value); setCommentError(''); }}
                  rows={3}
                />
                {commentError && (
                  <span style={{ fontSize: 12, color: 'var(--wz-error)', marginTop: 4 }}>{commentError}</span>
                )}
              </div>
            </div>
            <div className="wz-modal-footer">
              <button
                className="wz-btn wz-btn-outline"
                onClick={() => { setActionTarget(null); setComment(''); setCommentError(''); }}
              >
                Cancelar
              </button>
              {actionTarget.action === 'aprobar' ? (
                <button
                  className="wz-btn wz-btn-success"
                  onClick={() => handleApprove(actionReq)}
                >
                  {approveBtnLabel}
                </button>
              ) : (
                <button
                  className="wz-btn wz-btn-danger"
                  onClick={() => handleReject(actionReq)}
                >
                  {rejectBtnLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────── */}
      {detail && (
        <div className="wz-overlay" onClick={() => setDetail(null)}>
          <div className="wz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wz-modal-header">
              <h3 className="wz-modal-title">Detalle — {detail.id}</h3>
              <button className="wz-modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="wz-modal-body">
              <div className="wz-detail-grid">
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Colaborador</span>
                  <span className="wz-detail-val">{detail.userName}</span>
                </div>
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Rol</span>
                  <span className="wz-detail-val">{ROLE_LABELS[detail.userRole]}</span>
                </div>
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Período</span>
                  <span className="wz-detail-val">{detail.startDate} → {detail.endDate}</span>
                </div>
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Días</span>
                  <span className="wz-detail-val">{detail.days}</span>
                </div>
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Estado</span>
                  <span className={`wz-status ${STATUS_CSS_CLASS[detail.status]}`}>
                    {STATUS_LABELS[detail.status]}
                  </span>
                </div>
              </div>
              {detail.comments && (
                <div className="wz-detail-item" style={{ marginBottom: 20 }}>
                  <span className="wz-detail-lbl">Comentarios del colaborador</span>
                  <span className="wz-detail-val">{detail.comments}</span>
                </div>
              )}

              <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>
                Historial
              </h4>
              <div className="wz-timeline">
                {detail.history.map((step, i) => (
                  <div key={i} className="wz-tl-item">
                    <div className={`wz-tl-dot ${dotCls(step.status)}`} />
                    <div className="wz-tl-content">
                      <div className="wz-tl-header">
                        <span className="wz-tl-label">{step.label}</span>
                        <span className="wz-tl-date">{step.date}</span>
                      </div>
                      <div className="wz-tl-by">por {step.by}</div>
                      {step.comment && (
                        <div className="wz-tl-comment">"{step.comment}"</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="wz-modal-footer">
              <button className="wz-btn wz-btn-outline" onClick={() => setDetail(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </SpacePage>
  );
};

const dotCls = (status: RequestStatus): string => {
  if (status === 'aprobado') return 'success';
  if (['rechazado', 'anulado'].includes(status)) return 'error';
  if (['pendiente_jefe', 'pendiente_gh', 'pendiente_anulacion'].includes(status)) return 'warning';
  return 'info';
};

export default AprobacionVacaciones;
