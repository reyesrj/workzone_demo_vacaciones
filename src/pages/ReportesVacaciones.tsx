import React, { useState } from 'react';
import type { User } from '../data/users';
import { USERS, ROLE_LABELS } from '../data/users';
import type { VacationRequest } from '../data/vacationRequests';
import { STATUS_LABELS, STATUS_CSS_CLASS } from '../data/vacationRequests';
import { getGlobalKPIs } from '../data/reports';
import Section from '../components/Section';
import SpacePage from '../components/SpacePage';
import Ui5Card from '../components/Ui5Card';

interface Props {
  user: User;
  requests: VacationRequest[];
}

const ReportesVacaciones: React.FC<Props> = ({ user, requests }) => {
  const [filterDirection, setFilterDirection] = useState('');
  const [filterSubDirection, setFilterSubDirection] = useState('');
  const [filterGerencia, setFilterGerencia] = useState('');
  const [filterJefatura, setFilterJefatura] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const kpis = getGlobalKPIs(requests);
  const isAdmin = user.role === 'administrador_gh';
  const isManager = user.role === 'jefe_aprobador';

  const directReports = USERS.filter((u) => u.managerId === user.id);
  const indirectReports = USERS.filter(
    (u) => u.managerId && directReports.some((direct) => direct.id === u.managerId)
  );

  const visibleUsers = isAdmin
    ? USERS
    : [user, ...directReports, ...indirectReports];

  const visibleUserIds = visibleUsers.map((u) => u.id);
  const userMap = new Map(USERS.map((u) => [u.id, u]));

  const directionOptions = Array.from(new Set(visibleUsers.map((u) => u.department))).sort();
  const subDirectionOptions = Array.from(new Set(visibleUsers.map((u) => u.schedule))).sort();
  const gerenciaOptions = Array.from(new Set(visibleUsers.map((u) => ROLE_LABELS[u.role]))).sort();
  const jefaturaOptions = Array.from(
    new Set(visibleUsers.filter((u) => u.approver).map((u) => u.approver!))
  ).sort();

  const visibleRequests = requests.filter((req) => visibleUserIds.includes(req.userId));

  const filtered = visibleRequests.filter((r) => {
    const requestUser = userMap.get(r.userId);
    if (!requestUser) return false;
    if (filterDirection && requestUser.department !== filterDirection) return false;
    if (filterSubDirection && requestUser.schedule !== filterSubDirection) return false;
    if (filterGerencia && ROLE_LABELS[requestUser.role] !== filterGerencia) return false;
    if (filterJefatura) {
      const managerName = requestUser.approver || userMap.get(requestUser.managerId ?? '')?.name;
      if (managerName !== filterJefatura && r.currentApprover !== filterJefatura) return false;
    }
    if (filterUser && r.userId !== filterUser) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterStart && r.startDate < filterStart) return false;
    if (filterEnd && r.endDate > filterEnd) return false;
    return true;
  });

  const getApprovalDate = (history: VacationRequest['history']) => {
    const step = history.slice().reverse().find((item) => [
      'aprobado',
      'aprobado_jefe',
      'pendiente_gh',
      'pendiente_anulacion',
      'rechazado',
      'anulado',
      'anulacion_rechazada',
    ].includes(item.status));
    return step?.date ?? '—';
  };

  const downloadReport = (format: 'csv' | 'excel') => {
    const rows = filtered.map((req) => {
      const userData = userMap.get(req.userId);
      return {
        codigo: userData?.codigoEmpleado ?? '—',
        empleado: req.userName,
        fechaIngreso: userData?.hireDate ?? '—',
        cargo: ROLE_LABELS[req.userRole],
        responsable: userData?.approver ?? '—',
        direccion: userData?.department ?? '—',
        subDireccion: userData?.schedule ?? '—',
        gerencia: ROLE_LABELS[userData?.role ?? req.userRole],
        jefatura: userData?.approver ?? req.currentApprover ?? '—',
        saldoVacacional: userData?.vacationBalance ?? 0,
        truncas: userData?.vacationBalanceTruncas ?? 0,
        pendientes: userData?.vacationBalancePendientes ?? 0,
        vencidas: userData?.vacationBalanceVencidas ?? 0,
        planificadas: req.days,
        numeroSolicitud: req.id,
        fechaAprobacion: getApprovalDate(req.history),
        fechaInicio: req.startDate,
        fechaFin: req.endDate,
        estado: STATUS_LABELS[req.status],
      };
    });

    const headings = [
      'Codigo',
      'Empleado',
      'Fecha Ingreso',
      'Cargo',
      'Responsable',
      'Dirección',
      'SubDirección',
      'Gerencia',
      'Jefatura',
      'Saldo Vacacional',
      'Truncas',
      'Pendientes',
      'Vencidas',
      'Planificadas',
      'Número Solicitud',
      'Fecha Aprobación',
      'Fecha Inicio Vacaciones',
      'Fecha Fin Vacaciones',
      'Estado',
    ];

    const formatCell = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [
      headings.join(','),
      ...rows.map((row) =>
        [
          row.codigo,
          row.empleado,
          row.fechaIngreso,
          row.cargo,
          row.responsable,
          row.direccion,
          row.subDireccion,
          row.gerencia,
          row.jefatura,
          row.saldoVacacional,
          row.truncas,
          row.pendientes,
          row.vencidas,
          row.planificadas,
          row.numeroSolicitud,
          row.fechaAprobacion,
          row.fechaInicio,
          row.fechaFin,
          row.estado,
        ].map(formatCell).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], {
      type: format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `reporte-vacaciones.${format === 'excel' ? 'xls' : 'csv'}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SpacePage spaceName="Reportes" pageName="Reporte de Vacaciones">
      <Section title="Indicadores clave" subtitle="Métricas esenciales de vacaciones">
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
      </Section>

      {(isAdmin || isManager) && (
        <Section title="Resumen organizacional" subtitle="Indicadores de cobertura y alcance del reporte">
          <div className="wz-kpi-row">
            <div className="wz-kpi-card">
              <span className="wz-kpi-card-label">Colaboradores directos</span>
              <strong className="wz-kpi-card-value">{directReports.length}</strong>
              <span className="wz-kpi-card-sub">Equipo bajo tu gestión inmediata.</span>
              <div className="wz-kpi-card-accent-bar" style={{ background: '#0f4fa8' }} />
            </div>
            <div className="wz-kpi-card">
              <span className="wz-kpi-card-label">Colaboradores indirectos</span>
              <strong className="wz-kpi-card-value">{indirectReports.length}</strong>
              <span className="wz-kpi-card-sub">Nodos jerárquicos adicionales visibles.</span>
              <div className="wz-kpi-card-accent-bar" style={{ background: '#f57c00' }} />
            </div>
            <div className="wz-kpi-card">
              <span className="wz-kpi-card-label">Total de colaboradores visibles</span>
              <strong className="wz-kpi-card-value">{visibleUsers.length}</strong>
              <span className="wz-kpi-card-sub">Alcance del reporte según tu rol.</span>
              <div className="wz-kpi-card-accent-bar" style={{ background: '#188918' }} />
            </div>
            <div className="wz-kpi-card">
              <span className="wz-kpi-card-label">Cobertura de reporte</span>
              <strong className="wz-kpi-card-value">{isAdmin ? 'Organización completa' : 'Equipo y jerarquía'}</strong>
              <span className="wz-kpi-card-sub">Visualización adaptada a tu perfil.</span>
              <div className="wz-kpi-card-accent-bar" style={{ background: '#6b3fa0' }} />
            </div>
          </div>
        </Section>
      )}

      <Section title="Filtros avanzados" subtitle="Filtra por unidad, colaborador, estado y fechas">
        <Ui5Card
          title="Control de filtros"
          subtitle="Aplica criterios múltiple para analizar la organización"
          action={
            <div className="wz-export-actions">
              <button className="wz-btn wz-btn-outline wz-btn-sm" type="button" onClick={() => downloadReport('csv')}>
                Exportar CSV
              </button>
              <button className="wz-btn wz-btn-primary wz-btn-sm" type="button" onClick={() => downloadReport('excel')}>
                Exportar Excel
              </button>
            </div>
          }
        >
          <div className="wz-form">
            <div className="wz-form-row">
              <div className="wz-field">
                <label>Dirección</label>
                <select
                  className="wz-native-select"
                  value={filterDirection}
                  onChange={(e) => setFilterDirection(e.target.value)}
                >
                  <option value="">Todas</option>
                  {directionOptions.map((direction) => (
                    <option key={direction} value={direction}>{direction}</option>
                  ))}
                </select>
              </div>
              <div className="wz-field">
                <label>SubDirección</label>
                <select
                  className="wz-native-select"
                  value={filterSubDirection}
                  onChange={(e) => setFilterSubDirection(e.target.value)}
                >
                  <option value="">Todas</option>
                  {subDirectionOptions.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div className="wz-field">
                <label>Gerencia</label>
                <select
                  className="wz-native-select"
                  value={filterGerencia}
                  onChange={(e) => setFilterGerencia(e.target.value)}
                >
                  <option value="">Todas</option>
                  {gerenciaOptions.map((gerencia) => (
                    <option key={gerencia} value={gerencia}>{gerencia}</option>
                  ))}
                </select>
              </div>
              <div className="wz-field">
                <label>Jefatura</label>
                <select
                  className="wz-native-select"
                  value={filterJefatura}
                  onChange={(e) => setFilterJefatura(e.target.value)}
                >
                  <option value="">Todas</option>
                  {jefaturaOptions.map((boss) => (
                    <option key={boss} value={boss}>{boss}</option>
                  ))}
                </select>
              </div>
              <div className="wz-field">
                <label>Colaborador</label>
                <select
                  className="wz-native-select"
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                >
                  <option value="">Todos</option>
                  {visibleUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="wz-field">
                <label>Estado</label>
                <select
                  className="wz-native-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Todos</option>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="wz-field">
                <label>Fecha Desde</label>
                <input
                  type="date"
                  className="wz-input"
                  value={filterStart}
                  onChange={(e) => setFilterStart(e.target.value)}
                />
              </div>
              <div className="wz-field">
                <label>Fecha Hasta</label>
                <input
                  type="date"
                  className="wz-input"
                  value={filterEnd}
                  onChange={(e) => setFilterEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="wz-form-actions">
            <button
              type="button"
              className="wz-btn wz-btn-outline"
              onClick={() => {
                setFilterDirection('');
                setFilterSubDirection('');
                setFilterGerencia('');
                setFilterJefatura('');
                setFilterUser('');
                setFilterStatus('');
                setFilterStart('');
                setFilterEnd('');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        </Ui5Card>
      </Section>

      <Section title="Resultados" subtitle="Solicitudes filtradas">
        <Ui5Card title="Solicitudes de Vacaciones" subtitle={`${filtered.length} resultado(s)`}>
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
                    <th>Código</th>
                    <th>Empleado</th>
                    <th>Fecha Ingreso</th>
                    <th>Cargo</th>
                    <th>Responsable</th>
                    <th>Dirección</th>
                    <th>SubDirección</th>
                    <th>Gerencia</th>
                    <th>Jefatura</th>
                    <th>Saldo Vacacional</th>
                    <th>Truncas</th>
                    <th>Pendientes</th>
                    <th>Vencidas</th>
                    <th>Planificadas</th>
                    <th>Número Solicitud</th>
                    <th>Fecha Aprobación</th>
                    <th>Fecha Inicio Vacaciones</th>
                    <th>Fecha Fin Vacaciones</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((req) => {
                    const requestUser = userMap.get(req.userId);
                    return (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 600 }}>{requestUser?.codigoEmpleado ?? '—'}</td>
                        <td>{req.userName}</td>
                        <td>{requestUser?.hireDate ?? '—'}</td>
                        <td>{ROLE_LABELS[req.userRole]}</td>
                        <td>{requestUser?.approver ?? req.currentApprover ?? '—'}</td>
                        <td>{requestUser?.department ?? '—'}</td>
                        <td>{requestUser?.schedule ?? '—'}</td>
                        <td>{ROLE_LABELS[requestUser?.role ?? req.userRole]}</td>
                        <td>{requestUser?.approver ?? req.currentApprover ?? '—'}</td>
                        <td>{requestUser?.vacationBalance ?? 0}</td>
                        <td>{requestUser?.vacationBalanceTruncas ?? 0}</td>
                        <td>{requestUser?.vacationBalancePendientes ?? 0}</td>
                        <td>{requestUser?.vacationBalanceVencidas ?? 0}</td>
                        <td>{req.days}</td>
                        <td>{getApprovalDate(req.history)}</td>
                        <td>{req.startDate}</td>
                        <td>{req.endDate}</td>
                        <td>
                          <span className={`wz-status ${STATUS_CSS_CLASS[req.status]}`}>
                            {STATUS_LABELS[req.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Ui5Card>
      </Section>
    </SpacePage>
  );
};

export default ReportesVacaciones;
