import React, { useState } from 'react';
import type { User } from '../data/users';
import { USERS } from '../data/users';
import type { VacationRequest } from '../data/vacationRequests';
import { STATUS_LABELS, STATUS_CSS_CLASS } from '../data/vacationRequests';
import { generateReport, getGlobalKPIs } from '../data/reports';
import SpacePage from '../components/SpacePage';
import Ui5Card from '../components/Ui5Card';

interface Props {
  user: User;
  requests: VacationRequest[];
}

const ReportesVacaciones: React.FC<Props> = ({ user, requests }) => {
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const kpis = getGlobalKPIs(requests);
  const report = generateReport(requests);

  const isAdmin = user.role === 'administrador_gh' || user.role === 'jefe_aprobador';

  /* apply filters to raw requests */
  const filtered = requests.filter((r) => {
    if (filterUser && r.userId !== filterUser) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterStart && r.startDate < filterStart) return false;
    if (filterEnd && r.endDate > filterEnd) return false;
    return true;
  });

  return (
    <SpacePage spaceName="Reportes" pageName="Reporte de Vacaciones">
      {/* ── KPI Bar ──────────────────────────────────────────── */}
      <div className="wz-kpi-bar">
        <div className="wz-kpi-tile">
          <div className="wz-kpi-tile-num" style={{ color: 'var(--wz-primary)' }}>{kpis.total}</div>
          <div className="wz-kpi-tile-lbl">Total Solicitudes</div>
        </div>
        <div className="wz-kpi-tile">
          <div className="wz-kpi-tile-num" style={{ color: 'var(--wz-warning)' }}>{kpis.pendientes}</div>
          <div className="wz-kpi-tile-lbl">Pendientes</div>
        </div>
        <div className="wz-kpi-tile">
          <div className="wz-kpi-tile-num" style={{ color: 'var(--wz-success)' }}>{kpis.aprobadas}</div>
          <div className="wz-kpi-tile-lbl">Aprobadas</div>
        </div>
        <div className="wz-kpi-tile">
          <div className="wz-kpi-tile-num" style={{ color: 'var(--wz-error)' }}>{kpis.rechazadas}</div>
          <div className="wz-kpi-tile-lbl">Rechazadas</div>
        </div>
        <div className="wz-kpi-tile">
          <div className="wz-kpi-tile-num" style={{ color: '#e76500' }}>{kpis.pendientes_anulacion}</div>
          <div className="wz-kpi-tile-lbl">Pend. Anulación</div>
        </div>
        <div className="wz-kpi-tile">
          <div className="wz-kpi-tile-num" style={{ color: '#6b3fa0' }}>{kpis.anuladas}</div>
          <div className="wz-kpi-tile-lbl">Anuladas</div>
        </div>
        <div className="wz-kpi-tile">
          <div className="wz-kpi-tile-num" style={{ color: 'var(--wz-error)' }}>{kpis.anulaciones_rechazadas}</div>
          <div className="wz-kpi-tile-lbl">Anul. Rechazadas</div>
        </div>
        <div className="wz-kpi-tile">
          <div className="wz-kpi-tile-num" style={{ color: 'var(--wz-success)' }}>{kpis.diasAprobados}</div>
          <div className="wz-kpi-tile-lbl">Días Aprobados</div>
        </div>
      </div>

      {/* ── Resumen por Colaborador ───────────────────────────── */}
      {isAdmin && (
        <Ui5Card
          title="Resumen por Colaborador"
          subtitle="Saldos y estadísticas"
          style={{ marginBottom: 24 }}
        >
          <div className="wz-table-wrap">
            <table className="wz-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Departamento</th>
                  <th>Saldo</th>
                  <th>Solicitudes</th>
                  <th>Aprobadas</th>
                  <th>Rechazadas</th>
                  <th>Días Aprobados</th>
                  <th>Días Pendientes</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row) => (
                  <tr key={row.userId}>
                    <td style={{ fontWeight: 600 }}>{row.userName}</td>
                    <td style={{ fontSize: 12, color: 'var(--wz-text-secondary)' }}>
                      {row.department}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: row.balance > 10 ? 'var(--wz-success)' : 'var(--wz-warning)',
                        }}
                      >
                        {row.balance}
                      </span>
                    </td>
                    <td>{row.totalRequests}</td>
                    <td style={{ color: 'var(--wz-success)' }}>{row.approved}</td>
                    <td style={{ color: 'var(--wz-error)' }}>{row.rejected}</td>
                    <td style={{ color: 'var(--wz-success)', fontWeight: 600 }}>
                      {row.approvedDays}
                    </td>
                    <td style={{ color: 'var(--wz-warning)' }}>{row.pendingDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Ui5Card>
      )}

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="wz-filter-bar">
        <div className="wz-filter-field">
          <label>Colaborador</label>
          <select
            className="wz-native-select"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="">Todos</option>
            {USERS.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="wz-filter-field">
          <label>Estado</label>
          <select
            className="wz-native-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="wz-filter-field">
          <label>Desde</label>
          <input
            type="date"
            className="wz-input"
            style={{ padding: '7px 10px' }}
            value={filterStart}
            onChange={(e) => setFilterStart(e.target.value)}
          />
        </div>
        <div className="wz-filter-field">
          <label>Hasta</label>
          <input
            type="date"
            className="wz-input"
            style={{ padding: '7px 10px' }}
            value={filterEnd}
            onChange={(e) => setFilterEnd(e.target.value)}
          />
        </div>
        <div className="wz-filter-field" style={{ justifyContent: 'flex-end' }}>
          <label>&nbsp;</label>
          <button
            className="wz-btn wz-btn-outline wz-btn-sm"
            onClick={() => { setFilterUser(''); setFilterStatus(''); setFilterStart(''); setFilterEnd(''); }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* ── Tabla de Solicitudes ─────────────────────────────── */}
      <Ui5Card
        title="Solicitudes de Vacaciones"
        subtitle={`${filtered.length} resultado(s)`}
      >
        {filtered.length === 0 ? (
          <div className="wz-empty">
            <div className="wz-empty-icon">🔍</div>
            <h3>Sin resultados</h3>
            <p>Ajusta los filtros para ver solicitudes.</p>
          </div>
        ) : (
          <div className="wz-table-wrap">
            <table className="wz-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Colaborador</th>
                  <th>Período</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Aprobador</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 600, color: 'var(--wz-primary)' }}>{req.id}</td>
                    <td>{req.userName}</td>
                    <td style={{ fontSize: 13 }}>{req.startDate} → {req.endDate}</td>
                    <td><span className="wz-req-days">{req.days}</span></td>
                    <td>
                      <span className={`wz-status ${STATUS_CSS_CLASS[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--wz-text-secondary)' }}>
                      {req.currentApprover ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Ui5Card>
    </SpacePage>
  );
};

export default ReportesVacaciones;
