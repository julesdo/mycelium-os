// Le baril des modeles d'e-mail.
//
// Les extensions .js sont retirees : elles pointaient vers des fichiers .js qui
// n'existent pas, et esbuild — le bundler de Convex — les resout litteralement
// la ou TypeScript les remappe silencieusement vers .ts. Le deploiement echouait
// donc sur un import que le typage declarait valide.

// Les e-mails produit, ecrits a la main, en francais, sur une coquille
// commune. Ils ne suivent pas la forme des six modeles historiques, qui sont
// des artefacts generes depuis Svelte : voir l'en-tete de `disposition.ts`.
export * from './disposition';
export * from './bilanPret';
export * from './produitsAConfirmer';
export * from './rappelDeclaration';

export * from './verification';
export * from './verificationCode';
export * from './passwordReset';
export * from './adminReplyNotification';
export * from './newTicketAdminNotification';
export * from './newUserSignupNotification';
export * from './invitation';
