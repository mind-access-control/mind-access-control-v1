# Deploy de Next.js en Netlify usando Supabase Remoto

## 1. Pre-requisitos

- Cuenta en [Netlify](https://app.netlify.com/) y [Supabase](https://app.supabase.com/).
- Proyecto Next.js en un repositorio Git (GitHub, GitLab o Bitbucket).
- Acceso a las variables de entorno de tu proyecto Supabase.

---
## 2. Despliega en Netlify

### a. Conecta tu repositorio

1. Ve a [Netlify](https://app.netlify.com/) y haz clic en **Add new projecy > Import an existing project**.
2. Elige tu proveedor de Git y autoriza a Netlify.
3. Selecciona el repositorio de tu proyecto.
4. Dejar los valores por defecto o cambiar si es necesario.

### b. Agrega la extension de supabase

1. Ve a Extensiones, busca y agrega Supabase.

### c. Configura las variables de entorno en Netlify

1. En la configuración del sitio, busca la sección **Environment variables**.
2. Agrega:
    - `NEXT_PUBLIC_SUPABASE_URL` con el valor de tu Supabase remoto.
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY` con el valor de tu Supabase remoto.

### d. Configura el comando de build y el directorio de salida

1. Busca la seccion **Continuous deployment** en *Build Settings*

- **Build command:**
    - `npm run build` o `next build`
- **Publish directory:**
    - `.next` (para SSR) o `out` (si usas `next export` para SSG)

### e. Despliega

Busca la seccion **Deploys** ahi se puede hacer ciertas configuraciones, y tan bien muestra el historial de deploys.

---

## 5. Verifica tu Aplicación

- Accede a la URL que te da Netlify.
- Prueba funcionalidades que usen Supabase (login, registro, etc.).

---

## 6. (Opcional) Dominios personalizados y HTTPS

En Netlify puedes agregar tu propio dominio y Netlify gestionará el certificado SSL automáticamente.

---

## 7. Notas de Seguridad

- **Nunca** pongas claves privadas (`SERVICE_ROLE_KEY`) en el frontend ni en Netlify.
- Usa solo la `ANON_KEY` para el frontend.

---