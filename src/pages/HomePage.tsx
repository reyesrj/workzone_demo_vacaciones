import React from 'react';
import type { User } from '../data/users';
import type { VacationRequest } from '../data/vacationRequests';
import type { NavigateFn } from '../types';
import { USERS } from '../data/users';

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */
interface HomePageProps {
  user: User;
  requests: VacationRequest[];
  allRequests: VacationRequest[];
  onNavigate: NavigateFn;
}

/* ------------------------------------------------------------------ */
/*  Small reusable pieces                                               */
/* ------------------------------------------------------------------ */

/** KPI card — type label first (dark), then colored value, then sub-label */
const KpiCard: React.FC<{
  icon: React.ReactNode; iconBg: string;
  value: string | number; valueColor: string;
  type: string; sub: string; alert?: boolean;
}> = ({ icon, iconBg, value, valueColor, type, sub, alert }) => (
  <div className={`hp-kpi-card${alert ? ' hp-kpi-card--alert' : ''}`}>
    <div className="hp-kpi-icon" style={{ background: iconBg }}>{icon}</div>
    <div className="hp-kpi-body">
      <div className="hp-kpi-type">{type}</div>
      <div className="hp-kpi-val" style={{ color: valueColor }}>
        {value} <span className="hp-kpi-dias" style={{ color: valueColor }}>días</span>
      </div>
      <div className="hp-kpi-sub">{sub}</div>
    </div>
  </div>
);

/** App card used across all profiles */
const AppCard: React.FC<{
  imgNode: React.ReactNode;
  imgSmall?: boolean;   /* true for icon-only panels (narrower left column) */
  imgBg?: string;       /* custom background color for the image panel */
  title: string;
  desc: string;
  badge?: React.ReactNode;
  ctaLabel: string;
  ctaVariant?: 'primary' | 'outline' | 'purple' | 'green';
  onClick: () => void;
}> = ({ imgNode, imgSmall, imgBg, title, desc, badge, ctaLabel, ctaVariant = 'primary', onClick }) => (
  <div className="hp-app-card">
    <div
      className={`hp-app-card-img${imgSmall ? ' hp-app-card-img--sm' : ''}`}
      style={imgBg ? { background: imgBg } : undefined}
    >
      {imgNode}
    </div>
    <div className="hp-app-card-content">
      <div className="hp-app-card-title">{title}</div>
      <div className="hp-app-card-desc">{desc}</div>
      {badge && <div className="hp-app-badge">{badge}</div>}
      <button className={`hp-app-cta hp-app-cta--${ctaVariant}`} onClick={onClick}>
        {ctaLabel} <span className="hp-cta-arrow">→</span>
      </button>
    </div>
  </div>
);

/* ─── Ilustración de playa ─────────────────────────────────────────── */
const BeachIllus = () => (
  <img
    src={`${import.meta.env.BASE_URL}beach-scene.png`}
    alt="vacaciones"
    className="hp-beach-img"
  />
);

/* ─── Icono de aprobación ──────────────────────────────────────────── */
const AprobIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
    <rect width="56" height="56" rx="12" fill="#FFF5F5"/>
    <rect x="14" y="10" width="28" height="36" rx="3" fill="#fff" stroke="#DA291C" strokeWidth="1.5"/>
    <path d="M20 20h16M20 27h16M20 34h10" stroke="#DA291C" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="40" cy="38" r="9" fill="#DA291C"/>
    <path d="M35.5 38l3 3 5.5-5.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ReporteIcon = () => (
  <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
    <rect x="10" y="6" width="32" height="40" rx="4" fill="#fff" stroke="#2E7D32" strokeWidth="1.5"/>
    <path d="M18 18h16M18 25h16M18 32h10" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="28" y="30" width="5" height="8" rx="1" fill="#43A047" opacity=".9"/>
    <rect x="34" y="26" width="5" height="12" rx="1" fill="#43A047"/>
  </svg>
);

const TrazIcon = () => (
  <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
    <rect x="6" y="30" width="9" height="16" rx="2" fill="#7B1FA2" opacity=".7"/>
    <rect x="21" y="20" width="9" height="26" rx="2" fill="#7B1FA2" opacity=".85"/>
    <rect x="36" y="10" width="9" height="36" rx="2" fill="#7B1FA2"/>
    <path d="M10.5 29l15-12 15 8" stroke="#7B1FA2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10.5" cy="29" r="2.5" fill="#7B1FA2"/>
    <circle cx="25.5" cy="17" r="2.5" fill="#7B1FA2"/>
    <circle cx="40.5" cy="25" r="2.5" fill="#7B1FA2"/>
  </svg>
);

const TurnoIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
    <rect width="56" height="56" rx="12" fill="#EDE7F6"/>
    <circle cx="28" cy="28" r="15" stroke="#5E35B1" strokeWidth="2"/>
    <path d="M28 18v10l6 4" stroke="#5E35B1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
    <rect width="56" height="56" rx="12" fill="#FFF3E0"/>
    <path d="M28 12a14 14 0 0114 14c0 8-2.5 10-2.5 10H14.5S12 34 12 26a14 14 0 0116-14z" fill="#fff" stroke="#E65100" strokeWidth="1.5"/>
    <path d="M24 36a4 4 0 008 0" stroke="#E65100" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="40" cy="18" r="6" fill="#DA291C"/>
  </svg>
);

const ListIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
    <rect width="56" height="56" rx="12" fill="#E3F2FD"/>
    <rect x="14" y="12" width="28" height="32" rx="3" fill="#fff" stroke="#1565C0" strokeWidth="1.5"/>
    <path d="M20 21h16M20 28h16M20 35h10" stroke="#1565C0" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  HERO variants                                                       */
/* ------------------------------------------------------------------ */
const HeroColaborador: React.FC<{ user: User }> = ({ user }) => {
  const firstName = user.name.split(' ')[0];
  const isRotativo = user.role === 'colaborador_rotativo';
  return (
    <div className="hp-hero">
      <div className="hp-hero-left">
        <div className="hp-hero-greeting">Hola, {firstName} 👋</div>
        <div className="hp-hero-sub">Desde aquí puedes solicitar y dar seguimiento a tus vacaciones.</div>
        {isRotativo && (
          <div className="hp-hero-tags">
            <span className="hp-hero-tag hp-hero-tag--rotativo">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Horario Rotativo
            </span>
            <span className="hp-hero-tag hp-hero-tag--pattern">Patrón 4×2</span>
          </div>
        )}
      </div>
      <div className="hp-hero-right">
        {/* Balance + beach image as a unified white card */}
        <div className="hp-hero-balance-card">
          <div className="hp-hero-balance-text">
            <div className="hp-hero-balance-label">Saldo disponible</div>
            <div className="hp-hero-balance-num">
              {user.vacationBalance}
              <span className="hp-hero-balance-dias"> días</span>
            </div>
            <div className="hp-hero-balance-sub">de vacaciones disponibles</div>
          </div>
          <div className="hp-hero-balance-illus"><BeachIllus /></div>
        </div>
      </div>
    </div>
  );
};

const HeroJefe: React.FC<{ user: User; pendingCount: number }> = ({ user, pendingCount }) => {
  const firstName = user.name.split(' ')[0];
  return (
    <div className="hp-hero hp-hero--jefe">
      <div className="hp-hero-left">
        <div className="hp-hero-greeting">Hola, {firstName} 👋</div>
        <div className="hp-hero-sub">Desde aquí puedes gestionar solicitudes de vacaciones de tu equipo.</div>
        <div className="hp-hero-tags">
          <span className="hp-hero-tag hp-hero-tag--jefe">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <circle cx="5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M1 12c0-2.21 1.79-4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="10" cy="6" r="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M8 12c0-1.1.9-2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Jefe Aprobador
          </span>
        </div>
      </div>
      <div className="hp-hero-right">
        <div className="hp-hero-mgmt-card hp-hero-mgmt-card--jefe">
          <div className="hp-hero-mgmt-text">
            <div className="hp-hero-mgmt-label">Pendientes de aprobación</div>
            <div className="hp-hero-mgmt-num hp-hero-mgmt-num--blue">{pendingCount}</div>
            <div className="hp-hero-mgmt-sub">
              {pendingCount === 1 ? 'solicitud de tu equipo' : 'solicitudes de tu equipo'}
            </div>
          </div>
          <div
            className="hp-hero-mgmt-illus"
            style={{ backgroundImage: `url(${import.meta.env.BASE_URL}hero-beach-bg.png)` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};

const HeroAdmin: React.FC<{ user: User; pendingCount: number; colaboradoresCount: number }> = ({
  user, pendingCount, colaboradoresCount,
}) => {
  const firstName = user.name.split(' ')[0];
  return (
    <div className="hp-hero hp-hero--admin">
      <div className="hp-hero-left">
        <div className="hp-hero-greeting">Hola, {firstName} 👋</div>
        <div className="hp-hero-sub">Bienvenido al panel de administración de vacaciones.</div>
        <div className="hp-hero-tags">
          <span className="hp-hero-tag hp-hero-tag--admin">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L7 10.4l-3.6 1.9.7-4L1.2 5.7l4-.6z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
            </svg>
            Administrador GH
          </span>
        </div>
      </div>
      <div className="hp-hero-right">
        <div className="hp-hero-mgmt-card hp-hero-mgmt-card--admin">
          <div className="hp-hero-mgmt-text">
            <div className="hp-hero-mgmt-label">Colaboradores activos</div>
            <div className="hp-hero-mgmt-num hp-hero-mgmt-num--purple">{colaboradoresCount}</div>
            <div className="hp-hero-mgmt-sub">en el portal de vacaciones</div>
            {pendingCount > 0 && (
              <div className="hp-hero-mgmt-badge">{pendingCount} por aprobar GH</div>
            )}
          </div>
          <div
            className="hp-hero-mgmt-illus"
            style={{ backgroundImage: `url(${import.meta.env.BASE_URL}hero-beach-bg.png)` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */
const HomePage: React.FC<HomePageProps> = ({ user, requests, allRequests, onNavigate }) => {
  const isStandard  = user.role === 'colaborador_standard';
  const isRotativo  = user.role === 'colaborador_rotativo';
  const isColaborador = isStandard || isRotativo;
  const isJefe  = user.role === 'jefe_aprobador';
  const isAdmin = user.role === 'administrador_gh';
  const today   = new Date().toISOString().split('T')[0];

  /* ── Counts ─────────────────────────────────────────────────────── */
  const myPendingCount = requests.filter(r =>
    ['creado','pendiente_jefe','aprobado_jefe','pendiente_gh'].includes(r.status)
  ).length;

  const pendingApprovalCount = isJefe
    ? allRequests.filter(r => r.status === 'pendiente_jefe').length
    : isAdmin
    ? allRequests.filter(r => r.status === 'pendiente_gh').length
    : 0;

  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const d7 = sevenDaysLater.toISOString().split('T')[0];
  const expiringCount = allRequests.filter(r =>
    r.status === 'aprobado' && r.startDate >= today && r.startDate <= d7
  ).length;

  /* ── Admin global KPIs ────────────────────────────────────────── */
  const colaboradoresCount = USERS.filter(u =>
    u.role === 'colaborador_standard' || u.role === 'colaborador_rotativo'
  ).length;
  const totalTruncas    = USERS.reduce((s, u) => s + u.vacationBalanceTruncas, 0);
  const totalPendientes = USERS.reduce((s, u) => s + u.vacationBalancePendientes, 0);
  const totalVencidas   = USERS.reduce((s, u) => s + u.vacationBalanceVencidas, 0);
  const totalSolicitudes = allRequests.length;

  /* ================================================================
     COLABORADOR STANDARD / ROTATIVO
     ================================================================ */
  if (isColaborador) {
    return (
      <div className="hp-wrap">
        <HeroColaborador user={user} />

        {/* ── KPI strip ─────────────────────────────────────────── */}
        <div className="hp-kpi-strip">
          <KpiCard
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="3" width="15" height="14" rx="2" fill="#BBDEFB" stroke="#1565C0" strokeWidth="1.3"/><path d="M2.5 7h15" stroke="#1565C0" strokeWidth="1.1"/><rect x="5" y="1.5" width="1.5" height="4" rx="0.75" fill="#1565C0"/><rect x="13.5" y="1.5" width="1.5" height="4" rx="0.75" fill="#1565C0"/></svg>}
            iconBg="#E3F2FD"
            value={user.vacationBalanceTruncas}
            valueColor="#1565C0"
            type="Truncas"
            sub="Saldo disponible"
          />
          <KpiCard
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" fill="#FFF3E0" stroke="#E65100" strokeWidth="1.3"/><path d="M10 6v4l2.5 2.5" stroke="#E65100" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            iconBg="#FFF3E0"
            value={user.vacationBalancePendientes}
            valueColor="#E65100"
            type="Pendientes"
            sub="Por programar"
          />
          <KpiCard
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L2 17h16L10 2z" fill="#FFEBEE" stroke="#C62828" strokeWidth="1.3" strokeLinejoin="round"/><rect x="9.3" y="8.5" width="1.4" height="4.5" rx="0.7" fill="#C62828"/><circle cx="10" cy="14.8" r="0.9" fill="#C62828"/></svg>}
            iconBg="#FFEBEE"
            value={user.vacationBalanceVencidas}
            valueColor="#C62828"
            type="Vencidas"
            sub="Requieren atención"
            alert={user.vacationBalanceVencidas > 0}
          />
        </div>

        {/* ── App cards ─────────────────────────────────────────── */}
        <div className={`hp-apps hp-apps--${isRotativo ? '3' : '2'}`}>
          <AppCard
            imgNode={<BeachIllus />}
            title="Solicitud de Vacaciones"
            desc="Solicita, edita o consulta tus vacaciones."
            ctaLabel="Ingresar"
            ctaVariant="primary"
            onClick={() => onNavigate('solicitar-vacaciones')}
          />
          <AppCard
            imgNode={<ListIcon />}
            imgSmall
            title="Mis Solicitudes"
            desc="Consulta el estado de tus solicitudes de vacaciones."
            badge={myPendingCount > 0
              ? <><span className="hp-badge-dot"/><span>Pendientes: {myPendingCount}</span></>
              : null}
            ctaLabel="Ver solicitudes"
            ctaVariant="outline"
            onClick={() => onNavigate('mis-solicitudes')}
          />
          {isRotativo && (
            <AppCard
              imgNode={<TurnoIcon />}
              imgSmall
              title="Información de Turno"
              desc="Validación especial de vacaciones según tu horario rotativo."
              ctaLabel="Ver detalles"
              ctaVariant="outline"
              onClick={() => onNavigate('mis-solicitudes')}
            />
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="hp-footer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#888" strokeWidth="1.2"/>
            <rect x="6.3" y="6" width="1.4" height="4.5" rx="0.7" fill="#888"/>
            <circle cx="7" cy="4.5" r="0.8" fill="#888"/>
          </svg>
          ¿Necesitas ayuda? Visita el <button className="hp-footer-link">Centro de Ayuda</button> o contacta a <button className="hp-footer-link">Soporte GH.</button>
        </div>
      </div>
    );
  }

  /* ================================================================
     JEFE APROBADOR
     ================================================================ */
  if (isJefe) {
    return (
      <div className="hp-wrap">
        <HeroJefe user={user} pendingCount={pendingApprovalCount} />

        {/* ── Pending alert banner ──────────────────────────────── */}
        {pendingApprovalCount > 0 && (
          <div className="hp-alert-banner">
            <div className="hp-alert-banner-left">
              <div className="hp-alert-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="9.5" fill="#FFF3E0" stroke="#E65100" strokeWidth="1.4"/>
                  <path d="M11 7v5" stroke="#E65100" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="11" cy="15" r="1" fill="#E65100"/>
                </svg>
              </div>
              <div>
                <div className="hp-alert-title">Pendientes de aprobación</div>
                <div className="hp-alert-body">
                  <strong>{pendingApprovalCount} solicitudes</strong> · Requieren tu atención
                </div>
              </div>
            </div>
            <button
              className="hp-alert-cta"
              onClick={() => onNavigate('solicitudes-pendientes')}
            >
              Ir a Aprobaciones →
            </button>
          </div>
        )}

        {/* ── App cards ─────────────────────────────────────────── */}
        <div className="hp-apps hp-apps--3">
          <AppCard
            imgNode={<BeachIllus />}
            title="Solicitud de Vacaciones"
            desc="Solicita tus vacaciones y consulta su estado."
            ctaLabel="Nuevo solicitud"
            ctaVariant="outline"
            onClick={() => onNavigate('solicitar-vacaciones')}
          />
          <AppCard
            imgNode={<AprobIcon />}
            imgSmall
            title="Aprobación de Vacaciones"
            desc="Revisa y aprueba las solicitudes de tu equipo."
            badge={pendingApprovalCount > 0
              ? <><span className="hp-badge-dot hp-badge-dot--red"/><span>{pendingApprovalCount} pendientes</span></>
              : null}
            ctaLabel="Revisar"
            ctaVariant="primary"
            onClick={() => onNavigate('solicitudes-pendientes')}
          />
          <AppCard
            imgNode={<BellIcon />}
            imgSmall
            title="Solicitudes próximas a vencer"
            desc={expiringCount > 0
              ? `${expiringCount} solicitudes · Vencen en los próximos 7 días.`
              : 'Sin solicitudes próximas a vencer esta semana.'}
            ctaLabel="Ver detalles"
            ctaVariant="outline"
            onClick={() => onNavigate('solicitudes-pendientes')}
          />
        </div>

        <div className="hp-footer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#888" strokeWidth="1.2"/>
            <rect x="6.3" y="6" width="1.4" height="4.5" rx="0.7" fill="#888"/>
            <circle cx="7" cy="4.5" r="0.8" fill="#888"/>
          </svg>
          ¿Necesitas ayuda? Visita el <button className="hp-footer-link">Centro de Ayuda</button> o contacta a <button className="hp-footer-link">Soporte GH.</button>
        </div>
      </div>
    );
  }

  /* ================================================================
     ADMINISTRADOR GH
     ================================================================ */
  return (
    <div className="hp-wrap">
      <HeroAdmin
        user={user}
        pendingCount={pendingApprovalCount}
        colaboradoresCount={colaboradoresCount}
      />

      {/* ── Global KPI strip ──────────────────────────────────── */}
      <div className="hp-global-kpis">
        <div className="hp-gkpi">
          <div className="hp-gkpi-icon" style={{ background: '#E3F2FD' }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <circle cx="7" cy="6" r="3.5" stroke="#1565C0" strokeWidth="1.4"/>
              <path d="M1 17c0-3.31 2.69-6 6-6" stroke="#1565C0" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="14" cy="8" r="2.5" stroke="#1565C0" strokeWidth="1.2"/>
              <path d="M11 17c0-1.66 1.34-3 3-3" stroke="#1565C0" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="hp-gkpi-body">
            <div className="hp-gkpi-label">Colaboradores</div>
            <div className="hp-gkpi-val">{colaboradoresCount.toLocaleString()}</div>
            <div className="hp-gkpi-sub">Total</div>
          </div>
        </div>
        <div className="hp-gkpi">
          <div className="hp-gkpi-icon" style={{ background: '#E8F5E9' }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <rect x="2.5" y="3" width="15" height="14" rx="2" fill="#C8E6C9" stroke="#2E7D32" strokeWidth="1.3"/>
              <path d="M2.5 7h15" stroke="#2E7D32" strokeWidth="1.1"/>
              <rect x="5" y="1.5" width="1.5" height="4" rx=".75" fill="#2E7D32"/>
              <rect x="13.5" y="1.5" width="1.5" height="4" rx=".75" fill="#2E7D32"/>
            </svg>
          </div>
          <div className="hp-gkpi-body">
            <div className="hp-gkpi-label">Truncas</div>
            <div className="hp-gkpi-val">{totalTruncas}</div>
            <div className="hp-gkpi-sub">Total días truncos</div>
          </div>
        </div>
        <div className="hp-gkpi">
          <div className="hp-gkpi-icon" style={{ background: '#FFF3E0' }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7.5" fill="#FFE0B2" stroke="#E65100" strokeWidth="1.3"/>
              <path d="M10 6v4l2.5 2.5" stroke="#E65100" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="hp-gkpi-body">
            <div className="hp-gkpi-label">Pendientes</div>
            <div className="hp-gkpi-val">{totalPendientes}</div>
            <div className="hp-gkpi-sub">Total días pendientes</div>
          </div>
        </div>
        <div className="hp-gkpi hp-gkpi--alert">
          <div className="hp-gkpi-icon" style={{ background: '#FFEBEE' }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L2 17h16L10 2z" fill="#FFCDD2" stroke="#C62828" strokeWidth="1.3" strokeLinejoin="round"/>
              <rect x="9.3" y="8" width="1.4" height="4.5" rx="0.7" fill="#C62828"/>
              <circle cx="10" cy="14.5" r="0.9" fill="#C62828"/>
            </svg>
          </div>
          <div className="hp-gkpi-body">
            <div className="hp-gkpi-label">Vencidas</div>
            <div className="hp-gkpi-val hp-gkpi-val--alert">{totalVencidas}</div>
            <div className="hp-gkpi-sub">Total días vencidas</div>
          </div>
        </div>
        <div className="hp-gkpi">
          <div className="hp-gkpi-icon" style={{ background: '#EDE7F6' }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <rect x="4" y="2" width="12" height="16" rx="2" fill="#D1C4E9" stroke="#5E35B1" strokeWidth="1.3"/>
              <path d="M7 7h6M7 10.5h6M7 14h4" stroke="#5E35B1" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="hp-gkpi-body">
            <div className="hp-gkpi-label">Solicitudes</div>
            <div className="hp-gkpi-val">{totalSolicitudes}</div>
            <div className="hp-gkpi-sub">Total registradas</div>
          </div>
        </div>
      </div>

      {/* ── App cards ─────────────────────────────────────────── */}
      <div className="hp-apps hp-apps--3">
        <AppCard
          imgNode={<TrazIcon />}
          imgSmall
          imgBg="#EDE7F6"
          title="Trazabilidad de Vacaciones"
          desc="Consulta saldos, jerarquías y seguimiento del estado de vacaciones en la organización."
          badge={
            <ul className="hp-app-bullets">
              <li>Jerarquía organizacional</li>
              <li>Equipo / Líder</li>
              <li>Saldo vacacional</li>
            </ul>
          }
          ctaLabel="Ingresar"
          ctaVariant="purple"
          onClick={() => onNavigate('trazabilidad')}
        />
        <AppCard
          imgNode={<ReporteIcon />}
          imgSmall
          imgBg="#E8F5E9"
          title="Reporte de Registro de Vacaciones"
          desc="Consulta el historial de solicitudes y aprobaciones."
          badge={
            <ul className="hp-app-bullets">
              <li>Historial de solicitudes</li>
              <li>Histórico de aprobaciones</li>
              <li>Exportación</li>
            </ul>
          }
          ctaLabel="Ingresar"
          ctaVariant="green"
          onClick={() => onNavigate('reporte-vacaciones', 'reportes')}
        />
        <AppCard
          imgNode={<BellIcon />}
          imgSmall
          imgBg="#FFF3E0"
          title="Pendientes de aprobación"
          desc=""
          badge={
            pendingApprovalCount > 0
              ? <div className="hp-pending-highlight">
                  <div className="hp-pending-count-row">
                    <span className="hp-pending-num">{pendingApprovalCount}</span>
                    <span className="hp-pending-unit">solicitudes</span>
                  </div>
                  <div className="hp-pending-sub">Requieren tu atención.</div>
                </div>
              : <span style={{ fontSize: 13, color: '#888' }}>Sin pendientes GH actualmente.</span>
          }
          ctaLabel="Ir a Aprobaciones"
          ctaVariant="primary"
          onClick={() => onNavigate('solicitudes-pendientes')}
        />
      </div>

      <div className="hp-footer">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="#888" strokeWidth="1.2"/>
          <rect x="6.3" y="6" width="1.4" height="4.5" rx="0.7" fill="#888"/>
          <circle cx="7" cy="4.5" r="0.8" fill="#888"/>
        </svg>
        ¿Necesitas ayuda? Visita el <button className="hp-footer-link">Centro de Ayuda</button> o contacta a <button className="hp-footer-link">Soporte GH.</button>
      </div>
    </div>
  );
};

export default HomePage;
