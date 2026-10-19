// Le baril des modèles d'e-mail, tous sur la coquille commune (`disposition.ts`).
//
// Les extensions .js sont absentes exprès : esbuild — le bundler de Convex — les
// résout littéralement, là où TypeScript les remappe vers .ts.
export * from './disposition';
export * from './compte';
export * from './invitation';
export * from './briefing';
export * from './abonnement';
export * from './conseils';
export * from './diagnostic';
