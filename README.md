# Plataforma inmobiliaria (CRM + landing multi-proyecto)

Plataforma inmobiliaria completa para venta de lotes: landing pública multi-proyecto orientada a conversión por WhatsApp, panel administrador, y CRM con pipeline de leads, roles de equipo, mapa interactivo de lotes y reportes.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (PostgreSQL + Auth + RLS) · Cloudinary · Mercado Pago · Resend · Framer Motion · React Hook Form · Zod.

> **Nota sobre versiones:** el enunciado pedía Next.js 15; este entorno ya trae Next.js 16 instalado (con la convención `proxy.ts` que reemplaza a `middleware.ts`), así que se usó la versión disponible en vez de forzar un downgrade. La API de App Router usada es la misma.

## Arquitectura

```
app/                          Rutas (App Router)
  page.tsx                    Portal: home con grid de todos los proyectos
  proyectos/page.tsx          Listado completo de proyectos
  proyectos/[slug]/page.tsx   Landing de un proyecto (hero, lotes, mapa, financiación, reserva...)
  admin/login/                Login del panel
  admin/(panel)/              Panel administrador + CRM (protegido por rol)
  api/                        Route handlers: reservas, contacto, visitas, Mercado Pago, export Excel
components/                   Componentes de la landing pública
components/admin/             Componentes del panel administrador / CRM
components/icons/             Iconos de marcas sociales (Lucide no incluye logos)
lib/                          Datos semilla, validaciones (Zod), integraciones (WhatsApp, email, MP, Cloudinary, rate limit)
lib/content.ts                Lectura de contenido público (Supabase con fallback a semilla), multi-proyecto
lib/admin/                    auth.ts (roles), actions.ts (server actions), activity.ts (auditoría), data.ts (lecturas admin)
lib/supabase/                 Clientes de Supabase (browser, server, admin/service-role) + config
supabase/schema.sql           Esquema completo de base de datos (tablas, RLS, datos semilla)
types/site.ts                 Tipos compartidos de todo el dominio
proxy.ts                      Protección de rutas /admin (convención "proxy" de Next 16, ex-middleware)
```

## Cómo funciona sin configurar nada

El sitio corre completo con `npm run dev` sin ninguna variable de entorno: todo el contenido (proyecto insignia, lotes, promoción, financiación, galería, testimonios, FAQs, textos) sale de `lib/data.ts` como "contenido semilla". Esto permite previsualizar y desarrollar sin depender de servicios externos. El panel admin es navegable en modo demo, pero las escrituras no persisten hasta configurar Supabase.

En cuanto configurás Supabase (ver abajo), toda la plataforma pasa a leer y escribir datos reales — multi-proyecto, con roles y RLS — y el contenido semilla queda solo como fallback (por si alguna tabla está vacía).

## Puesta en marcha

```bash
npm install
npm run dev
```

Abrí http://localhost:3000. El panel admin está en `/admin`.

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá lo que vayas a usar. Ninguna es obligatoria para desarrollar, pero cada una habilita una funcionalidad real:

| Variable | Habilita |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Base de datos, login del panel admin, CRM, guardado de leads/reservas |
| `SUPABASE_SERVICE_ROLE_KEY` | Escrituras del panel admin (bypassa RLS de forma segura, solo server-side) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Subida de fotos/videos desde el panel admin |
| `MERCADOPAGO_ACCESS_TOKEN` | Botón "Pagar seña con Mercado Pago" en la reserva online |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO` | Emails de notificación al recibir una reserva, consulta o visita |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL` | Mapa de ubicación embebido personalizado (si no se define, se genera uno a partir del texto de ubicación de cada proyecto) |
| `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Google Analytics 4, Google Tag Manager, Meta Pixel |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting distribuido en los endpoints públicos (si no están, se usa un límite en memoria por instancia) |
| `NEXT_PUBLIC_SITE_URL` | Dominio usado en metadata, sitemap y Open Graph |

## Configurar Supabase (base de datos, auth y roles)

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecutá el contenido de [`supabase/schema.sql`](./supabase/schema.sql). Esto crea todas las tablas, la función `mi_rol()`, el trigger que crea un perfil automático al registrarse, las políticas de RLS, y datos semilla (proyecto insignia con sus lotes, financiación, promoción, progreso, FAQs y testimonios).
3. En **Authentication > Users**, creá el primer usuario (email + contraseña) — es el login de `/admin`. El trigger le asigna rol `vendedor` por defecto; promoveelo a administrador corriendo en el SQL Editor:
   ```sql
   update perfiles set rol = 'administrador' where email = 'tu@email.com';
   ```
4. En **Settings > API**, copiá `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`, `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, y `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (esta última es secreta, nunca se expone al cliente).
5. Desde `/admin/usuarios` (solo administrador) invitá al resto del equipo y asignales rol de **administrador**, **supervisor** o **vendedor**.

### Roles y permisos

- **Administrador**: acceso total — proyectos, precios, financiación, contenido, usuarios, y puede eliminar leads/proyectos.
- **Supervisor**: gestiona proyectos, lotes, precios, contenido y CRM igual que un administrador, pero no gestiona usuarios ni puede eliminar registros críticos.
- **Vendedor**: solo ve y gestiona (estado, observaciones) los leads sin asignar o asignados a sí mismo, agenda/gestiona visitas; no accede a precios, contenido ni usuarios.

Esto está implementado en dos capas: `requireRole()` (server actions, `lib/admin/auth.ts`) y Row Level Security en Postgres (`supabase/schema.sql`), así que aunque alguien saltee la UI, la base de datos igual aplica el permiso.

### Backups

Este repo no reimplementa un sistema de backups propio: Supabase ya ofrece backups automáticos diarios y **Point-in-Time Recovery** en los planes pagos (Project Settings → Database → Backups). Activarlo ahí es la forma recomendada; no hay nada que configurar en el código.

## CRM y pipeline de leads

Toda consulta (formulario de contacto, reserva online o agenda de visita) crea automáticamente un lead en la tabla `leads`, con `tipo`, `proyecto`, `lote`, datos de contacto y `estado`. El pipeline (`/admin/crm`) es un tablero Kanban drag-and-drop con las columnas:

`Nuevo → Contactado → Visita Programada → Reservado → Vendido` (con `Descartado` como salida en cualquier punto).

Mover un lead a **Reservado** o **Vendido** sincroniza automáticamente el estado del lote asociado (`lotes.estado`); volver a **Descartado** libera el lote si estaba reservado por ese lead. Administradores y supervisores pueden asignar cada lead a un vendedor del equipo desde la misma tarjeta.

## Gestión de lotes y mapa interactivo

Cada lote es una unidad real de inventario (manzana + número), con estado `disponible` / `reservado` / `vendido` / `no_disponible`. Desde `/admin/lotes` se les puede asignar una posición porcentual (X, Y) sobre la imagen del masterplan; la landing de cada proyecto muestra automáticamente un plano interactivo (`components/MapaLotes.tsx`) con un pin de color por estado (verde/amarillo/rojo/gris), tooltip con precio y superficie, y un botón de WhatsApp para consultar ese lote puntual.

## Configurar Cloudinary (subida de imágenes/videos)

1. Creá una cuenta gratuita en [cloudinary.com](https://cloudinary.com).
2. En **Settings > Upload > Upload presets**, creá un preset nuevo con **Signing mode: Unsigned**.
3. Completá `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` y `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.

Sin esto configurado, la sección de galería del panel admin sigue funcionando pegando URLs de imágenes/videos ya alojados en cualquier lado.

## Configurar Mercado Pago (pago de seña)

1. Generá credenciales de producción en el [panel de desarrolladores de Mercado Pago](https://www.mercadopago.com.ar/developers).
2. Completá `MERCADOPAGO_ACCESS_TOKEN`.
3. `/api/mercadopago/crear-preferencia` genera una preferencia por el 10% del valor del lote (seña) y redirige al Checkout Pro. El porcentaje es la constante `SENA_PORCENTAJE` en ese archivo.

Sin este token, el botón de pago online muestra un aviso y el flujo de reserva sigue funcionando igual por WhatsApp.

## Rate limiting

`/api/reservas`, `/api/contacto`, `/api/visitas` y `/api/mercadopago/crear-preferencia` están protegidos por `lib/rate-limit.ts`: un límite por IP que usa Upstash Redis (distribuido, recomendado en producción/serverless) si está configurado, o un contador en memoria del proceso como fallback para desarrollo o despliegues de instancia única.

## Seguridad

- **CSRF**: los Server Actions de Next.js validan el header `Origin` contra el host de la petición automáticamente; no hay formularios que muevan datos vía GET.
- **XSS**: React escapa todo el contenido por defecto; el único `dangerouslySetInnerHTML` del proyecto es JSON-LD generado por el propio servidor a partir de datos internos (no de input de usuario).
- **RLS**: toda tabla sensible en Supabase tiene Row Level Security con políticas por rol (ver más arriba).
- **Rate limiting**: ver sección anterior.
- **Backups**: ver sección de Supabase.

## Chatbot con IA

El asistente virtual flotante usa un motor propio de coincidencia por palabras clave (`lib/chatbot.ts`), sin dependencias externas ni costo por uso. Para respuestas generadas por un modelo de lenguaje real, se puede reemplazar `responderChat()` por una llamada a la [API de Claude](https://docs.claude.com) (u otro proveedor) desde una API route, sin tocar el componente `ChatbotWidget`.

## Agenda de visitas y Google Calendar

El formulario "Coordiná tu visita" guarda la solicitud en la tabla `visitas`, notifica por email, y —si Google Calendar está configurado— crea automáticamente un evento en el calendario elegido, etiquetado **"VISITA ONLINE"** y en color **rojo**. Si el administrador marca la visita como "cancelada" desde `/admin/consultas`, el evento se borra del calendario automáticamente.

### Configurar Google Calendar

1. En [Google Cloud Console](https://console.cloud.google.com/), creá (o reutilizá) un proyecto y habilitá la **Google Calendar API**.
2. Andá a **IAM y administración > Cuentas de servicio** → "Crear cuenta de servicio". Una vez creada, generá una clave nueva en formato **JSON** y descargala.
3. Del JSON descargado, copiá `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`, y `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (pegalo tal cual, con los `\n` incluidos).
4. En [Google Calendar](https://calendar.google.com), abrí el calendario que querés sincronizar → **Configuración y uso compartido** → "Compartir con determinadas personas" → agregá el email de la cuenta de servicio (el `client_email`) con permiso **"Hacer cambios en los eventos"**.
5. Copiá el **ID del calendario** (en la misma pantalla de configuración, sección "Integrar calendario") → `GOOGLE_CALENDAR_ID`. Para el calendario principal de una cuenta de Gmail, el ID suele ser directamente esa dirección de Gmail.
6. Sin esto configurado, la agenda sigue funcionando igual (queda guardada en Supabase y se notifica por email); simplemente no se crea el evento en Calendar.

## Meta Ads y Google Ads

Soporte nativo para Meta Pixel y GA4/GTM (ver variables de entorno). Las páginas `/reserva/exito`, `/reserva/error` y `/reserva/pendiente` sirven como páginas de conversión para configurar eventos en Meta Ads Manager y Google Ads. Las URLs de proyecto (`/proyectos/[slug]`) son amigables y estables, aptas para pauta.

## SEO

Metadata dinámica por proyecto (`generateMetadata`), JSON-LD `RealEstateListing` por proyecto, Open Graph con imagen generada dinámicamente (`app/opengraph-image.tsx`), `sitemap.ts` que enumera todos los proyectos publicados desde Supabase, y `robots.ts` que bloquea `/admin` y `/api`.

## Despliegue en Vercel

1. Importá el repositorio en Vercel.
2. Cargá las variables de entorno de `.env.example` que vayas a usar en Project Settings → Environment Variables.
3. Vercel detecta Next.js automáticamente; no hace falta configuración adicional de build.

## Scripts

```bash
npm run dev      # desarrollo
npm run build    # build de producción
npm run start    # servir el build
npm run lint     # ESLint
```
