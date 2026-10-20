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

## Fonctionnement

- **Au lancement** : le fil du jour n'est construit qu'une fois par jour. Les lancements suivants du même jour réaffichent le même fil sans nouvelle collecte.
- **Préparation** :
  1. Purge des articles de plus de 14 jours, sauf les favoris, les « plus tard » et les articles notés.
  2. Collecte des sources actives.
  3. Analyse : calcul des embeddings des nouveaux articles et des sujets (voir **Recommandation locale**).
  4. Sélection des 20 articles, avec au plus 4 articles par source.
- **Articles vus** : un article affiché dans un fil n'est jamais reproposé. Le bouton « Plus tard » permet de le garder.
- **Notes** : les 👍 / 👎 et leur raison sont conservés dans la table `feedback` et pris en compte dès le fil du lendemain.
- **Premier lancement** : choix des sujets suivis, modifiables ensuite dans **Mon profil** (Suivi / Neutre / Masqué).
- **Raccourcis clavier** (listes d'articles, hors champ de saisie) : `j` / `k` article suivant / précédent, `l` 👍, `d` 👎 (ouvre le choix de la raison).
- **Thème** : Système (par défaut), Clair ou Sombre, dans **Réglages**.
- **Données** : base SQLite dans `~/.config/DevFlux/devflux.sqlite`.

## Recommandation locale

- **Modèle** : `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, multilingue (français et anglais comparés dans le même espace), épinglé sur la révision `2c4055b12046f11709e9df2c122e59ffbdc2f900` (q8, environ 130 Mo), téléchargé une seule fois dans `~/.config/DevFlux/models`. Il tourne dans un processus séparé (`utilityProcess`), lancé seulement pendant l'analyse puis arrêté : pic mesuré d'environ 550 Mo pendant quelques secondes.
- **Signaux** : 👍 et sujets suivis attirent ; 👎 « hors sujet », « trop basique » ou sans raison et sujets masqués repoussent ; « déjà vu » est neutre ; « mauvaise source » pénalise uniquement la source.
- **Sujets masqués** : un article dont le sujet le plus proche est masqué (similarité d'au moins 0,35) est exclu du fil, dans les modes `similarity` et `trained`.
- **Priorité au français** : les articles détectés en français (mots outils du titre et du résumé) reçoivent un bonus de score de 0,05 dans les modes `similarity` et `trained`.
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
| `src/main/` | Processus principal : base, collecte, fil du jour, extraction d'article, démarrage automatique, IPC |
| `src/main/recommendation/` | Embeddings (worker), score, régression logistique, sélection |
| `src/main/profile/` | Catalogue des sujets et profil |
| `src/preload/` | Pont `window.devflux` |
| `src/renderer/` | Interface React (Tailwind) ; le contenu des articles est assaini avec DOMPurify |
| `src/main/database/seedSources.json` | Sources de départ, insérées au premier lancement |
