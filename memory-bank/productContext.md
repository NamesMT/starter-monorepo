# Product Context: starter-monorepo

This document outlines the high-level description, goals, features, and overall architecture of the `starter-monorepo` project.

## 1. Project Description & Goal

### Initial description:

A monorepo project template designed to "kick-start your beautifully organized project, whether its a fullstack project, monorepo of multiple libraries, or even just one API server and its related infrastructure deployment and utilities separated into another package." (quote from [root README.md](../README.md)).  
The current demo code configuration is full-stack applications using modern technologies like Nuxt (frontend), Hono (backend), SST (deployment), and pnpm/Turborepo (monorepo management).
The template also includes setup for the Roo Code AI Agent to facilitate development.

### Target goal and description:

To be updated on user input what do you want to achieve with this template.

## 2. Overall Architecture

*   **Monorepo:** Utilizes `pnpm` workspaces (`apps/*`, `locals/*`) and `Turborepo` for task orchestration.
*   **Frontend/Backend Separation:** Clear separation between `apps/frontend` (Nuxt) and `apps/backend` (Hono).
*   **Infrastructure as Code (IaC):** Optionally uses `SST (Serverless Stack Toolkit) Ion` for AWS infrastructure deployment (backend as Lambda).
*   **Environment Management:** Uses `.env` files per application managed via `dotenvx` and SST.
*   **API Proxy:** Frontend development server proxies `/api/*` calls to the backend, mimicking a common production setup.

## 3. Key Components

### 3.1. Backend (`apps/backend`)

*   **Technology:** Node.js runtime with the Hono web framework.
*   **Deployment:** Designed for serverless deployment (AWS Lambda via SST).
*   **Core Features:** API routing, OpenAPI specification, Kinde authentication integration, ArkType runtime validation, Session Management.

### 3.2. Frontend (`apps/frontend`)

*   **Technology:** Nuxt (v4 compatible) with Vue 3.
*   **Build Mode:** Defaults to Static Site Generation (SSG), SSR-capable.
*   **Core Features:** Dual UI libraries (PrimeVue & Shadcn/vue), UnoCSS styling, Tanstack Query data fetching, type-safe RPC communication with backend, Kinde authentication integration, i18n support (via `@local/locales`), ColorMode, NuxtImage, Nuxt SEO, Nuxt LLMs.

### 3.3. Shared Code (`locals/`)

*   **`@local/common`:** Framework-agnostic utilities, types, dev assets.
*   **`@local/common-vue`:** Shared Vue components and utilities.
*   **`@local/locales`:** Internationalization management via CSV.
*   **`@local/tsconfig`:** Shared TypeScript configurations.
