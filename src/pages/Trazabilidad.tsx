import React, { useState } from 'react';
import { USERS } from '../data/users';
import type { User } from '../data/users';
import { STATUS_LABELS, STATUS_CSS_CLASS, TIMELINE_DOT_CLASS } from '../data/vacationRequests';
import type { VacationRequest } from '../data/vacationRequests';
import Section from '../components/Section';
import SpacePage from '../components/SpacePage';
import Ui5Card from '../components/Ui5Card';

interface Props {
  user: User;
  requests: VacationRequest[];
}

const Trazabilidad: React.FC<Props> = ({ user, requests }) => {
  const isApprover = user.role === 'jefe_aprobador' || user.role === 'administrador_gh';

  const [filterUser, setFilterUser] = useState(isApprover ? '' : user.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = requests.filter((r) => !filterUser || r.userId === filterUser);
  const selected = selectedId ? requests.find((r) => r.id === selectedId) : null;

  return (
    <SpacePage spaceName="Reportes" pageName="Trazabilidad">
      <Section title="Trazabilidad" subtitle="Historial y trazabilidad por solicitud">
      <div className="wz-grid wz-grid-2" style={{ alignItems: 'start' }}>
        {/* Left — request list */}
        <div>
          {isApprover && (
            <div className="wz-filter-bar" style={{ marginBottom: 16 }}>
              <div className="wz-filter-field">
                <label>Colaborador</label>
                <select
                  className="wz-native-select"
                  value={filterUser}
                  onChange={(e) => { setFilterUser(e.target.value); setSelectedId(null); }}
                >
                  <option value="">Todos</option>
                  {USERS.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <Ui5Card
            title="Solicitudes"
            subtitle={`${filtered.length} solicitud(es)`}
          >
            {filtered.length === 0 ? (
              <div className="wz-empty" style={{ padding: '24px 0' }}>
                <div className="wz-empty-icon">📋</div>
                <h3>Sin solicitudes</h3>
              </div>
            ) : (
              <div className="wz-recent-list">
                {filtered.map((req) => (
                  <div
                    key={req.id}
                    className="wz-recent-item"
                    style={{
                      cursor: 'pointer',
                      border: selectedId === req.id
                        ? '1px solid var(--wz-primary)'
                        : '1px solid #f0f0f0',
                      background: selectedId === req.id ? '#f0f7ff' : '#fafafa',
                    }}
                    onClick={() => setSelectedId(req.id === selectedId ? null : req.id)}
                  >
                    <div className="wz-recent-item-info">
                      <span className="wz-req-id">{req.id}</span>
                      <span className="wz-req-dates">{req.startDate} → {req.endDate}</span>
                      {isApprover && (
                        <span style={{ fontSize: 12, color: 'var(--wz-text-secondary)' }}>
                          {req.userName}
                        </span>
                      )}
                    </div>
                    <span className={`wz-status ${STATUS_CSS_CLASS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Ui5Card>
        </div>

        {/* Right — timeline */}
        <div>
          {selected ? (
            <Ui5Card
              title={`Trazabilidad — ${selected.id}`}
              subtitle={`${selected.userName} · ${selected.days} días`}
            >
              {/* Flow diagram */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                    fontSize: 12,
                  }}
                >
                  {selected.history.map((step, i) => (
                    <React.Fragment key={i}>
                      <span
                        className={`wz-status ${STATUS_CSS_CLASS[step.status]}`}
                        style={{ fontSize: 11 }}
                      >
                        {STATUS_LABELS[step.status]}
                      </span>
                      {i < selected.history.length - 1 && (
                        <span style={{ color: 'var(--wz-text-secondary)' }}>→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="wz-timeline">
                {selected.history.map((step, i) => (
                  <div key={i} className="wz-tl-item">
                    <div
                      className={`wz-tl-dot ${TIMELINE_DOT_CLASS[step.status] || 'info'}`}
                    />
                    <div className="wz-tl-content">
                      <div className="wz-tl-header">
                        <span className="wz-tl-label">{step.label}</span>
                        <span className="wz-tl-date">
                          {step.date}{step.time ? ` · ${step.time}` : ''}
                        </span>
                      </div>
                      <div className="wz-tl-by">
                        por <strong>{step.by}</strong>
                        {step.actorRole && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--wz-text-muted)', background: 'var(--wz-border-light)', padding: '1px 6px', borderRadius: 10 }}>
                            {step.actorRole}
                          </span>
                        )}
                      </div>
                      {step.comment && (
                        <div className="wz-tl-comment">"{step.comment}"</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Current status */}
              <div
                style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  background: '#f5f6f7',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <strong>Estado actual: </strong>
                <span className={`wz-status ${STATUS_CSS_CLASS[selected.status]}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
                {selected.currentApprover && (
                  <span style={{ marginLeft: 12, color: 'var(--wz-text-secondary)' }}>
                    · Pendiente: {selected.currentApprover}
                  </span>
                )}
              </div>
            </Ui5Card>
          ) : (
            <Ui5Card title="Trazabilidad">
              <div className="wz-empty">
                <div className="wz-empty-icon">🔍</div>
                <h3>Selecciona una solicitud</h3>
                <p>Haz clic en una solicitud para ver su historial completo de aprobación.</p>
              </div>
            </Ui5Card>
          )}
        </div>
      </div>
      </Section>
    </SpacePage>
  );
};

export default Trazabilidad;
