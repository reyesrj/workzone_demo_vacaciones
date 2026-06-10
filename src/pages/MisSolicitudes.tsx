import React, { useState } from 'react';
import type { User } from '../data/users';
import { STATUS_LABELS, STATUS_CSS_CLASS } from '../data/vacationRequests';
import type { VacationRequest, RequestStatus } from '../data/vacationRequests';
import type { NavigateFn } from '../types';
import SpacePage from '../components/SpacePage';
import Ui5Card from '../components/Ui5Card';

interface Props {
  user: User;
  requests: VacationRequest[];
  onUpdateStatus: (id: string, status: RequestStatus, by: string, comment?: string) => void;
  onNavigate: NavigateFn;
}

const MisSolicitudes: React.FC<Props> = ({ user, requests, onUpdateStatus, onNavigate }) => {
  const [detail, setDetail] = useState<VacationRequest | null>(null);
  const [anulComment, setAnulComment] = useState('');
  const [anulTarget, setAnulTarget] = useState<string | null>(null);

  const handleSolicitarAnulacion = (id: string) => {
    if (!anulComment.trim()) return;
    onUpdateStatus(id, 'pendiente_anulacion', user.name, anulComment.trim());
    setAnulTarget(null);
    setAnulComment('');
  };

  if (requests.length === 0) {
    return (
      <SpacePage spaceName="Mis Vacaciones" pageName="Mis Solicitudes">
        <Ui5Card title="Mis Solicitudes">
          <div className="wz-empty">
            <div className="wz-empty-icon">📋</div>
            <h3>Sin solicitudes</h3>
            <p>Aún no has creado ninguna solicitud de vacaciones.</p>
            <button
              className="wz-btn wz-btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => onNavigate('solicitar-vacaciones')}
            >
              Crear Primera Solicitud
            </button>
          </div>
        </Ui5Card>
      </SpacePage>
    );
  }

  return (
    <SpacePage spaceName="Mis Vacaciones" pageName="Mis Solicitudes">
      <Ui5Card
        title="Mis Solicitudes de Vacaciones"
        subtitle={`${requests.length} solicitud(es) en total`}
        action={
          <button
            className="wz-btn wz-btn-primary wz-btn-sm"
            onClick={() => onNavigate('solicitar-vacaciones')}
          >
            + Nueva
          </button>
        }
      >
        <div className="wz-table-wrap">
          <table className="wz-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Días</th>
                <th>Estado</th>
                <th>Aprobador Actual</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--wz-primary)' }}>
                      {req.id}
                    </span>
                  </td>
                  <td>{req.startDate}</td>
                  <td>{req.endDate}</td>
                  <td>
                    <span className="wz-req-days">{req.days}</span>
                  </td>
                  <td>
                    <span className={`wz-status ${STATUS_CSS_CLASS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                  </td>
                  <td style={{ color: 'var(--wz-text-secondary)', fontSize: 13 }}>
                    {req.currentApprover ?? '—'}
                  </td>
                  <td>
                    <div className="wz-table-actions">
                      <button
                        className="wz-btn wz-btn-outline wz-btn-sm"
                        onClick={() => setDetail(req)}
                      >
                        Ver detalle
                      </button>
                      {(req.status === 'aprobado' || req.status === 'creado') && (
                        <button
                          className="wz-btn wz-btn-sm"
                          style={{ background: '#fff3e0', color: 'var(--wz-warning)', border: '1px solid #ffe0b2' }}
                          onClick={() => setAnulTarget(req.id)}
                        >
                          Solicitar Anulación
                        </button>
                      )}
                      {req.status === 'anulacion_rechazada' && (
                        <span
                          className="wz-status status-error"
                          title="El jefe rechazó tu solicitud de anulación. Las vacaciones siguen vigentes."
                          style={{ cursor: 'help' }}
                        >
                          ⚠ Anulación Rechazada
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Ui5Card>

      {/* ── Detail Modal ──────────────────────────────── */}
      {detail && (
        <div className="wz-overlay" onClick={() => setDetail(null)}>
          <div className="wz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wz-modal-header">
              <h3 className="wz-modal-title">Solicitud {detail.id}</h3>
              <button className="wz-modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="wz-modal-body">
              <div className="wz-detail-grid">
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Período</span>
                  <span className="wz-detail-val">{detail.startDate} → {detail.endDate}</span>
                </div>
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Días hábiles</span>
                  <span className="wz-detail-val">{detail.days}</span>
                </div>
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Estado</span>
                  <span className={`wz-status ${STATUS_CSS_CLASS[detail.status]}`}>
                    {STATUS_LABELS[detail.status]}
                  </span>
                </div>
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Aprobador actual</span>
                  <span className="wz-detail-val">{detail.currentApprover ?? '—'}</span>
                </div>
              </div>
              {detail.comments && (
                <div className="wz-detail-item" style={{ marginBottom: 20 }}>
                  <span className="wz-detail-lbl">Comentarios</span>
                  <span className="wz-detail-val">{detail.comments}</span>
                </div>
              )}

              <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>
                Historial de Aprobación
              </h4>
              <div className="wz-timeline">
                {detail.history.map((step, i) => (
                  <div key={i} className="wz-tl-item">
                    <div className={`wz-tl-dot ${dotClass(step.status)}`} />
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

      {/* ── Anulación Modal ────────────────────────────── */}
      {anulTarget && (
        <div className="wz-overlay" onClick={() => setAnulTarget(null)}>
          <div className="wz-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="wz-modal-header">
              <h3 className="wz-modal-title">Solicitar Anulación</h3>
              <button className="wz-modal-close" onClick={() => setAnulTarget(null)}>✕</button>
            </div>
            <div className="wz-modal-body">
              <div className="wz-alert wz-alert-warning">
                Esta acción enviará tu solicitud de vacaciones a revisión para anulación.
              </div>
              <div className="wz-field" style={{ marginTop: 12 }}>
                <label className="req" htmlFor="anul-comment">Motivo de la anulación</label>
                <textarea
                  id="anul-comment"
                  className="wz-textarea"
                  placeholder="Describe el motivo..."
                  value={anulComment}
                  onChange={(e) => setAnulComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="wz-modal-footer">
              <button className="wz-btn wz-btn-outline" onClick={() => setAnulTarget(null)}>
                Cancelar
              </button>
              <button
                className="wz-btn wz-btn-danger"
                disabled={!anulComment.trim()}
                onClick={() => handleSolicitarAnulacion(anulTarget)}
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}
    </SpacePage>
  );
};

const dotClass = (status: RequestStatus): string => {
  if (['aprobado'].includes(status)) return 'success';
  if (['rechazado', 'anulado', 'anulacion_rechazada'].includes(status)) return 'error';
  if (['pendiente_jefe', 'pendiente_gh', 'pendiente_anulacion'].includes(status)) return 'warning';
  return 'info';
};

export default MisSolicitudes;
