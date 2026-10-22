# DevFlux

Veille technologique quotidienne sur le développement web et logiciel, pour Linux.

DevFlux se lance au démarrage du PC, récupère les flux RSS de ses sources, compose le **fil du jour** (20 articles publiés il y a 14 jours au plus) et permet de les lire dans l'application et de les noter 👍 / 👎. Une fois la fenêtre fermée, le processus s'arrête.

## Prérequis

- Node 22.23.2 (`nvm use`, voir `.nvmrc`)

## Commandes

| Commande | Rôle |
|---|---|
| `npm install` | Installe les dépendances |
| `npm run dev` | Lance l'application en mode développement |
| `npm test` | Lance les tests (vitest) |
| `npm run test:model` | Lance le test d'intégration du moteur d'embeddings avec le vrai modèle (téléchargé au premier lancement dans `${XDG_CACHE_HOME:-~/.cache}/devflux-test-models`, ou dans `DEVFLUX_TEST_MODEL_CACHE` si défini) |
| `npm run typecheck` | Vérifie les types |
| `npm run lint` | Lance ESLint |
| `npm run dist` | Construit l'AppImage dans `../build` |

Depuis un terminal intégré à VS Code, la variable `ELECTRON_RUN_AS_NODE=1` peut être héritée et empêche Electron de démarrer : lancer avec `env -u ELECTRON_RUN_AS_NODE npm run dev`.

## Installation

1. `npm run dist`
2. Lancer `../build/DevFlux-0.1.0.AppImage` une première fois : le démarrage automatique (`~/.config/autostart/devflux.desktop`) est activé par défaut et se désactive dans **Réglages**.
3. À chaque lancement, DevFlux installe son icône (`~/.local/share/icons/hicolor/512x512/apps/devflux.png`) et son lanceur (`~/.local/share/applications/devflux.desktop`), pointant vers l'AppImage lancée : l'application apparaît dans le menu et le dock avec son logo. Si le démarrage automatique est activé, seule sa ligne `Icon=` est mise à jour. Ces deux fichiers sont à supprimer à la main si l'AppImage est retirée.

## Fonctionnement

- **Au lancement** : le fil du jour n'est construit qu'une fois par jour. Les lancements suivants du même jour réaffichent le même fil sans nouvelle collecte.
- **Actualiser les articles** : le bouton du fil du jour relance la collecte et remplace le fil par des articles jamais affichés, choisis avec les 👍 / 👎 donnés jusque-là. Les articles remplacés restent dans favoris, plus tard et la recherche. Si aucun nouvel article n'est disponible, le fil courant est conservé.
- **Préparation** :
  1. Purge des articles de plus de 14 jours, sauf les favoris, les « plus tard » et les articles notés.
  2. Collecte des sources actives : seuls les articles détectés en français sont enregistrés, après vérification de leur page (voir **Langue**).
  3. Analyse : calcul des embeddings des nouveaux articles et des sujets (voir **Recommandation locale**).
  4. Sélection des 20 articles, avec au plus 4 articles par source.
- **Notification** : quand une préparation avec collecte aboutit alors que la fenêtre n'a pas le focus, une notification système « Votre fil du jour est prêt » indique le nombre d'articles sélectionnés et, à part, le nombre de nouveaux articles collectés ; un clic ramène la fenêtre.
- **Pourquoi cet article ?** : chaque carte du fil explique sa sélection (mode de recommandation, y compris `cold-start` et `unavailable` pour le tourniquet, sujet du catalogue le plus proche si la similarité atteint 0,35, signal dominant du score). Le signal dominant est la plus forte contribution au score : poids × valeur standardisée en mode `trained`, termes pondérés du score en mode `similarity`.
- **Temps de lecture** : estimé à 230 mots par minute à partir du contenu complet du flux (`content:encoded` en RSS, `content` en Atom), sinon du résumé ; affiché seulement à partir de 150 mots. L'ouverture de l'article dans le lecteur remplace l'estimation par le nombre de mots du contenu extrait, s'il atteint lui aussi 150 mots.
- **Articles lus** : ouvrir un article le marque comme lu ; sa carte est alors atténuée dans les listes et retrouve son plein contraste au survol ou au focus clavier.
- **Recherche** : vue **Recherche**, plein texte (SQLite FTS5) sur le titre, le résumé et le nom de la source de tous les articles conservés, insensible à la casse et aux accents ; chaque mot est cherché comme préfixe et tous doivent être présents ; 50 résultats au plus, triés par pertinence puis du plus récent au plus ancien.
- **Export des favoris** : bouton « Exporter en Markdown » de la vue **Favoris** (liste de liens avec source, date et résumé).
- **Articles vus** : un article affiché dans un fil n'est jamais reproposé. Le bouton « Plus tard » permet de le garder.
- **Notes** : les 👍 / 👎 et leur raison sont conservés dans la table `feedback` et pris en compte dès le fil du lendemain ou la prochaine actualisation.
- **Premier lancement** : choix des sujets suivis, modifiables ensuite dans **Mon profil** (Suivi / Neutre / Masqué).
- **Raccourcis clavier** (listes d'articles, hors champ de saisie) : `j` / `k` article suivant / précédent, `l` 👍, `d` 👎 (ouvre le choix de la raison).
- **Thème** : Système (par défaut), Clair ou Sombre, dans **Réglages**.
- **Données** : base SQLite dans `~/.config/DevFlux/devflux.sqlite`.

## Langue

- **Français uniquement** : un article n'est retenu que si son titre et son résumé contiennent au moins deux mots outils français, et plus de mots outils français que de mots outils anglais, espagnols, portugais, italiens ou allemands. Le filtre s'applique à la collecte et à la sélection du fil.
- **Vérification de la page** : à la collecte, chaque nouvel article qui passe ce filtre est téléchargé (4 pages à la fois par source) et le texte extrait de sa page doit lui aussi être détecté en français. Une page illisible (ex. HTTP 403) ou non française n'est pas enregistrée ; l'article est retenté à la collecte suivante tant qu'il reste dans le flux. Un article déjà enregistré dont le titre ou le résumé a changé dans le flux de sa source est mis à jour (sans nouveau téléchargement) et son embedding est recalculé.
- **Encodage** : flux et pages sont décodés selon le `charset` de l'en-tête HTTP, sinon la déclaration `encoding` du flux XML ou la balise `<meta>` de la page, sinon UTF-8 (ISO-8859-1 et ISO-8859-15 compris).
- **Sources de départ** : 20 flux français (dev, sécurité, IA). La migration 3 supprime les anciennes sources anglophones (leurs articles et leurs notes sont conservés) et ajoute les nouveaux flux français aux bases existantes. Une source anglophone ajoutée à la main n'apporte aucun article.

## Sources

- **Santé** : chaque source active affiche sa dernière collecte réussie et, si elle en a une, le nombre d'articles retenus sur les 7 derniers jours. Une source est signalée en erreur si sa dernière collecte a échoué, muette si elle n'a apporté aucun article depuis 7 jours (hors sources ajoutées depuis moins de 7 jours), en attente tant qu'elle n'a jamais été collectée avec succès.
- **OPML** : export de toutes les sources ; import d'un fichier de 5 Mo au plus, sans vérification réseau des flux. Les flux déjà présents ou en double dans le fichier sont ignorés, les adresses non http(s) écartées, et le compte rendu de l'import indique chacun de ces nombres ; une catégorie absente ou inconnue devient `general`.

## Recommandation locale

- **Modèle** : `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, multilingue (français et anglais comparés dans le même espace), épinglé sur la révision `2c4055b12046f11709e9df2c122e59ffbdc2f900` (q8, environ 130 Mo), téléchargé une seule fois dans `~/.config/DevFlux/models`. Il tourne dans un processus séparé (`utilityProcess`), lancé seulement pendant l'analyse puis arrêté : pic mesuré d'environ 550 Mo pendant quelques secondes.
- **Signaux** : 👍 et sujets suivis attirent ; 👎 « hors sujet », « trop basique », « promo / pub », « titre trompeur » ou sans raison repoussent le sujet et pénalisent la source ; les sujets masqués repoussent le sujet ; « pas intéressant » et « trop pointu » repoussent le sujet sans toucher à la source ; « article non-français » et « source pas intéressante » pénalisent uniquement la source ; « déjà vu » est neutre.
- **Sujets masqués** : un article dont le sujet le plus proche est masqué (similarité d'au moins 0,35) est exclu du fil, dans les modes `similarity` et `trained`.
- **Modes** :
  - `cold-start` (ni note ni sujet) : sélection en tourniquet, un article par source et par tour, du plus récent au plus ancien ;
  - `similarity` : ressemblance avec les centroïdes positif et négatif, affinité de la source et fraîcheur ;
  - `trained` (dès 20 notes de contenu, dont 5 de chaque sorte) : régression logistique réentraînée à chaque fil ;
  - `unavailable` : échec du modèle (erreur journalisée), repli sur le tourniquet.
- **Diversité** : 2 articles « Découverte » sur 20, quasi-doublons écartés.

## Architecture

| Dossier | Contenu |
|---|---|
| `src/shared/contract.ts` | Types et canaux IPC partagés |
| `src/main/` | Processus principal : base, collecte, fil du jour, extraction d'article, démarrage automatique, intégration bureau (icône et lanceur), IPC |
| `src/main/recommendation/` | Embeddings (worker), score, régression logistique, sélection |
| `src/main/profile/` | Catalogue des sujets et profil |
| `src/preload/` | Pont `window.devflux` |
| `src/renderer/` | Interface React (Tailwind) ; le contenu des articles est assaini avec DOMPurify |
| `src/main/database/seedSources.json` | Sources de départ, insérées au premier lancement ; les bases existantes reçoivent les nouveaux flux via la migration 3 |
| `src/main/database/migrations.ts` | Migration 4 : index plein texte `articles_fts` (FTS5, tenu à jour par triggers), dernière collecte réussie des sources, explication de la sélection et nombre de mots des articles |
| `src/main/sources/opml.ts`, `src/main/exports/` | Import et export OPML, export Markdown des favoris |
| `resources/icon.svg`, `resources/icon.png` | Logo (source SVG et PNG 512 px), icône de l'AppImage, de la fenêtre et du lanceur |
