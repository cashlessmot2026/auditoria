# Urueta Dermatología · PWA PAMEC

Aplicación web progresiva (instalable en celular y PC) para gestionar el **Programa de Auditoría para el Mejoramiento de la Calidad (PAMEC)**, la habilitación y la preparación para la visita de la **Secretaría de Salud Departamental de San Andrés, Providencia y Santa Catalina**.

**Tecnología:** React 18 + Vite + Supabase (base de datos, autenticación y archivos) + Google Gemini (Auditor IA).

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Dashboard** | Índice de preparación para la auditoría, cumplimiento por categoría, ruta crítica de 9 pasos, vencimientos, avance por responsable, alertas (documentos por vencer, rechazos IA). |
| **Checklist PAMEC** | 77 requisitos precargados y editables (Decreto 780/2016 cap. 4, Pautas de Auditoría 2007, CE 012/2016 – ST002, Res. 3100/2019, seguridad del paciente, PGIRASA, SST, documentos legales de San Andrés, OCCRE, CORALINA…). Asignación de responsable, fechas, notas, exportación CSV. |
| **Evidencias** | Subir archivos o **tomar foto con la cámara trasera**. El **Auditor IA** revisa cada documento y da un concepto: aprobado / con observaciones / rechazado, con hallazgos, faltantes y recomendaciones. |
| **Cronograma** | Diagrama de Gantt y lista con fechas de ejecución editables, avance y evidencias por actividad. |
| **Capacitaciones** | Plan institucional de capacitación con 15 temas precargados, asistencia, cobertura, evaluación y listados de asistencia revisados por IA. |
| **Metas y funciones** | El admin asigna funciones individuales y metas a cada ejecutor. |
| **Equipo** (admin) | Crear perfiles, roles (admin / ejecutor), activar o desactivar, asignar requisitos por categoría. El admin puede asignarse a sí mismo la gestión documental. |
| **Auditor IA** | Chat con un agente Gemini que actúa como auditor del PAMEC: pregunta, pide documentos, verifica lo adjuntado y conoce el estado actual de la IPS. |
| **Ajustes** | Datos de la IPS, fecha meta de la auditoría, borrador del archivo **ST002** para la Supersalud, respaldo JSON, bitácora de trazabilidad. |

## Puesta en marcha

### 1. Base de datos (Supabase)
1. Entra a tu proyecto en Supabase → **SQL Editor** → **New query**.
2. Pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Crea tablas, seguridad por filas (RLS), triggers, el bucket privado `pamec-docs` y las funciones de inicio de sesión.

**Autenticación propia (no usa Supabase Auth):** el usuario/correo y la contraseña (cifrada con bcrypt) se guardan en la tabla `profiles`. La función `app_login` entrega un token de sesión que la app envía en el encabezado `x-app-token`; las políticas RLS lo validan con `current_uid()`. Tras 5 intentos fallidos el perfil se bloquea 15 minutos. Si venías de la versión con Supabase Auth, el script migra los perfiles y conserva las contraseñas.

### 2. Primer ingreso
- Si la base está vacía, crea el primer administrador desde el SQL Editor:
  ```sql
  insert into public.profiles (email, full_name, role, active, password_hash)
  values ('admin@urueta.local', 'Administrador', 'admin', true,
          extensions.crypt('CAMBIA-ESTA-CLAVE', extensions.gen_salt('bf')));
  ```
  (con usuario `admin`; los usuarios sin `@` se guardan como `usuario@urueta.local`).
- En el Dashboard pulsa **Cargar plantilla normativa**.
- En **Ajustes** completa NIT, código de habilitación y la fecha meta de la auditoría.
- En **Equipo** crea los perfiles con su contraseña asignada. Cada persona puede cambiarla en **Ajustes → Cambiar contraseña**, y el admin puede asignar una nueva si alguien la olvida.

### 3. Auditor IA (Gemini) – Edge Function segura
La llave de Gemini **no debe ir en el código público**. Se usa una Edge Function como intermediaria:

```bash
npm i -g supabase
supabase login
supabase link --project-ref ammeqhkgaksrhrsnxwys
supabase secrets set GEMINI_API_KEY=TU_LLAVE_DE_GEMINI
supabase functions deploy gemini-auditor
```

(Opcional) `supabase secrets set GEMINI_MODELS=gemini-3.5-flash,gemini-flash-latest` para cambiar los modelos.

Para **desarrollo local** puedes poner la llave en `.env` como `VITE_GEMINI_API_KEY` (el archivo `.env` está en `.gitignore` y no se sube).

### 4. Ejecutar en local
```bash
npm install
npm run dev
```

### 5. Publicación
Cada `push` a `main` publica automáticamente en **GitHub Pages** (`.github/workflows/deploy.yml`):
`https://cashlessmot2026.github.io/auditoria/`

También funciona en Vercel/Netlify (comando `npm run build`, carpeta `dist`).

## Seguridad
- RLS en todas las tablas: solo usuarios **activos** ven datos; solo el **admin** crea, borra o reasigna; un ejecutor solo modifica lo que tiene asignado (un trigger protege los campos normativos).
- Los documentos se guardan en un bucket **privado** y se abren con enlaces firmados temporales.
- La llave publicable de Supabase es pública por diseño; la de Gemini vive solo como secreto del servidor.

## Marco normativo de referencia
Decreto 780 de 2016 (Libro 2, Parte 5, Título 1 – SOGCS; Capítulo 4 PAMEC) · Pautas de Auditoría para el Mejoramiento de la Calidad (MinProtección 2007) · Circular Externa 012 de 2016 Supersalud (ST002) · Resolución 3100 de 2019 · Resolución 256 de 2016 · Res. 1995/1999 · Res. 1403/2007 · Res. 4816/2008 · Res. 2183/2004 · Decreto 1072/2015 y Res. 0312/2019 · Ley 1581/2012 · Res. 4343/2012 · Ley 1755/2015.

> El catálogo es una base de trabajo. Verifique siempre la vigencia de cada norma y los requerimientos particulares con la Secretaría de Salud Departamental de San Andrés.
