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
  3. Sélection en tourniquet : un article par source et par tour, du plus récent au plus ancien, avec au plus 4 articles par source.
- **Articles vus** : un article affiché dans un fil n'est jamais reproposé. Le bouton « Plus tard » permet de le garder.
- **Notes** : les 👍 / 👎 et leur raison sont conservés dans la table `feedback`. Ils alimenteront la recommandation locale de la phase 2.
- **Données** : base SQLite dans `~/.config/DevFlux/devflux.sqlite`.

## Architecture

| Dossier | Contenu |
|---|---|
| `src/shared/contract.ts` | Types et canaux IPC partagés |
| `src/main/` | Processus principal : base, collecte, fil du jour, extraction d'article, démarrage automatique, IPC |
| `src/preload/` | Pont `window.devflux` |
| `src/renderer/` | Interface React (Tailwind) ; le contenu des articles est assaini avec DOMPurify |
| `src/main/database/seedSources.json` | Sources de départ, insérées au premier lancement |
