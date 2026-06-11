import React, { useState } from 'react';
import { ROLE_LABELS } from '../data/users';
import type { User, UserRole } from '../data/users';
import { useVacationRequests } from '../hooks/useVacationRequests';
import type { SpaceId, PageId, NavigateFn } from '../types';
import HomePage from '../pages/HomePage';
import SolicitudVacaciones from '../pages/SolicitudVacaciones';
import MisSolicitudes from '../pages/MisSolicitudes';
import AprobacionVacaciones from '../pages/AprobacionVacaciones';
import ReportesVacaciones from '../pages/ReportesVacaciones';
import Trazabilidad from '../pages/Trazabilidad';
import '../styles/workzone.css';

/* ------------------------------------------------------------------ */
/*  Navigation structure                                                */
/* ------------------------------------------------------------------ */

interface PageDef { id: PageId; label: string }
interface SpaceDef { id: SpaceId; label: string; roles: UserRole[]; pages: PageDef[] }

const ALL_ROLES: UserRole[] = [
  'colaborador_standard',
  'colaborador_rotativo',
  'jefe_aprobador',
  'administrador_gh',
];

const SPACES: SpaceDef[] = [
  {
    id: 'mis-vacaciones',
    label: 'Mis Vacaciones',
    roles: ALL_ROLES,
    pages: [
      { id: 'inicio', label: 'Inicio' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Avatar colour per role                                              */
/* ------------------------------------------------------------------ */

const AVATAR_COLOR: Record<string, string> = {
  colaborador_standard: '#DA291C',
  colaborador_rotativo: '#e76500',
  jefe_aprobador:       '#188918',
  administrador_gh:     '#6b3fa0',
};

const SPACE_ICONS: Record<SpaceId, string> = {
  'mis-vacaciones': '🏖️',
  'aprobaciones':   '✅',
  'reportes':       '📊',
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface Props { user: User; onLogout: () => void }

const WorkZoneShell: React.FC<Props> = ({ user, onLogout }) => {
  const { requests, addRequest, updateStatus, updateRequest } = useVacationRequests();

  const visibleSpaces = SPACES.filter((s) => s.roles.includes(user.role));
  const [currentSpaceId, setCurrentSpaceId] = useState<SpaceId>(visibleSpaces[0].id);
  const [currentPageId, setCurrentPageId] = useState<PageId>(visibleSpaces[0].pages[0].id);
  const [showMenu, setShowMenu] = useState(false);

  const currentSpace = visibleSpaces.find((s) => s.id === currentSpaceId)!;

  const navigateTo: NavigateFn = (pageId, spaceId) => {
    if (spaceId) {
      const valid = visibleSpaces.find((s) => s.id === spaceId);
      if (valid) setCurrentSpaceId(spaceId);
    }
    setCurrentPageId(pageId);
  };

  const handleSpaceClick = (space: SpaceDef) => {
    setCurrentSpaceId(space.id);
    setCurrentPageId(space.pages[0].id);
  };

  /* ---- render current page ---------------------------------------- */
  const renderPage = () => {
    const myRequests = requests.filter((r) => r.userId === user.id);

    switch (currentPageId) {
      case 'inicio':
        return (
          <HomePage
            user={user}
            requests={myRequests}
            allRequests={requests}
            onNavigate={navigateTo}
          />
        );
      case 'solicitar-vacaciones':
        return (
          <SolicitudVacaciones
            user={user}
            requests={myRequests}
            onAddRequest={addRequest}
            onUpdateStatus={updateStatus}
            onUpdateRequest={updateRequest}
            onNavigate={navigateTo}
          />
        );
      case 'mis-solicitudes':
        return (
          <SolicitudVacaciones
            user={user}
            requests={myRequests}
            onAddRequest={addRequest}
            onUpdateStatus={updateStatus}
            onUpdateRequest={updateRequest}
            onNavigate={navigateTo}
            initialTab="mis"
          />
        );
      case 'solicitudes-pendientes':
        return (
          <AprobacionVacaciones
            user={user}
            requests={requests}
            mode="pendientes"
            onUpdateStatus={updateStatus}
          />
        );
      case 'gestion-anulaciones':
        return (
          <AprobacionVacaciones
            user={user}
            requests={requests}
            mode="anulaciones"
            onUpdateStatus={updateStatus}
          />
        );
      case 'reporte-vacaciones':
        return <ReportesVacaciones user={user} requests={requests} />;
      case 'trazabilidad':
        return (
          <Trazabilidad
            user={user}
            requests={requests}
            onNavigate={navigateTo}
          />
        );
      default:
        return (
          <HomePage
            user={user}
            requests={myRequests}
            allRequests={requests}
            onNavigate={navigateTo}
          />
        );
    }
  };

  return (
    <div className="wz-shell" onClick={() => showMenu && setShowMenu(false)}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="wz-header">
        <div className="wz-header-start">
          {/* Product switcher */}
          <div className="wz-product-switcher">
            <div className="wz-product-switcher-icon">
              {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
            </div>
          </div>
          <div className="wz-header-logo-area">
            <img
              src={`${import.meta.env.BASE_URL}claro-logo.svg`}
                alt="Claro Perú"
                className="wz-claro-logo"
                style={{ height: "24px" }}
              />
            <div className="wz-header-app-separator" />
            <span className="wz-header-app-name">
              {currentPageId === 'trazabilidad'
                ? 'Trazabilidad de Vacaciones'
                : 'Portal de Vacaciones'}
            </span>
          </div>
        </div>

        <div
          className="wz-header-end"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Notification bell */}
          <button className="wz-header-icon-btn" title="Notificaciones">🔔</button>

          <div className="wz-profile-area" onClick={() => setShowMenu((v) => !v)}>
            <div
              className="wz-avatar-shell"
              style={{ background: AVATAR_COLOR[user.role] ?? '#DA291C' }}
            >
              {user.initials}
            </div>
            <span className="wz-profile-name-header">{user.name}</span>
            <span className="wz-chevron">▾</span>
          </div>

          {showMenu && (
            <div className="wz-profile-menu">
              <div className="wz-profile-menu-header">
                <div
                  className="wz-avatar-lg"
                  style={{ background: AVATAR_COLOR[user.role] ?? '#DA291C' }}
                >
                  {user.initials}
                </div>
                <div>
                  <div className="wz-profile-menu-name">{user.name}</div>
                  <div className="wz-profile-menu-role">{ROLE_LABELS[user.role]}</div>
                  <div className="wz-profile-menu-dept">{user.department}</div>
                </div>
              </div>
              <hr className="wz-profile-menu-divider" />
              <button
                className="wz-btn-logout"
                onClick={() => { setShowMenu(false); onLogout(); }}
              >
                <span>⏻</span> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Spaces Navigation ────────────────────────────────────── */}
      <nav className="wz-spaces-nav" aria-label="Spaces">
        {visibleSpaces.map((space) => (
          <button
            key={space.id}
            className={`wz-space-tab${currentSpaceId === space.id ? ' active' : ''}`}
            onClick={() => handleSpaceClick(space)}
          >
            <span className="wz-space-tab-icon">{SPACE_ICONS[space.id]}</span>
            {space.label}
          </button>
        ))}
      </nav>

      {/* ── Pages Navigation ────────────────────────────────────── */}
      <nav className="wz-pages-nav" aria-label="Pages">
        {currentSpace.pages.map((page) => (
          <button
            key={page.id}
            className={`wz-page-tab${currentPageId === page.id ? ' active' : ''}`}
            onClick={() => setCurrentPageId(page.id)}
          >
            {page.label}
          </button>
        ))}
      </nav>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="wz-content">{renderPage()}</main>
    </div>
  );
};

export default WorkZoneShell;
