// Auth/account server helpers now live in the stable leaf `@/lib/auth` (so the
// route reorg can move pages without breaking the ~many importers of these). This
// file re-exports them for existing import paths; importers migrate to `@/lib/auth`
// when this page directory moves.
export * from '@/lib/auth';
