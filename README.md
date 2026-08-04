# Ayres de Guernica – Etapa 2

Web comercial para el desarrollo inmobiliario Ayres de Guernica: landing de conversión (WhatsApp, reserva online, financiación) + panel de administración.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (DB + Auth) · Cloudinary · Mercado Pago · Framer Motion · React Hook Form · Zod.

## Cómo funciona sin configurar nada

El sitio anda completo con `npm run dev` sin ninguna variable de entorno: todo el contenido (lotes, promoción, financiación, galería, testimonios, textos) sale de `lib/data.ts` como "contenido semilla". Esto permite previsualizar y desarrollar sin depender de servicios externos.

En cuanto configurás Supabase (ver abajo), el sitio y el panel admin pasan a leer y escribir datos reales, y el contenido semilla queda solo como fallback (por si alguna tabla está vacía).

## Puesta en marcha

```bash
npm install
npm run dev
```

Abrí http://localhost:3000. El panel admin está en `/admin` (necesita Supabase configurado para poder loguearte y guardar cambios; en modo demo se puede navegar pero no persiste nada).

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá lo que vayas a usar. Ninguna es obligatoria para desarrollar, pero cada una habilita una funcionalidad real:

| Variable | Habilita |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Base de datos, login del panel admin, guardado de leads/reservas |
| `SUPABASE_SERVICE_ROLE_KEY` | Escrituras del panel admin (bypassa RLS de forma segura, solo server-side) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Subida de fotos/videos desde el panel admin |
| `MERCADOPAGO_ACCESS_TOKEN` | Botón "Pagar seña con Mercado Pago" en la reserva online |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO` | Emails de notificación al recibir una reserva, consulta o visita |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL` | Mapa embebido personalizado (si no se define, usa uno genérico de Guernica) |
| `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Google Analytics 4, Google Tag Manager, Meta Pixel |

## Configurar Supabase (base de datos + panel admin)

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecutá el contenido de [`supabase/schema.sql`](./supabase/schema.sql). Esto crea todas las tablas, políticas de RLS y algunos datos iniciales (promoción, financiación, textos).
3. En **Authentication > Users**, creá el usuario que va a administrar el sitio (email + contraseña). Ese es el login de `/admin`.
4. En **Settings > API**, copiá `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`, `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, y `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (esta última es secreta, nunca se expone al cliente).
5. Desde `/admin/lotes`, cargá los tres lotes iniciales (300, 600 y 900 m²) — o insertalos por SQL si preferís.

Las tablas y sus políticas están documentadas dentro del propio `schema.sql`. En resumen: el contenido (lotes, galería, testimonios, promoción, financiación, textos, novedades publicadas) tiene lectura pública y escritura solo para usuarios autenticados; los leads y visitas se pueden crear públicamente (formularios del sitio) pero solo se leen/editan/borran autenticado.

## Configurar Cloudinary (subida de imágenes/videos)

1. Creá una cuenta gratuita en [cloudinary.com](https://cloudinary.com).
2. En **Settings > Upload > Upload presets**, creá un preset nuevo con **Signing mode: Unsigned**.
3. Completá `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (nombre de tu cloud) y `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.

Sin esto configurado, la sección de galería del panel admin sigue funcionando pegando URLs de imágenes/videos ya alojados en cualquier lado.

## Configurar Mercado Pago (pago de seña)

1. Generá credenciales de producción en el [panel de desarrolladores de Mercado Pago](https://www.mercadopago.com.ar/developers).
2. Completá `MERCADOPAGO_ACCESS_TOKEN`.
3. El endpoint `/api/mercadopago/crear-preferencia` genera una preferencia de pago por el 10% del valor del lote (seña) y redirige al Checkout Pro de Mercado Pago. Ese porcentaje es una constante (`SENA_PORCENTAJE`) en `app/api/mercadopago/crear-preferencia/route.ts`, editable según la política comercial.

Sin este token, el botón de pago online muestra un aviso y el flujo de reserva sigue funcionando igual por WhatsApp.

## Chatbot con IA

El asistente virtual flotante usa un motor propio de coincidencia por palabras clave (`lib/chatbot.ts`), sin dependencias externas ni costo por uso, entrenado con las preguntas frecuentes y datos del proyecto. Si más adelante querés respuestas generadas por un modelo de lenguaje real, se puede reemplazar `responderChat()` por una llamada a la [API de Claude](https://docs.claude.com) (u otro proveedor) desde una API route, sin tocar el componente `ChatbotWidget`.

## Agenda de visitas y Google Calendar

El formulario "Coordiná tu visita" guarda la solicitud en la tabla `visitas` de Supabase y notifica por email. La sincronización automática con Google Calendar no está conectada (requiere OAuth de una cuenta de Google Workspace o una Service Account con un calendario compartido) — la forma más simple de conectarla sin escribir código adicional es un flujo de Zapier/Make que dispare un evento de Calendar cuando se inserta una fila nueva en `visitas` (webhook de base de datos de Supabase → Zapier → Google Calendar).

## Meta Ads y Google Ads

El sitio está listo para recibir tráfico de campañas: parámetros UTM se preservan por defecto (no se reescriben URLs), hay soporte nativo para Meta Pixel y GA4/GTM (ver variables de entorno), y las páginas `/reserva/exito`, `/reserva/error` y `/reserva/pendiente` sirven como páginas de conversión para configurar eventos de conversión en Meta Ads Manager y Google Ads.

## Estructura del proyecto

```
app/                    Rutas (App Router): landing, /admin, API routes
components/             Componentes de la landing pública
components/admin/       Componentes del panel de administración
lib/                    Datos semilla, esquemas de validación, integraciones
lib/content.ts          Lectura de contenido público (Supabase con fallback a semilla)
lib/admin/              Acciones de servidor y lecturas del panel admin
supabase/schema.sql      Esquema completo de base de datos
types/site.ts           Tipos compartidos del contenido del sitio
```

## Scripts

```bash
npm run dev      # desarrollo
npm run build    # build de producción
npm run start    # servir el build
npm run lint     # ESLint
```
