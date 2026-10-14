# AST Codemods & Migration Playbook

## Common Migration Blueprints

### Next.js Pages Router $\rightarrow$ App Router
- Replace `pages/index.tsx` with `app/page.tsx` (Server Component by default).
- Replace `getServerSideProps` with direct `async/await` fetch in Server Components.
- Replace `useRouter` from `next/router` with `useRouter`, `usePathname`, `useSearchParams` from `next/navigation`.

### JavaScript $\rightarrow$ Strict TypeScript
- Step 1: Add `allowJs: true` and `checkJs: true` in `tsconfig.json`.
- Step 2: Auto-rename `.js` to `.ts` / `.tsx`.
- Step 3: Run `tsc --noEmit` and resolve inferred `any` types with explicit Zod schemas or interfaces.
