# Révisions — plateforme d'étude personnelle

Site statique privé qui transforme mes documents de cours en matériel d'étude
réellement utilisable : notes structurées, diagrammes, tableaux de synthèse,
quiz, tests, exercices de code exécutables, cartes mémoire à répétition
espacée, examens blancs et parcours d'apprentissage.

- **Mono-utilisateur.** Pas de connexion, pas de compte, pas de serveur.
- **Aucune IA à l'exécution.** Tout le contenu est généré à l'avance et
  committé en fichiers statiques.
- **Mes documents ne sortent jamais de ma machine** — voir
  [Confidentialité](#confidentialité).

---

## Démarrage

```bash
npm install
npm run dev
```

Le site est sur <http://localhost:4321>.

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement avec rechargement à chaud |
| `npm run validate` | contrôles de contenu seuls (rapide) |
| `npm run build` | `validate` + `astro check` + build statique dans `dist/` |
| `npm run preview` | sert le site construit |

`npm run build` échoue si le contenu viole une règle de fidélité ou de qualité
pédagogique — c'est voulu.

---

## Ajouter un cours

**Trois étapes.**

### 1. Déposer les documents

```
content/sources/<CODE-DU-COURS>/
    plan-de-cours.pdf        <- le plan de cours en premier : il définit la structure
    cours-01.pdf
    cours-02.pdf
    tp-01.pdf
    examen-2024.pdf          <- si j'en ai un : l'examen blanc calquera son format
```

Le code du cours est libre (`INF1120`, `ALGO-101`…) mais doit être **identique**
au nom du dossier dans `content/courses/` que la commande va créer.

### 2. Lancer la commande

```
/add-course <CODE-DU-COURS>
```

dans Claude Code. Le pipeline :

1. inventorie et lit **tous** les fichiers, en cherchant d'abord le plan de
   cours ;
2. **propose un découpage en chapitres et s'arrête** — rien n'est généré avant
   mon approbation ;
3. génère, pour chaque chapitre approuvé : notes MDX, diagrammes, tableaux,
   concepts, quiz, test, cartes mémoire et exercices, chacun avec sa source ;
4. génère le parcours, en marquant les prérequis non couverts comme
   `external` ;
5. valide contre les schémas Zod, lance le build, corrige les échecs ;
6. écrit `coverage.md` et me rend compte : ce qui a été créé, ce qui manque, et
   ce qu'il lui faudrait de ma part.

### 3. Vérifier

```bash
npm run build
```

Le cours apparaît sur la page d'accueil.

---

## Confidentialité

> Les documents de mes professeurs sont protégés par le droit d'auteur.
> **Ils restent locaux et ne sont ni committés ni déployés.**

- `content/sources/` est dans `.gitignore` (seuls `README.md` et `.gitkeep` y
  sont suivis).
- Seul le matériel **généré** — `content/courses/` — est committé et publié.
- Chaque affirmation du matériel généré cite son document d'origine
  (`fichier, p. 12`), pour que je puisse remonter à la source ; **le contenu du
  document lui-même n'est jamais reproduit en ligne.**

Vérifier avant un premier push :

```bash
git check-ignore -v content/sources/mon-cours/cours-01.pdf   # doit répondre
git status --short                                            # ne doit rien lister sous content/sources/
```

---

## Ce que fait le site

| Fonction | Détail |
| --- | --- |
| **Chapitres** | Typographie lisible, math KaTeX, code coloré (Shiki), citations de sources |
| **Visuels** | Diagrammes Mermaid (flowchart, séquence, état, ER, classes) et SVG écrits à la main pour ce que Mermaid ne sait pas dire |
| **Tableaux de synthèse** | Comparaisons, complexités, références de syntaxe — triables et imprimables |
| **Quiz / tests** | Correction immédiate, explication de chaque distracteur, reprise des seules erreurs, historique |
| **Progression** | Par chapitre (non commencé / en cours / maîtrisé), maîtrise par objectif, série, tableau de bord |
| **Sujets faibles** | Tout objectif sous 70 % est signalé, avec un lien direct vers la section concernée |
| **Cartes mémoire** | SM-2, file du jour, cartes issues des concepts + les miennes |
| **Exercices** | Python (Pyodide), JS/TS (Web Worker), SQL (sql.js) exécutés pour de vrai ; C/C++/Java en prédiction, recherche de bogue et trace |
| **Examens blancs** | Chronométrés, longueur configurable, multi-chapitres, **pondérés vers mes objectifs faibles**, aucun retour avant la remise |
| **Parcours** | Étapes ordonnées, prérequis, points de contrôle, progression superposée, « quoi étudier maintenant » |
| **Recherche** | Plein texte côté client sur tous les cours, insensible aux accents |

### Comment la maîtrise est calculée

Chaque question est rattachée à un objectif d'apprentissage. La maîtrise d'un
objectif est la proportion de bonnes réponses **pondérée par la récence** (une
réponse compte 12 % de moins que la suivante) : une notion ratée il y a six
semaines puis réussie quatre fois n'est plus un sujet faible. Un objectif passe
en « faible » sous **70 %**, à partir de **3 réponses** — jamais sur une preuve
trop mince.

Un chapitre passe « maîtrisé » à **85 %** au test du chapitre.

---

## Ma progression

Tout vit dans le `localStorage` du navigateur, sur **cet appareil**.

- **Sauvegarder** : page *Données* → `Télécharger la sauvegarde` (JSON complet).
- **Restaurer / transférer** : même page, mode **Fusionner** (réunit deux
  appareils, garde la version la plus avancée) ou **Remplacer**.
- Vider les données du site l'efface définitivement. **Exporter régulièrement.**

---

## Déploiement

### Vercel / Netlify

Build : `npm run build` · dossier publié : `dist`. Rien d'autre à configurer.

### GitHub Pages (site de projet)

Le site doit connaître son préfixe d'URL :

```bash
SITE_BASE=/nom-du-depot npm run build
```

Publier ensuite `dist/`. Exemple de workflow :

```yaml
name: Deploy
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: SITE_BASE=/${{ github.event.repository.name }} npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

> Le site est en `noindex` : c'est un outil personnel, pas une publication.

### Hors ligne

Lecture, quiz, tests, cartes et examens fonctionnent sans réseau une fois la
page chargée. **Seuls les exercices exécutables** téléchargent leur
environnement (Pyodide ≈ 10 Mo, sql.js) au premier lancement, depuis un CDN ;
ensuite le navigateur les met en cache. En cas d'échec, l'exercice l'annonce
clairement au lieu de faire semblant.

---

## Structure du dépôt

```
content/
  sources/<CODE>/              MES fichiers — gitignorés, jamais publiés
  courses/<CODE>/
    course.json                métadonnées, chapitres, parcours, format d'examen
    coverage.md                rapport de couverture
    chapters/<nn>-<slug>.mdx   notes d'étude (frontmatter + MDX)
    chapters/<nn>-<slug>.json  concepts, tableaux, quiz, test, cartes, exercices
src/
  lib/schemas.ts               modèle de contenu — la source de vérité
  lib/progress.ts              état localStorage, export/import
  lib/mastery.ts               maîtrise par objectif, sujets faibles, « et ensuite ? »
  lib/srs.ts                   répétition espacée SM-2
  lib/runners/                 Pyodide, Web Worker, sql.js (workers terminables)
  components/react/            îlots interactifs
  components/astro/            Callout, Source, Figure, Mermaid (utilisables en MDX)
  pages/                       routes
scripts/validate-content.mjs   contrôles inter-fichiers
```

### Pourquoi les schémas sont stricts

`src/lib/schemas.ts` refuse au build :

- une question sans objectif, sans explication, ou dont un distracteur n'est
  pas expliqué ;
- un quiz entièrement de restitution, ou qui n'utilise pas au moins 3 niveaux
  de Bloom ;
- une bonne réponse deux fois plus longue que tous ses distracteurs, ou un
  « toutes ces réponses » utilisé comme remplissage ;
- un concept sans source ;
- un exercice en `mode: "run"` pour un langage qu'un navigateur ne peut pas
  exécuter ;
- un parcours dont le graphe de prérequis contient un cycle ;
- une étape `external` sans indication de où l'apprendre.

`npm run validate` ajoute les contrôles qui demandent de voir plusieurs
fichiers à la fois : chapitre déclaré mais absent, `objectiveId` orphelin,
objectif jamais évalué, identifiant dupliqué, fichier source cité mais
introuvable.

---

## Cours de démonstration

`DEMO-INFO` est un cours **synthétique** livré pour prouver la chaîne complète
(3 chapitres, 96 questions, 61 cartes, 15 exercices couvrant Python, SQL, JS, C
et Java). Il ne provient d'aucun document réel, il est marqué comme tel dans
l'interface, et son `coverage.md` le dit explicitement. Il peut être supprimé
dès que de vrais cours sont ingérés :

```bash
rm -rf content/courses/DEMO-INFO && npm run build
```
