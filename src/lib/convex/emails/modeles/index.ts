// Le baril des modeles d'e-mail.
//
// Les extensions .js sont retirees : elles pointaient vers des fichiers .js qui
// n'existent pas, et esbuild — le bundler de Convex — les resout litteralement
// la ou TypeScript les remappe silencieusement vers .ts. Le deploiement echouait
// donc sur un import que le typage declarait valide.

export * from './verification';
export * from './verificationCode';
export * from './passwordReset';
export * from './adminReplyNotification';
export * from './newTicketAdminNotification';
export * from './newUserSignupNotification';
