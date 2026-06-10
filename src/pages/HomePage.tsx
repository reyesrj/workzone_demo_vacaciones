import React from 'react';
import { ROLE_LABELS } from '../data/users';
import type { User } from '../data/users';
import { STATUS_LABELS, STATUS_CSS_CLASS } from '../data/vacationRequests';
import type { VacationRequest } from '../data/vacationRequests';
import { getGlobalKPIs } from '../data/reports';
import type { NavigateFn } from '../types';
import Section from '../components/Section';
import Ui5Card from '../components/Ui5Card';
import SpacePage from '../components/SpacePage';

interface HomePageProps {
  user: User;
  requests: VacationRequest[];
  allRequests: VacationRequest[];
  onNavigate: NavigateFn;
}

const BalanceBreakdown: React.FC<{ user: User }> = ({ user }) => (
  <div className="wz-saldo-pill-row">
    <div className="wz-saldo-pill truncas">
      <div className="wz-saldo-pill-label">
        <span className="wz-saldo-pill-dot" /> Truncas
      </div>
      <div className="wz-saldo-pill-value">{user.vacationBalanceTruncas} días</div>
      <div className="wz-saldo-pill-sub">Disponibles </div>
    </div>
    <div className="wz-saldo-pill pendientes">
      <div className="wz-saldo-pill-label">
        <span className="wz-saldo-pill-dot" /> Pendientes
      </div>
      <div className="wz-saldo-pill-value">{user.vacationBalancePendientes} días</div>
      <div className="wz-saldo-pill-sub">Programar próximamente</div>
    </div>
    <div className="wz-saldo-pill vencidas">
      <div className="wz-saldo-pill-label">
        <span className="wz-saldo-pill-dot" /> Vencidas
      </div>
      <div className="wz-saldo-pill-value">{user.vacationBalanceVencidas} días</div>
      <div className="wz-saldo-pill-sub">Requieren programación</div>
    </div>
  </div>
);

const HomeHero: React.FC<{
  user: User;
  pendingApprovalCount: number;
  pendingAnulacionCount: number;
}> = ({ user, pendingApprovalCount, pendingAnulacionCount }) => {
  const availableBalance = user.vacationBalanceTruncas + user.vacationBalancePendientes + user.vacationBalanceVencidas;
  const hasAlerts = pendingApprovalCount > 0 || pendingAnulacionCount > 0;

  return (
    <div className="wz-home-hero">
      <div className="wz-home-hero-left">
        <div className="wz-home-hero-copy">
          <span className="wz-home-hero-role">{ROLE_LABELS[user.role]}</span>
          <h3>Bienvenido/a, {user.name}</h3>
          <p>{user.department}</p>
        </div>

        <div className="wz-hero-balance">
          <span className="wz-hero-balance-label">Saldo Vacacional Disponible</span>
          <div className="wz-hero-balance-value">{availableBalance} días</div>
          <p className="wz-hero-balance-sub">Incluye Truncas, Pendientes y Vencidas.</p>
        </div>
      </div>

      <div className="wz-home-hero-right">
        <BalanceBreakdown user={user} />

        {hasAlerts && (
          <div className="wz-home-hero-alerts">
            {pendingApprovalCount > 0 && (
              <div className="wz-home-alert-pill wz-home-alert-pill-warning">
                ⏳ {pendingApprovalCount} solicitudes pendientes
              </div>
            )}
            {pendingAnulacionCount > 0 && (
              <div className="wz-home-alert-pill wz-home-alert-pill-error">
                🗑 {pendingAnulacionCount} anulaciones pendientes
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Quick tiles ───────────────────────────────────────────── */
const QuickTile: React.FC<{
  icon: string; title: string; accent: string; bg: string; badge?: number;
  onClick: () => void;
}> = ({ icon, title, accent, bg, badge, onClick }) => (
  <button
    className="wz-app-tile"
    style={{ '--tile-accent': accent, '--tile-icon-bg': bg } as React.CSSProperties}
    onClick={onClick}
  >
    <div className="wz-app-tile-icon-wrap">{icon}</div>
    <span className="wz-app-tile-title">{title}</span>
    {badge !== undefined && badge > 0 && (
      <span className="wz-app-tile-badge">{badge}</span>
    )}
  </button>
);

/* ── Recent requests mini-list ─────────────────────────────── */
const RecentList: React.FC<{ requests: VacationRequest[]; onMore: () => void }> = ({ requests, onMore }) => (
  <div>
    <div className="wz-recent-list">
      {requests.slice(0, 3).map((req) => (
        <div key={req.id} className="wz-recent-item">
          <div className="wz-recent-item-info">
            <span className="wz-req-id">{req.id}</span>
            <span className="wz-req-dates">{req.startDate} → {req.endDate}</span>
            <span className="wz-req-days">{req.days} días</span>
          </div>
          <span className={`wz-status ${STATUS_CSS_CLASS[req.status]}`}>
            {STATUS_LABELS[req.status]}
          </span>
        </div>
      ))}
    </div>
    <button className="wz-link-btn" style={{ marginTop: 12 }} onClick={onMore}>
      Ver todas las solicitudes →
    </button>
  </div>
);

/* ── Main component ────────────────────────────────────────── */
const HomePage: React.FC<HomePageProps> = ({ user, requests, allRequests, onNavigate }) => {
  const isColaborador = user.role === 'colaborador_standard' || user.role === 'colaborador_rotativo';
  const isJefe = user.role === 'jefe_aprobador';
  const isAdmin = user.role === 'administrador_gh';
  const kpis = getGlobalKPIs(allRequests);

  const myPending  = requests.filter((r) => ['pendiente_jefe','aprobado_jefe','pendiente_gh'].includes(r.status));
  const myApproved = requests.filter((r) => r.status === 'aprobado');

  const pendingApprovalCount = isJefe
    ? allRequests.filter((r) => r.status === 'pendiente_jefe').length
    : isAdmin
    ? allRequests.filter((r) => r.status === 'pendiente_gh').length
    : 0;
  const pendingAnulacionCount = isJefe
    ? allRequests.filter((r) => r.status === 'pendiente_anulacion').length
    : 0;

  /* ── COLABORADOR VIEW ──────────────────────────────────── */
  if (isColaborador) {
    const nextVacation = myApproved.find((r) => r.startDate >= new Date().toISOString().split('T')[0]);
    return (
      <SpacePage spaceName="Mis Vacaciones" pageName="Inicio">
        <Section title="Resumen personal" subtitle="Tu saldo y solicitudes importantes">
          <HomeHero
            user={user}
            pendingApprovalCount={pendingApprovalCount}
            pendingAnulacionCount={pendingAnulacionCount}
          />
        </Section>

        {user.vacationBalanceVencidas > 0 && (
          <div className="wz-alert wz-alert-error" style={{ marginBottom: 20 }}>
            ⚠ Tienes <strong>{user.vacationBalanceVencidas} días vencidos</strong>
            Coordina con tu jefe para programarlos.
          </div>
        )}

        <Section title="Prioridades" subtitle="Acceso rápido a tus tareas principales">
          <div className="wz-grid wz-grid-2">
            <Ui5Card title="Próximas Vacaciones" subtitle={nextVacation ? 'Período aprobado' : 'Sin vacaciones programadas'}>
              {nextVacation ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 36 }}>🌴</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--wz-success)' }}>
                        {nextVacation.startDate} → {nextVacation.endDate}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--wz-text-secondary)' }}>
                        {nextVacation.days} días hábiles aprobados
                      </div>
                    </div>
                  </div>
                  <span className="wz-status status-success" style={{ alignSelf: 'flex-start' }}>
                    {STATUS_LABELS[nextVacation.status]}
                  </span>
                </div>
              ) : (
                <div className="wz-empty" style={{ padding: '20px 0' }}>
                  <div className="wz-empty-icon" style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                  <p style={{ margin: 0 }}>No hay vacaciones aprobadas próximas</p>
                  <button
                    className="wz-btn wz-btn-primary wz-btn-sm"
                    style={{ marginTop: 12 }}
                    onClick={() => onNavigate('solicitar-vacaciones')}
                  >
                    Solicitar Ahora
                  </button>
                </div>
              )}
            </Ui5Card>

            <Ui5Card title="Accesos Rápidos" subtitle="Aplicaciones frecuentes">
              <div className="wz-tile-grid">
                <QuickTile icon="📅" title="Solicitar Vacaciones" accent="#DA291C" bg="#FFEBEE"
                  onClick={() => onNavigate('solicitar-vacaciones')} />
                <QuickTile icon="📋" title="Mis Solicitudes" accent="#188918" bg="#e8f5e9"
                  badge={myPending.length} onClick={() => onNavigate('mis-solicitudes')} />
              </div>
            </Ui5Card>
          </div>
        </Section>

        <Section title="Solicitudes recientes" subtitle="Tus últimas solicitudes de vacaciones">
          {requests.length > 0 ? (
            <Ui5Card title="Solicitudes Recientes" subtitle={`${requests.length} en total`}>
              <RecentList requests={requests} onMore={() => onNavigate('mis-solicitudes')} />
            </Ui5Card>
          ) : (
            <Ui5Card title="Sin Solicitudes">
              <div className="wz-empty">
                <div className="wz-empty-icon">🌴</div>
                <h3>Aún no tienes solicitudes</h3>
                <p>Crea tu primera solicitud de vacaciones.</p>
                <button className="wz-btn wz-btn-primary" style={{ marginTop: 16 }}
                  onClick={() => onNavigate('solicitar-vacaciones')}>
                  Solicitar Vacaciones
                </button>
              </div>
            </Ui5Card>
          )}
        </Section>
      </SpacePage>
    );
  }

  /* ── JEFE APROBADOR VIEW ───────────────────────────────── */
  if (isJefe) {
    const teamRequests = allRequests.filter((r) => r.userRole !== 'jefe_aprobador' && r.userRole !== 'administrador_gh');
    return (
      <SpacePage spaceName="Mis Vacaciones" pageName="Inicio">
        <Section title="Resumen de aprobación" subtitle="Estado de tu equipo y prioridades">
          <HomeHero
            user={user}
            pendingApprovalCount={pendingApprovalCount}
            pendingAnulacionCount={pendingAnulacionCount}
          />
        </Section>

        {pendingApprovalCount > 0 && (
          <div className="wz-alert wz-alert-warning" style={{ marginBottom: 20 }}>
            ⏳ Tienes <strong>{pendingApprovalCount} solicitud(es)</strong> pendientes de tu aprobación.
          </div>
        )}
        {pendingAnulacionCount > 0 && (
          <div className="wz-alert wz-alert-error" style={{ marginBottom: 20 }}>
            🗑 Tienes <strong>{pendingAnulacionCount} solicitud(es) de anulación</strong> pendientes de revisión.
          </div>
        )}

        <Section title="Accesos rápidos" subtitle="Gestión de equipo">
          <Ui5Card title="Accesos Rápidos" subtitle="Gestión de equipo">
            <div className="wz-tile-grid">
              <QuickTile icon="✅" title="Solicitudes Pendientes" accent="#DA291C" bg="#FFEBEE"
                badge={pendingApprovalCount} onClick={() => onNavigate('solicitudes-pendientes', 'aprobaciones')} />
              <QuickTile icon="🗑️" title="Anulaciones" accent="#e76500" bg="#fff8f0"
                badge={pendingAnulacionCount} onClick={() => onNavigate('gestion-anulaciones', 'aprobaciones')} />
              <QuickTile icon="📊" title="Reportes" accent="#009A99" bg="#E0F7FA"
                onClick={() => onNavigate('reporte-vacaciones', 'reportes')} />
              <QuickTile icon="🔍" title="Trazabilidad" accent="#6b3fa0" bg="#f3eaff"
                onClick={() => onNavigate('trazabilidad', 'reportes')} />
            </div>
          </Ui5Card>
        </Section>

        <Section title="Solicitudes recientes del equipo" subtitle="Últimas solicitudes de tu equipo">
          <Ui5Card title="Solicitudes Recientes del Equipo" subtitle={`${teamRequests.length} en total`}>
            {teamRequests.length > 0 ? (
              <RecentList requests={teamRequests} onMore={() => onNavigate('solicitudes-pendientes', 'aprobaciones')} />
            ) : (
              <div className="wz-empty" style={{ padding: '20px 0' }}>
                <p>Sin solicitudes de equipo recientes.</p>
              </div>
            )}
          </Ui5Card>
        </Section>
      </SpacePage>
    );
  }

  /* ── ADMINISTRADOR GH VIEW ─────────────────────────────── */
  return (
    <SpacePage spaceName="Mis Vacaciones" pageName="Inicio">
      <Section title="Resumen global" subtitle="Visión de solicitudes GH y estado global">
        <HomeHero
          user={user}
          pendingApprovalCount={pendingApprovalCount}
          pendingAnulacionCount={pendingAnulacionCount}
        />
      </Section>

      <Section title="KPIs globales" subtitle="Indicadores clave para Administración GH">
        <div className="wz-approver-kpi-row">
          <div className="wz-approver-kpi" style={{ '--akpi-color': '#DA291C' } as React.CSSProperties}>
            <div className="wz-approver-kpi-num">{pendingApprovalCount}</div>
            <div className="wz-approver-kpi-label">Pend. GH</div>
          </div>
          <div className="wz-approver-kpi" style={{ '--akpi-color': '#188918' } as React.CSSProperties}>
            <div className="wz-approver-kpi-num">{kpis.aprobadas}</div>
            <div className="wz-approver-kpi-label">Aprobadas</div>
          </div>
          <div className="wz-approver-kpi" style={{ '--akpi-color': '#C62828' } as React.CSSProperties}>
            <div className="wz-approver-kpi-num">{kpis.rechazadas}</div>
            <div className="wz-approver-kpi-label">Rechazadas</div>
          </div>
          <div className="wz-approver-kpi" style={{ '--akpi-color': '#6b3fa0' } as React.CSSProperties}>
            <div className="wz-approver-kpi-num">{kpis.anuladas}</div>
            <div className="wz-approver-kpi-label">Anuladas</div>
          </div>
          <div className="wz-approver-kpi" style={{ '--akpi-color': '#e76500' } as React.CSSProperties}>
            <div className="wz-approver-kpi-num">{kpis.pendientes_anulacion}</div>
            <div className="wz-approver-kpi-label">Pend. Anulación</div>
          </div>
          <div className="wz-approver-kpi" style={{ '--akpi-color': '#009A99' } as React.CSSProperties}>
            <div className="wz-approver-kpi-num">{kpis.total}</div>
            <div className="wz-approver-kpi-label">Total Global</div>
          </div>
        </div>
      </Section>

      {pendingApprovalCount > 0 && (
        <div className="wz-alert wz-alert-warning" style={{ marginBottom: 20 }}>
          ⏳ Hay <strong>{pendingApprovalCount} solicitud(es) de Colaboradores Rotativos</strong> pendientes de aprobación GH.
        </div>
      )}

      <Section title="Accesos rápidos" subtitle="Gestión global">
        <Ui5Card title="Accesos Rápidos" subtitle="Gestión global">
          <div className="wz-tile-grid">
            <QuickTile icon="✅" title="Solicitudes GH" accent="#DA291C" bg="#FFEBEE"
              badge={pendingApprovalCount} onClick={() => onNavigate('solicitudes-pendientes', 'aprobaciones')} />
            <QuickTile icon="📊" title="Reportes Globales" accent="#009A99" bg="#E0F7FA"
              onClick={() => onNavigate('reporte-vacaciones', 'reportes')} />
            <QuickTile icon="🔍" title="Trazabilidad" accent="#6b3fa0" bg="#f3eaff"
              onClick={() => onNavigate('trazabilidad', 'reportes')} />
          </div>
        </Ui5Card>
      </Section>

      <Section title="Solicitudes recientes" subtitle="Solicitudes en el sistema">
        <Ui5Card title="Solicitudes Recientes" subtitle={`${allRequests.length} solicitudes en el sistema`}>
          <RecentList requests={allRequests} onMore={() => onNavigate('reporte-vacaciones', 'reportes')} />
        </Ui5Card>
      </Section>
    </SpacePage>
  );
};

export default HomePage;
