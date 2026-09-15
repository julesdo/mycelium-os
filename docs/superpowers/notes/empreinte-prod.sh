#!/usr/bin/env bash
# Relève les fichiers servis par la production en suivant les imports sur trois niveaux,
# puis compte un témoin présent avant et après la tranche 2, et les empreintes propres à la tranche 2.
set -u
RACINE="https://www.letikette.com"
DOSSIER="$1"
mkdir -p "$DOSSIER"
curl -s --compressed --max-time 30 "$RACINE/" -o "$DOSSIER/accueil.html"
grep -aoE '/assets/[A-Za-z0-9._-]+\.(js|css)' "$DOSSIER/accueil.html" | sort -u > "$DOSSIER/a-lire.txt"
: > "$DOSSIER/lus.txt"
for tour in 1 2 3; do
	comm -23 "$DOSSIER/a-lire.txt" "$DOSSIER/lus.txt" > "$DOSSIER/nouveaux.txt"
	[ -s "$DOSSIER/nouveaux.txt" ] || break
	while read -r actif; do
		fichier="$DOSSIER/$(basename "$actif")"
		curl -s --compressed --max-time 30 "$RACINE$actif" -o "$fichier"
		echo "$actif" >> "$DOSSIER/lus.txt"
		grep -aoE '(/assets/|assets/|\./)[A-Za-z0-9._-]+\.(js|css)' "$fichier" | sed -E 's#^(\./|assets/)#/assets/#' >> "$DOSSIER/a-lire.txt"
	done < "$DOSSIER/nouveaux.txt"
	sort -u -o "$DOSSIER/a-lire.txt" "$DOSSIER/a-lire.txt"
	sort -u -o "$DOSSIER/lus.txt" "$DOSSIER/lus.txt"
done
compter() { cat "$DOSSIER"/*.js "$DOSSIER"/*.css 2>/dev/null | grep -ao -- "$1" | wc -l; }
echo "fichiers lus : $(wc -l < "$DOSSIER/lus.txt"), octets : $(cat "$DOSSIER"/*.js "$DOSSIER"/*.css 2>/dev/null | wc -c)"
echo "témoin « Importer mes factures » : $(compter 'Importer mes factures')"
echo "empreinte « Lecture de la fiche » : $(compter 'Lecture de la fiche')"
echo "empreinte « Chargement de l » : $(compter 'Chargement de l')"
echo "classe .animate-pouls : $(compter '\.animate-pouls')"
