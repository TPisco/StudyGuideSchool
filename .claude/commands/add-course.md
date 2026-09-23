---
description: Ingest a course from content/sources/<CODE>/ and generate all its study material
argument-hint: <CODE-DU-COURS>
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# /add-course $1

Générer tout le matériel d'étude du cours `$1` à partir de **mes** documents,
en respectant sans exception les règles de fidélité de `CLAUDE.md`.

Le contenu généré est en **français** (la langue des documents sources) ; tu me
parles en anglais.

---

## Étape 1 — Inventaire et lecture

1. Lister **tous** les fichiers de `content/sources/$1/` :

   ```bash
   ls -R content/sources/$1/
   ```

   Si le dossier n'existe pas ou est vide : **arrête-toi** et dis-le-moi. Ne
   génère rien.

2. **Trouver le plan de cours en premier** (`plan-de-cours`, `syllabus`,
   `plan_cours`, `outline`…). C'est lui qui définit la structure réelle du
   cours : découpage en séances, pondération, objectifs officiels. Si aucun
   plan de cours n'existe, signale-le — tu déduiras la structure des autres
   documents, mais dis-moi que c'est une déduction.

3. **Lire chaque fichier.** PDF, diapositives, notes, énoncés de TP, examens
   antérieurs.

4. **Signaler immédiatement** tout fichier problématique, sans deviner son
   contenu :
   - PDF scanné sans couche de texte (pas d'OCR) ;
   - fichier illisible, corrompu ou dans un format non pris en charge ;
   - document ambigu (notes manuscrites peu lisibles, diapositives sans texte).

   Fidelity rule 4 : **ne jamais inventer** le contenu d'un document
   inexploitable. Liste-les et demande-moi une version lisible.

## Étape 2 — Proposer le découpage — PUIS S'ARRÊTER

Proposer :

- le **découpage en chapitres**, qui doit suivre la structure du professeur
  (pas une structure réinventée) ;
- pour chaque chapitre : titre, objectifs d'apprentissage pressentis, durée
  estimée ;
- une **carte des sources** : quel fichier (et quelles pages) alimente quel
  chapitre ;
- la liste des fichiers **non exploitables** et pourquoi ;
- les **prérequis externes** détectés — notions utilisées par le cours mais
  jamais enseignées par mes documents.

> **ARRÊT OBLIGATOIRE.** Ne génère aucun contenu avant mon approbation
> explicite du découpage. Si je demande des modifications, reprends à cette
> étape.

## Étape 3 — Générer chaque chapitre approuvé

Pour chaque chapitre, produire **deux fichiers** :

### `content/courses/$1/chapters/<nn>-<slug>.mdx`

Frontmatter conforme à `chapterFrontmatterSchema`, puis les notes d'étude :

- prose claire et structurée en `##` / `###` ;
- **math via KaTeX** (`$…$` en ligne, `$$…$$` en bloc) ;
- **code** dans des blocs à langage explicite (coloration Shiki automatique) ;
- **diagrammes** : `<Mermaid chart={\`…\`} caption="…" />` pour les flowcharts,
  séquences, états, ER, classes ; `<Figure caption="…">` + SVG écrit à la main
  quand Mermaid ne suffit pas (disposition mémoire, courbes, schémas fins).
  **Un diagramme doit expliquer un mécanisme**, jamais décorer ;
- **encadrés** : `<Callout type="note|warning|misconception|example|tip" title="…">` ;
- **citations** : `<Source file="…" page={12} locator="…" />` à chaque
  affirmation non triviale.

Composants disponibles sans import (fournis par la page) : `Callout`,
`Source`, `Figure`, `Mermaid`.

### `content/courses/$1/chapters/<nn>-<slug>.json`

Conforme à `chapterDataSchema` :

- `concepts[]` — terme, définition, **pourquoi c'est important**, **erreur
  classique réelle**, et `source: { file, page }` obligatoire ;
- `tables[]` — comparaisons, tableaux de complexité, références de syntaxe ;
- `quiz` — **10 à 15** questions, vérification rapide ;
- `test` — **20 à 30** questions, plus difficile, formats variés, couvrant tout
  le chapitre ;
- `flashcards[]` — les cartes explicites (les concepts en génèrent
  automatiquement en plus) ;
- `exercises[]` — voir ci-dessous.

### Règles de qualité des questions — non négociables

- **Mélanger les niveaux de Bloom** dans chaque quiz et chaque test :
  `recall`, `understand`, `apply`, `analyze`. Jamais 100 % de restitution ;
  le schéma **refuse le build** au-delà de 50 % de `recall` ou en dessous de
  3 niveaux distincts.
- **Chaque distracteur est une vraie erreur d'étudiant** : une étape fausse
  dans une dérivation, une définition confondue, un décalage d'indice, un
  réflexe trompeur. Jamais du remplissage.
- **Interdits** : « toutes ces réponses », « aucune de ces réponses » en
  distracteur ; bonne réponse nettement plus longue que les autres. Le schéma
  refuse les deux.
- **Chaque question** porte une `explanation` (pourquoi la bonne réponse est
  bonne) **et** un `perDistractorExplanation` **par distracteur**.
- **Chaque question** porte son `objectiveId`. C'est obligatoire : c'est ce qui
  alimente la détection des sujets faibles.
- **Ne jamais inventer une question d'examen attribuée à mon professeur.**
  **Ne jamais écrire qu'une notion « tombera à l'examen ».**

### Règles des exercices

Choisir le `mode` selon ce que le navigateur sait exécuter :

| Langage | Mode | Exécution |
| --- | --- | --- |
| Python | `run` | Pyodide — tests réels |
| JavaScript / TypeScript | `run` | Web Worker isolé — tests réels |
| SQL | `run` | sql.js — tests réels |
| C, C++, Java | `predict-output`, `find-bug`, `trace`, `fill-blank` | raisonnement + auto-évaluation |

**Ne jamais livrer un faux exécuteur.** Pour un langage non exécutable, le mode
`run` est refusé par le schéma.

Pour `mode: "run"` :

- `tests[]` non vide ; `call` est **une expression** (Python/JS) évaluée après
  le code de l'étudiant, `expected` la valeur attendue sous forme de chaîne ;
- **SQL** : `setupSql` crée le schéma et les données ; la requête de l'étudiant
  est matérialisée dans une table `resultat`, et chaque `call` interroge
  **`resultat`** (utiliser `ORDER BY rowid` quand l'ordre compte).

Pour les autres modes : `expectedOutput` est obligatoire — c'est la correction
détaillée contre laquelle je m'auto-évalue.

Tous les exercices : `hints[]` **progressifs** (le premier oriente, le dernier
donne presque la réponse), `solution`, et de préférence `solutionExplanation`
qui explique le piège.

## Étape 4 — Générer le parcours

Dans `content/courses/$1/course.json`, la section `roadmap` :

- une étape par chapitre, dans l'ordre pédagogique, avec `prerequisites` ;
- des **points de contrôle** (`checkpoint: true`) après les chapitres clés ;
- **fidelity rule 2** : toute notion nécessaire mais **absente de mes
  documents** devient une étape `external: true` avec un `externalNote` qui dit
  où l'apprendre. Elle s'affiche en pointillés dans l'interface et figure dans
  `coverage.md`. **Ne jamais mélanger silencieusement du savoir extérieur au
  contenu généré.**

Le graphe de prérequis doit être **acyclique** (vérifié par le schéma).

## Étape 5 — Valider et construire

```bash
npm run validate
npm run build
```

`npm run validate` vérifie ce que les schémas seuls ne peuvent pas voir :
chapitres déclarés mais manquants, `objectiveId` orphelins, objectifs jamais
évalués, identifiants dupliqués, fichiers sources cités mais introuvables.

**Corriger jusqu'à ce que les deux commandes passent.** Ne me dis pas que
c'est terminé avant.

## Étape 6 — Rapport de couverture

Écrire `content/courses/$1/coverage.md` :

1. quel fichier a alimenté quel chapitre ;
2. quels fichiers n'ont **pas** pu être utilisés, **et pourquoi** ;
3. ce qui est produit (compteurs par chapitre) ;
4. les prérequis **externes** et où les apprendre ;
5. les sujets **trop minces** et ce qu'il me faudrait fournir pour les étoffer ;
6. le format de l'examen blanc : s'il est calqué sur un examen antérieur réel
   (`mirrorsPastExam: true`) ou si c'est une convention de la plateforme.

Puis me rendre compte en anglais : chapitres créés, nombre de questions, de
cartes et d'exercices, lacunes identifiées, et ce dont tu as besoin de ma part.

---

## Rappels permanents

- `content/sources/` est **gitignoré**. Ces fichiers ne sont jamais committés
  ni déployés. Seul le matériel généré est publié.
- Tout concept, formule ou exemple vient de **mes** documents et porte sa
  source.
- Conserver **la terminologie, la notation et les symboles exacts** du
  professeur. Ne jamais traduire un terme technique.
- En cas de doute sur ce que dit un document : **me demander**, ne pas deviner.
