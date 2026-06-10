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
      <div className="wz-login-card">
        <div className="wz-login-card-brand">
          <img
            src={`${import.meta.env.BASE_URL}claro-logo.svg`}
            alt="Claro Perú"
            className="wz-login-claro-logo"
          />
          <div className="wz-login-card-copy">
            
            <h1 className="wz-login-card-title">Portal de Vacaciones</h1>
            <p className="wz-login-card-subtitle">
              Acceso corporativo demo para explorar el portal Claro Perú.
            </p>
          </div>
        </div>

        <div className="wz-login-form-inner">
          <div className="wz-login-form-header">
            <h2 className="wz-login-form-title">Iniciar sesión</h2>
            <p className="wz-login-form-desc">
              Selecciona tu usuario demo y accede al portal de vacaciones.
            </p>
          </div>

          <div className="wz-login-form-fields">
            <div className="wz-form-group">
              <label className="wz-form-label" htmlFor="user-select">
                Usuario demo
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

            <button type="button" className="wz-btn-login" onClick={handleLogin}>
              Ingresar al portal →
            </button>
          </div>

          <p className="wz-login-footer">
            Demo · Sin autenticación real
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginWorkZone;
