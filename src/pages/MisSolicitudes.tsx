import React, { useState, useRef, useCallback } from 'react';
import { USERS } from '../data/users';
import type { User } from '../data/users';
import { STATUS_LABELS, STATUS_CSS_CLASS } from '../data/vacationRequests';
import type { VacationRequest, RequestStatus } from '../data/vacationRequests';
import type { NavigateFn } from '../types';
import SpacePage from '../components/SpacePage';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const SHORT_MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const fmtDate = (d: string) => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getDate()} ${SHORT_MONTHS[dt.getMonth()]}. ${dt.getFullYear()}`;
};

const dotClass = (status: RequestStatus): string => {
  if (['aprobado'].includes(status)) return 'success';
  if (['rechazado', 'anulado', 'anulacion_rechazada'].includes(status)) return 'error';
  if (['pendiente_jefe', 'pendiente_gh', 'pendiente_anulacion'].includes(status)) return 'warning';
  return 'info';
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface Props {
  user: User;
  requests: VacationRequest[];
  onUpdateStatus: (id: string, status: RequestStatus, by: string, comment?: string) => void;
  onNavigate: NavigateFn;
}

const MisSolicitudes: React.FC<Props> = ({ user, requests, onUpdateStatus, onNavigate }) => {
  const [detail, setDetail]         = useState<VacationRequest | null>(null);
  const [anulComment, setAnulComment] = useState('');
  const [anulTarget, setAnulTarget]   = useState<string | null>(null);
  const [localPhoto, setLocalPhoto]   = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') setLocalPhoto(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const firstName    = user.name.split(' ')[0];
  const currentYear  = new Date().getFullYear();
  const displayPhoto = localPhoto ?? user.photo ?? null;

  /* KPI values */
  const availableDays = user.vacationBalance;
  const expiringDays  = user.vacationBalancePendientes;
  const pendingDays   = requests
    .filter(r => ['pendiente_jefe','pendiente_gh','pendiente_anulacion'].includes(r.status))
    .reduce((s, r) => s + r.days, 0);
  const plannedDays   = requests
    .filter(r => ['aprobado','pendiente_jefe','pendiente_gh','pendiente_anulacion'].includes(r.status))
    .reduce((s, r) => s + r.days, 0);

  /* Approver photo */
  const approverUser  = user.managerId ? USERS.find(u => u.id === user.managerId) : null;

  const handleAnulacion = (id: string) => {
    if (!anulComment.trim()) return;
    onUpdateStatus(id, 'pendiente_anulacion', user.name, anulComment.trim());
    setAnulTarget(null);
    setAnulComment('');
  };

  /* ── Empty state ──────────────────────────────────────────────── */
  if (requests.length === 0) {
    return (
      <SpacePage spaceName="Mis Vacaciones" pageName="Mis Solicitudes">
        <div className="ms-empty-wrap">
          <div className="ms-empty-icon">📋</div>
          <h3 className="ms-empty-title">Aún no tienes solicitudes</h3>
          <p className="ms-empty-sub">Crea tu primera solicitud de vacaciones y empieza a planificar tu descanso.</p>
          <button className="wz-btn wz-btn-primary" onClick={() => onNavigate('solicitar-vacaciones')}>
            ＋ Solicitar Vacaciones
          </button>
        </div>
      </SpacePage>
    );
  }

  /* ── Main view ────────────────────────────────────────────────── */
  return (
    <SpacePage spaceName="Mis Vacaciones" pageName="Mis Solicitudes">
      <div className="ms-wrapper">
        <div className="wz-breadcrumb">Mis Vacaciones › Mis Solicitudes</div>
        <h2 className="wz-page-heading">Mis Solicitudes</h2>

        {/* ═══════════════ HERO BANNER ═══════════════════════════ */}
        <div className="ms-hero">
          <div className="ms-hero-left">
            {/* Avatar with upload */}
            <div className="ms-hero-avatar-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              <div
                className="ms-hero-avatar"
                style={displayPhoto ? { background: 'transparent', padding: 0, overflow: 'hidden' } : {}}
              >
                {displayPhoto
                  ? <img src={displayPhoto} alt={user.name} className="ms-avatar-img" />
                  : user.initials}
              </div>
              <button
                className="ms-hero-avatar-btn"
                title="Actualizar foto de perfil"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2.5h4l1.5 1.5H12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1.5L5 2.5Z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
                  <circle cx="7" cy="7.5" r="1.8" stroke="white" strokeWidth="1.2"/>
                </svg>
              </button>
            </div>

            {/* Name + meta */}
            <div className="ms-hero-info">
              <div className="ms-hero-name">Hola, {firstName} 👋</div>
              <div className="ms-hero-dept">{user.department}</div>
              <div className="ms-hero-schedule">{user.schedule}</div>
            </div>
          </div>

          {/* Approver chip */}
          <div className="ms-hero-approver">
            <div
              className="ms-hero-approver-avatar"
              style={approverUser?.photo ? { background: 'transparent', padding: 0, overflow: 'hidden' } : {}}
            >
              {approverUser?.photo
                ? <img src={`${import.meta.env.BASE_URL}${approverUser.photo}`} alt={user.approver} className="ms-avatar-img" />
                : (user.approver ?? 'JA').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
            </div>
            <div>
              <div className="ms-hero-approver-label">Jefe aprobador</div>
              <div className="ms-hero-approver-name">{user.approver ?? 'No asignado'}</div>
            </div>
          </div>
        </div>

        {/* ═══════════════ KPI CARDS ═════════════════════════════ */}
        <div className="ms-kpi-grid">

          {/* Días disponibles — verde */}
          <div className="ms-kpi ms-kpi--green">
            <div className="ms-kpi-header">
              <span className="ms-kpi-ico ms-kpi-ico--green">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="1.5" y="3.5" width="15" height="13" rx="1.5" stroke="#2E7D32" strokeWidth="1.4" fill="#E8F5E9"/>
                  <path d="M1.5 7.5h15" stroke="#2E7D32" strokeWidth="1.2"/>
                  <rect x="5.5" y="1" width="1.8" height="5" rx="0.9" fill="#2E7D32"/>
                  <rect x="10.7" y="1" width="1.8" height="5" rx="0.9" fill="#2E7D32"/>
                  <path d="M5 12l2.5 2.5L13 9" stroke="#2E7D32" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="ms-kpi-label">Días disponibles</span>
            </div>
            <div className="ms-kpi-value-row">
              <span className="ms-kpi-value ms-kpi-value--green">{availableDays}</span>
              <span className="ms-kpi-unit">días</span>
            </div>
            <span className="ms-kpi-sub">Saldo listo para usar</span>
          </div>

          {/* Por vencer — naranja */}
          <div className="ms-kpi ms-kpi--orange">
            <div className="ms-kpi-header">
              <span className="ms-kpi-ico ms-kpi-ico--orange">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7.5" stroke="#E65100" strokeWidth="1.4" fill="#FFF3E0"/>
                  <path d="M9 5v4l2.5 2" stroke="#E65100" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="14.5" r="0.8" fill="#E65100"/>
                </svg>
              </span>
              <span className="ms-kpi-label">Por vencer al 31/12/{currentYear}</span>
            </div>
            <div className="ms-kpi-value-row">
              <span className="ms-kpi-value ms-kpi-value--orange">{expiringDays}</span>
              <span className="ms-kpi-unit">días</span>
            </div>
            <span className="ms-kpi-sub">Aprovecha antes de fin de año</span>
          </div>

          {/* Pendientes de aprobación — rojo */}
          <div className="ms-kpi ms-kpi--red">
            <div className="ms-kpi-header">
              <span className="ms-kpi-ico ms-kpi-ico--red">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2L2 15h14L9 2Z" stroke="#C62828" strokeWidth="1.4" fill="#FFEBEE" strokeLinejoin="round"/>
                  <rect x="8.2" y="7.5" width="1.6" height="4" rx="0.8" fill="#C62828"/>
                  <circle cx="9" cy="13" r="0.8" fill="#C62828"/>
                </svg>
              </span>
              <span className="ms-kpi-label">Pendientes de aprobación</span>
            </div>
            <div className="ms-kpi-value-row">
              <span className="ms-kpi-value ms-kpi-value--red">{pendingDays}</span>
              <span className="ms-kpi-unit">días</span>
            </div>
            <span className="ms-kpi-sub">Solicitudes en revisión</span>
          </div>

          {/* Programadas — azul */}
          <div className="ms-kpi ms-kpi--blue">
            <div className="ms-kpi-header">
              <span className="ms-kpi-ico ms-kpi-ico--blue">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="2" width="14" height="14" rx="2" stroke="#1565C0" strokeWidth="1.4" fill="#E3F2FD"/>
                  <path d="M5 9l3 3 5-5" stroke="#1565C0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="ms-kpi-label">Vacaciones programadas</span>
            </div>
            <div className="ms-kpi-value-row">
              <span className="ms-kpi-value ms-kpi-value--blue">{plannedDays}</span>
              <span className="ms-kpi-unit">días</span>
            </div>
            <span className="ms-kpi-sub">Días registrados en solicitudes</span>
          </div>

        </div>

        {/* ═══════════════ TABLA DE SOLICITUDES ══════════════════ */}
        <div className="ms-table-card">
          <div className="ms-table-card-header">
            <div>
              <div className="ms-table-card-title">Mis Solicitudes de Vacaciones</div>
              <div className="ms-table-card-sub">{requests.length} solicitud(es) en total</div>
            </div>
            <button className="wz-btn wz-btn-primary wz-btn-sm" onClick={() => onNavigate('solicitar-vacaciones')}>
              ＋ Nueva solicitud
            </button>
          </div>

          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Aprobador</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td>
                      <span className="ms-req-id">{req.id}</span>
                    </td>
                    <td className="ms-td-date">{fmtDate(req.startDate)}</td>
                    <td className="ms-td-date">{fmtDate(req.endDate)}</td>
                    <td>
                      <span className="ms-req-days">{req.days}</span>
                    </td>
                    <td>
                      <span className={`wz-status ${STATUS_CSS_CLASS[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </td>
                    <td className="ms-td-approver">{req.currentApprover ?? '—'}</td>
                    <td>
                      <div className="ms-table-actions">
                        <button className="wz-btn wz-btn-outline wz-btn-sm" onClick={() => setDetail(req)}>
                          Ver detalle
                        </button>
                        {(req.status === 'aprobado' || req.status === 'creado') && (
                          <button
                            className="ms-btn-anular"
                            onClick={() => setAnulTarget(req.id)}
                          >
                            Solicitar Anulación
                          </button>
                        )}
                        {req.status === 'anulacion_rechazada' && (
                          <span className="ms-anul-badge" title="El jefe rechazó tu solicitud de anulación.">
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
        </div>

      </div>

      {/* ── Detail Modal ─────────────────────────────────────── */}
      {detail && (
        <div className="wz-overlay" onClick={() => setDetail(null)}>
          <div className="wz-modal" onClick={e => e.stopPropagation()}>
            <div className="wz-modal-header">
              <h3 className="wz-modal-title">Solicitud {detail.id}</h3>
              <button className="wz-modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="wz-modal-body">
              <div className="wz-detail-grid">
                <div className="wz-detail-item">
                  <span className="wz-detail-lbl">Período</span>
                  <span className="wz-detail-val">{fmtDate(detail.startDate)} → {fmtDate(detail.endDate)}</span>
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
              <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>Historial de Aprobación</h4>
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
                      {step.comment && <div className="wz-tl-comment">"{step.comment}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="wz-modal-footer">
              <button className="wz-btn wz-btn-outline" onClick={() => setDetail(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Anulación Modal ──────────────────────────────────── */}
      {anulTarget && (
        <div className="wz-overlay" onClick={() => setAnulTarget(null)}>
          <div className="wz-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="wz-modal-header">
              <h3 className="wz-modal-title">Solicitar Anulación</h3>
              <button className="wz-modal-close" onClick={() => setAnulTarget(null)}>✕</button>
            </div>
            <div className="wz-modal-body">
              <div className="wz-alert wz-alert-warning">
                Esta acción enviará tu solicitud a revisión para su anulación.
              </div>
              <div className="wz-field" style={{ marginTop: 12 }}>
                <label className="req" htmlFor="anul-comment">Motivo de la anulación</label>
                <textarea
                  id="anul-comment"
                  className="wz-textarea"
                  placeholder="Describe el motivo..."
                  value={anulComment}
                  onChange={e => setAnulComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="wz-modal-footer">
              <button className="wz-btn wz-btn-outline" onClick={() => setAnulTarget(null)}>Cancelar</button>
              <button
                className="wz-btn wz-btn-danger"
                disabled={!anulComment.trim()}
                onClick={() => handleAnulacion(anulTarget)}
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

export default MisSolicitudes;
