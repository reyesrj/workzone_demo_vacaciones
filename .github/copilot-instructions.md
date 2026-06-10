# SAP Build Work Zone Vacation Portal Demo

## Objetivo

Este proyecto tiene como finalidad construir un prototipo navegable que simule una implementación real de SAP Build Work Zone Standard Edition para la gestión de vacaciones.

El prototipo será utilizado para demostraciones funcionales, validaciones de UX y levantamiento de requerimientos.

No debe existir dependencia de backend real, SAP BTP, SAP CAP, SAP HANA o servicios externos.

Toda la información debe mantenerse mediante datos mock almacenados localmente.

---

# Tecnologías

## Frontend

- React
- TypeScript
- Vite
- UI5 Web Components
- UI5 Web Components React

## Diseño

- SAP Fiori 3
- SAP Horizon Theme
- SAP Build Work Zone Standard Edition

---

# Arquitectura

La aplicación debe organizarse de la siguiente manera:

src/

components/
data/
pages/
styles/

.github/
copilot-instructions.md

---

# Principios de Desarrollo

## Reutilización

Crear componentes reutilizables.

Evitar duplicación de código.

Si un componente puede reutilizarse en más de una página debe moverse a:

src/components

---

## Datos

No consumir APIs.

No crear servicios backend.

No utilizar bases de datos.

Toda la información debe residir en:

src/data

Ejemplo:

- users.ts
- vacationRequests.ts
- reports.ts

---

## Navegación

La navegación debe simular SAP Build Work Zone.

Utilizar el concepto:

Space
    └── Page

No utilizar el concepto clásico de:

Catalog
Group

---

# Diseño Work Zone

La interfaz debe parecer una implementación real de SAP Build Work Zone.

Debe incluir:

- Header corporativo
- Shell principal
- Avatar de usuario
- Menú de Spaces
- Menú de Pages
- Cards UI5
- App Tiles
- Dashboard responsive

---

# Pantalla de Login

Debe simular SAP Build Work Zone.

Requisitos:

- Diseño corporativo SAP
- Logo del portal
- Nombre Portal de Vacaciones
- Selector de usuario demo
- Botón Ingresar

No implementar autenticación real.

Guardar usuario en localStorage.

---

# Roles

## Colaborador Standard

Horario:

Lunes a Viernes
09:00 - 18:00

Funciones:

- Solicitar vacaciones
- Ver saldo
- Ver solicitudes
- Ver trazabilidad

Flujo:

Solicitud
    →
Jefe Aprobador
    →
Aprobado/Rechazado

---

## Colaborador Rotativo

Horario:

Variable

Funciones:

- Solicitar vacaciones
- Ver saldo
- Ver solicitudes
- Ver trazabilidad

Flujo:

Solicitud
    →
Jefe Aprobador
    →
Administrador GH
    →
Aprobado/Rechazado

Siempre debe visualizarse el doble nivel de aprobación.

---

## Jefe Aprobador

Funciones:

- Aprobar solicitudes
- Rechazar solicitudes
- Revisar equipo
- Gestionar anulaciones
- Consultar reportes
- Consultar trazabilidad

---

## Administrador GH

Funciones:

- Aprobar solicitudes rotativas
- Rechazar solicitudes rotativas
- Gestionar anulaciones
- Consultar reportes globales
- Consultar trazabilidad global

---

# Estados

La aplicación debe utilizar los siguientes estados:

1 Creado

2 Pendiente Aprobación Jefe

3 Aprobado por Jefe

4 Pendiente Administración GH

5 Aprobado

6 Rechazado

7 Pendiente de Anulación

8 Anulado

---

# Páginas

## HomePage

Dashboard principal.

Mostrar:

- Saldo de vacaciones
- Solicitudes pendientes
- Solicitudes aprobadas
- Indicadores
- Accesos rápidos

---

## SolicitudVacaciones

Formulario de solicitud.

Campos:

- Fecha inicio
- Fecha fin
- Días solicitados
- Comentarios

---

## MisSolicitudes

Tabla responsive.

Columnas:

- ID
- Fecha Inicio
- Fecha Fin
- Días
- Estado
- Aprobador Actual
- Acciones

---

## AprobacionVacaciones

Vista de aprobación.

Acciones:

- Aprobar
- Rechazar
- Ver detalle

---

## ReportesVacaciones

Filtros:

- Usuario
- Jefatura
- Estado
- Fecha inicio
- Fecha fin

Mostrar:

- KPIs
- Cards
- Tabla

---

## Trazabilidad

Mostrar timeline visual.

Ejemplo:

Creado
↓
Pendiente Jefe
↓
Pendiente GH
↓
Aprobado

---

# Cards UI5

Utilizar cards reutilizables.

Cards mínimas:

- Saldo Vacacional
- Nueva Solicitud
- Mis Solicitudes
- Pendientes de Aprobación
- Indicadores
- Trazabilidad

---

# Responsive

La aplicación debe adaptarse a:

- Desktop
- Tablet
- Mobile

Priorizar experiencia desktop.

---

# Calidad

Antes de generar código verificar:

- TypeScript sin errores
- Imports válidos
- Componentes reutilizables
- Responsive
- Mantener estilo SAP Fiori

---

# Restricciones

No usar:

- Backend real
- APIs externas
- SAP CAP
- SAP HANA
- Servicios SAP

No crear dependencias innecesarias.

Mantener el proyecto simple, limpio y demostrable.

---

# Cuando se soliciten cambios

Todo cambio nuevo debe:

1. Respetar arquitectura existente.
2. Mantener estilo SAP Work Zone.
3. Mantener datos mock.
4. Documentar archivos modificados.
5. Explicar impacto funcional.
6. No romper funcionalidades existentes.

---

# Resultado esperado

El resultado final debe parecer una implementación real de SAP Build Work Zone para gestión de vacaciones, lista para demostraciones funcionales y publicación en GitHub Pages.