This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Despliegue en Render

Este proyecto está preparado para desplegarse en [Render](https://render.com/) como servicio web Node.

### Opción A: Usando render.yaml (Blueprint)

1. Asegúrate de que tu repo tenga `render.yaml` en la raíz (ya incluido).
2. En Render, crea un "Blueprint" con tu repositorio.
3. Render detectará el servicio web con:
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm run start`
   - Health Check Path: `/`
4. Configura las variables de entorno (valores de ejemplo):
   - `NEXT_PUBLIC_BACKEND_URL` → `https://<tu-backend>.onrender.com/api`
   - `NEXT_PUBLIC_WS_URL` → `wss://<tu-backend>.onrender.com`
   - `NEXTAUTH_SECRET` → usa un secreto seguro (Render puede generarlo).
   - (Opcional) `NEXTAUTH_URL` → `https://<tu-servicio>.onrender.com`

### Opción B: Servicio Web manual

1. Crea un "Web Service" nuevo apuntando a este repo.
2. Selecciona entorno `Node` y región.
3. Build Command: `npm ci && npm run build`
4. Start Command: `npm run start`
5. En "Environment", añade las variables de entorno indicadas en `.env.example`.

### Notas

- Este proyecto usa Next.js con `output: "standalone"` para optimizar el build en producción.
- Render asigna el `PORT` automáticamente; `next start` lo detecta sin cambios adicionales.
- Revisa `.env.example` para conocer las variables requeridas y establece valores reales en producción.
