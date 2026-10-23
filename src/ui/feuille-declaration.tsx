/**
 * CE QUE LE GÉRANT A DIT DE « QUI A FAIT L'ACTE », en déclarant une démarche engagée.
 *
 * La feuille « Je l'ai engagée » vivait ici ; la déclaration se fait désormais dans
 * la conversation du dossier (`screens/dossier-guide/fil-procedure.tsx`, 23/10/2026),
 * avec les mêmes règles : la date est celle du FAIT, et un silence n'est pas un
 * « moi-même ».
 *
 * `null` : rien dit. `{ ids: [] }` : moi-même. Sinon, les professionnels nommés.
 */
export type ChoixDeclare = { readonly ids: readonly string[] } | null;
