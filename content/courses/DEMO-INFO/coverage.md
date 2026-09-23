# Rapport de couverture — DEMO-INFO

> **⚠️ Cours de démonstration — contenu synthétique.**
>
> Ce cours n'est dérivé d'**aucun document réel**. Il a été écrit à la main pour
> valider la plateforme de bout en bout : chaque type d'artefact (notes, diagrammes
> Mermaid, SVG, tableaux, quiz, test, cartes mémoire, exercices exécutables et
> exercices de raisonnement) y est représenté au moins une fois.
>
> Les noms de fichiers cités ci-dessous (`demo-diapos-cours01.pdf`, etc.) sont des
> **espaces réservés**. Ils n'existent pas dans `content/sources/DEMO-INFO/` et
> n'ont jamais existé. Aucun contenu n'est attribué à un professeur.
>
> Pour un vrai cours, ce fichier est généré par `/add-course` et décrit les
> véritables documents.

## 1. Quels fichiers ont alimenté quels chapitres

| Fichier source (fictif) | Chapitres | Ce qui en a été tiré |
| --- | --- | --- |
| `demo-diapos-cours01.pdf` | 1 | Définitions de O/Ω/Θ, tableau des classes, distinction pire cas / cas moyen |
| `demo-notes-complexite.pdf` | 1 | Modèle de coût, règles de simplification, récurrences |
| `demo-tp01-enonce.pdf` | 1 | Exercices 1 à 5 |
| `demo-diapos-cours02.pdf` | 2 | Schémas mémoire, opérations de pile, pile d'appels |
| `demo-notes-structures.pdf` | 2 | Coûts comparés tableau / liste, coût amorti, localité mémoire |
| `demo-tp02-enonce.pdf` | 2 | Exercices 1 à 5 |
| `demo-diapos-cours03.pdf` | 3 | Vocabulaire relationnel, clés, ordre d'évaluation d'une requête |
| `demo-notes-sql.pdf` | 3 | Jointures, agrégation, NULL, intégrité référentielle |
| `demo-tp03-enonce.pdf` | 3 | Exercices 1 à 5 |

## 2. Fichiers non exploités

Aucun — le corpus est fictif et intégralement « utilisé ».

Dans un vrai cours, cette section liste les fichiers écartés **avec la raison** :
PDF scanné sans OCR, diapositives illisibles, document hors sujet, doublon d'un
autre fichier, etc.

## 3. Ce qui est produit

| Chapitre | Concepts | Tableaux | Quiz | Test | Cartes | Exercices |
| --- | --- | --- | --- | --- | --- | --- |
| 1 — Complexité algorithmique | 8 | 2 | 12 | 20 | 12 | 5 |
| 2 — Structures linéaires | 8 | 2 | 12 | 20 | 12 | 5 |
| 3 — Modèle relationnel et SQL | 8 | 3 | 12 | 20 | 13 | 5 |
| **Total** | **24** | **7** | **36** | **60** | **37** | **15** |

Les cartes mémoire listées ci-dessus sont celles écrites explicitement. L'application
en génère **24 de plus automatiquement** à partir des concepts (`makeFlashcard: true`),
soit **61 cartes** dans la file de révision.

Répartition des exercices par mode d'exécution :

| Mode | Langage | Nombre | Exécutable dans le navigateur |
| --- | --- | --- | --- |
| `run` | Python (Pyodide) | 4 | oui |
| `run` | SQL (sql.js) | 3 | oui |
| `run` | JavaScript (Web Worker) | 1 | oui |
| `predict-output` | C | 1 | non — raisonnement + auto-évaluation |
| `find-bug` | Java, SQL | 3 | non — raisonnement + auto-évaluation |
| `trace` | C, pseudo-code | 2 | non — raisonnement + auto-évaluation |
| `fill-blank` | Python | 1 | non — raisonnement + auto-évaluation |

## 4. Prérequis externes (fidelity rule 2)

Deux étapes du parcours **ne sont couvertes par aucun document** et sont marquées
`external: true`. Elles apparaissent en pointillés dans le graphe du parcours et
portent un avertissement explicite dans l'interface.

| Étape | Pourquoi elle est externe | Où l'apprendre |
| --- | --- | --- |
| `prereq-python` — Bases de la programmation impérative | Le cours suppose Python acquis et ne l'enseigne pas | Cours d'introduction à Python, 4 premiers chapitres |
| `prereq-maths` — Logarithmes, puissances, sommes finies | Utilisés dès le chapitre 1 sans être démontrés | Rappel de mathématiques discrètes |

Aucune autre connaissance extérieure n'a été introduite dans le contenu généré.

## 5. Sujets trop minces — ce qu'il faudrait de plus

Ces manques sont normaux : le corpus est un squelette de démonstration.

| Sujet | Problème | Ce qu'il faudrait |
| --- | --- | --- |
| Tri (fusion, rapide, insertion) | Cités en exemple dans les chapitres 1 et 2, jamais enseignés | Un chapitre dédié, ou les diapositives du cours sur les tris |
| Files (FIFO) | La pile est traitée, la file seulement mentionnée en contraste | Diapositives ou notes sur les files et les files de priorité |
| Listes doublement chaînées | Évoquées dans un distracteur du test 2 | Section dédiée, si le cours les couvre |
| Normalisation (1NF, 2NF, 3NF) | Absente : le chapitre 3 s'arrête au schéma et aux requêtes | Notes de cours sur la normalisation |
| Sous-requêtes et `EXISTS` | Absentes du chapitre 3 | Section SQL avancé |
| Transactions, ACID | Absentes | Un chapitre séparé si le cours les aborde |
| Examens antérieurs | Aucun fourni | Les examens des sessions passées, pour caler le format de l'examen blanc |

## 6. Format de l'examen blanc

`mirrorsPastExam: false`. Aucun examen antérieur n'a été fourni, donc le format de
l'examen blanc (30 questions, 90 minutes) est **une convention de la plateforme**,
pas celui d'un vrai examen. Rien dans ce cours ne prétend prédire ce qui sera
évalué.

## 7. Vérifications automatiques passées

Exécuté par `npm run validate` :

- chaque chapitre déclaré dans `course.json` possède bien son `.mdx` et son `.json` ;
- chaque `objectiveId` cité par une question, une carte, un concept ou un exercice
  correspond à un objectif réellement déclaré ;
- chaque objectif est évalué par au moins une question ;
- chaque distracteur possède son explication ;
- chaque quiz mélange au moins 3 niveaux de Bloom, avec au plus 50 % de rappel ;
- chaque test mélange au moins 3 formats de question et contient au moins une
  question de difficulté 3 ;
- le graphe de prérequis du parcours est acyclique ;
- aucun identifiant n'est dupliqué à l'intérieur d'un cours.
