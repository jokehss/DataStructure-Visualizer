# Repository Guidelines

## Project Structure & Module Organization

This repository is a Vite React/TypeScript app for visualizing data structures. Application code lives in `src/`. The main entry points are `src/main.tsx` and `src/App.tsx`. UI is split under `src/components/` by feature area, including `Canvas/`, `CodeViewer/`, `ControlPanel/`, and `Layout/`. Animation and data-structure state generators live in `src/core/`; shared constants live in `src/constants/`; reusable hooks live in `src/hooks/`; common TypeScript types live in `src/types/`. Static assets belong in `public/`. Build output is generated in `dist/` and should not be edited directly.

## Build, Test, and Development Commands

Use `npm install` to install dependencies from `package-lock.json`.

Use `npm run dev` to start the Vite development server.

Use `npm run build` to run TypeScript checks with `tsc -b` and create a production build.

Use `npm run preview` to serve the production build locally after `npm run build`.

No automated test script is currently defined in `package.json`.

## Coding Style & Naming Conventions

Write TypeScript and React components with strict compiler settings enabled. Prefer functional components and hooks. Component files use `PascalCase.tsx`, such as `MemoryCanvas.tsx`; hooks use `useName.ts`; generator modules in `src/core/` use descriptive camelCase names such as `linkedListGen.ts`. Imports may use the `@/*` alias for files under `src/`.

Keep code formatted consistently with the existing style: two-space indentation, semicolons, single-quoted strings, and explicit exported types where helpful. Tailwind utility classes are available through `src/index.css` and `tailwind.config.js`.

## Testing Guidelines

There is no test framework configured yet. When adding tests, colocate them near the code they cover or place them under a future `src/__tests__/` directory. Use names like `linkedListGen.test.ts` or `MemoryCanvas.test.tsx`. At minimum, run `npm run build` before submitting changes.

## Commit & Pull Request Guidelines

This working directory does not currently expose Git history, so no local commit-message convention can be inferred. Use concise, imperative commit subjects such as `Add stack animation controls` or `Fix queue pointer layout`.

Pull requests should include a short description, affected modules, verification steps such as `npm run build`, and screenshots or screen recordings for visible UI changes. Link related issues when available.

## Agent-Specific Instructions

Before editing, check for existing generated files and avoid overwriting user work. Keep changes scoped to `src/`, config files, or documentation unless the task explicitly requires broader updates.
