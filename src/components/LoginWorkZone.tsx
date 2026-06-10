import React, { useState } from 'react';
import { USERS, storeUser, ROLE_LABELS } from '../data/users';
import type { User } from '../data/users';
import '../styles/workzone.css';

const AVATAR_COLORS: Record<string, string> = {
  colaborador_standard: '#DA291C',
  colaborador_rotativo: '#e76500',
  jefe_aprobador: '#188918',
  administrador_gh: '#6b3fa0',
};

interface LoginWorkZoneProps {
  onLogin: (user: User) => void;
}

const LoginWorkZone: React.FC<LoginWorkZoneProps> = ({ onLogin }) => {
  const [selectedId, setSelectedId] = useState(USERS[0].id);
  const selectedUser = USERS.find((u) => u.id === selectedId) ?? USERS[0];

  const handleLogin = () => {
    storeUser(selectedUser);
    onLogin(selectedUser);
  };

  return (
    <div className="wz-login-root">
      {/* ── Brand panel (left) ──────────────────────────── */}
      <div className="wz-login-brand">
        <div className="wz-login-brand-top">
          <span className="wz-claro-logo-pill">claro</span>
        </div>

        <div className="wz-login-brand-body">
          <span className="wz-login-brand-icon">🏖️</span>
          <h1 className="wz-login-brand-title">
            Portal de<br />Vacaciones
          </h1>
          <p className="wz-login-brand-sub">
            Gestión de Vacaciones<br />Corporativas Claro Perú
          </p>
        </div>

        <div className="wz-login-brand-footer">
          © 2026 Claro Perú — Portal de Vacaciones
        </div>
      </div>

      {/* ── Form panel (right) ────────────────────────── */}
      <div className="wz-login-form-panel">
        <div className="wz-login-form-inner">
          <div className="wz-login-form-header">
            <h2 className="wz-login-form-title">Iniciar Sesión</h2>
            <p className="wz-login-form-desc">
              Selecciona un usuario demo para explorar el portal
            </p>
          </div>

          <div className="wz-login-form-fields">
            <div className="wz-form-group">
              <label className="wz-form-label" htmlFor="user-select">
                Usuario Demo
              </label>
              <select
                id="user-select"
                className="wz-native-select-full"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {USERS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {ROLE_LABELS[u.role]}
                  </option>
                ))}
              </select>
            </div>

            <div className="wz-user-preview">
              <div
                className="wz-avatar-sm"
                style={{ background: AVATAR_COLORS[selectedUser.role] ?? '#DA291C' }}
              >
                {selectedUser.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div className="wz-user-preview-name">{selectedUser.name}</div>
                <div className="wz-user-preview-dept">
                  {selectedUser.department}
                </div>
                <span
                  className="wz-role-badge"
                  style={{
                    background: AVATAR_COLORS[selectedUser.role] + '20',
                    color: AVATAR_COLORS[selectedUser.role],
                    border: `1px solid ${AVATAR_COLORS[selectedUser.role]}40`,
                  }}
                >
                  {ROLE_LABELS[selectedUser.role]}
                </span>
              </div>
            </div>

            <button className="wz-btn-login" onClick={handleLogin}>
              Ingresar al Portal →
            </button>
          </div>

          <p style={{ marginTop: 24, fontSize: 11, color: '#aaa', textAlign: 'center' }}>
            Demo · Sin autenticación real
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginWorkZone;
