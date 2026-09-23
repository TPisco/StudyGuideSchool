# Rapport de couverture — IFT339 Structures de données

Notes de cours de **Marie-Flavie Auclair-Fortier**, d'après Aida Ouangraoua et
Jean Goulet. Langage du cours : **C++**.

Généré à partir des fichiers de `content/sources/IFT339/`, qui restent locaux
et ne sont jamais publiés.

---

## 1. Quels fichiers ont alimenté quels chapitres

| Fichier source | Pages | Chapitre(s) | Ce qui en a été tiré |
| --- | --- | --- | --- |
| `IFT339-1-Abstraction de données (3).pdf` | 32 | 1 | TDA et structure de données, contrat, caractéristiques, bijection, POO, types primitifs |
| `Exemple TAD entier (3).pdf` | 19 | 1 | Représentation binaire, entiers signés, complément à deux, TDA Entier et Chaine_bin |
| `AnnexeA exemples pour type SU.pdf` | 3 | 1 | Cité comme document source ; **exploité seulement en surface** (voir §3) |
| `IFT339-3-AbstractionC++.pdf` | 49 | 2 | Classe, héritage, classe abstraite, template, pointeurs, passage de paramètres, lvalue/rvalue, six opérations de base, surcharge, friend, static |
| `IFT339-4-AllocationAutomatiqueDynamique.pdf` | 19 | 3 | Blocs, durée de vie et portée, pile d'exécution, récursivité, new/delete, sémantique de déplacement |
| `récursion mystère.pdf` | 1 | 3 | Exercice de trace de pile pour `mystere(3)` |
| `IFT339-5-BibliothequeNormaliseeC++.pdf` | 7 | 4 | Quatre groupes de conteneurs, opérations communes, spécifications algébriques, itérateurs |
| `IFT339-6-Tableaux statiques.pdf` | 21 | 5 | Tableaux primitifs 1D et 2D, passage en paramètre, absence de bornes, quatre algorithmes de recherche, dichotomie, TDA Tableau, `array` |

**Total exploité : 151 pages sur 151 pages lisibles fournies.**

## 2. Fichiers non utilisés, et pourquoi

| Fichier | Pages | Raison |
| --- | --- | --- |
| `chaier/` — livre de Jean Goulet | **175** | **Écarté sur décision explicite.** Ce sont des photographies du manuel, lisibles mais coûteuses à traiter. Le choix retenu a été de s'en tenir aux diapositives du professeur, qui constituent le matériel examinable. Les thèmes 1 et 3 y renvoient (chap. 1 sections 1.1 à 1.4 et annexe A ; chap. 4 et 5, p. 28 à 55). |
| `Exercices TDA Heures.pdf` | 2 | **Scan sans OCR** — aucune couche de texte, et le rendu est une photographie de faible qualité. Contenu non déterminable de façon fiable. **Fidelity rule 4 : rien n'a été deviné.** |
| `Résumé-62-151120.pdf` | 2 | Lisible, mais c'est un résumé dense dont la structure ne recoupe aucun thème en particulier. Non exploité pour éviter d'introduire du contenu sans pouvoir le rattacher à une source de cours précise. |

## 3. Ce qui est produit

| Chapitre | Concepts | Tableaux | Quiz | Test | Cartes | Exercices |
| --- | --- | --- | --- | --- | --- | --- |
| 1 — Types abstraits et structures de données | 8 | 3 | 12 | 20 | 12 | 5 |
| 2 — Mécanisme d'abstraction en C++ | 8 | 3 | 12 | 20 | 13 | 5 |
| 3 — Gestion de la mémoire et allocation dynamique | 8 | 3 | 12 | 20 | 12 | 5 |
| 4 — La bibliothèque normalisée en C++ | 8 | 2 | 12 | 20 | 12 | 5 |
| 5 — Les tableaux statiques | 8 | 3 | 12 | 20 | 13 | 5 |
| **Total** | **40** | **14** | **60** | **100** | **62** | **25** |

Les 40 concepts génèrent **40 cartes mémoire supplémentaires** automatiquement,
soit **102 cartes** dans la file de révision.

### Modes d'exercices

Le C++ **ne s'exécute pas dans un navigateur**. Conformément à la règle « ne
jamais livrer un faux exécuteur », **aucun exercice de ce cours n'est en mode
`run`**. Les 25 exercices se répartissent ainsi :

| Mode | Nombre | Langage |
| --- | --- | --- |
| `trace` — dérouler une exécution | 7 | C++, pseudo-code |
| `find-bug` — trouver le défaut | 8 | C++, pseudo-code |
| `predict-output` — prédire la sortie | 6 | C++, texte |
| `fill-blank` — compléter | 4 | C++, pseudo-code |

Chacun porte une correction détaillée masquée et une auto-évaluation.

## 4. Lacune majeure — le thème 2 est absent

**Le document du thème 2 n'a pas été fourni.** Il porte sur la **notion de
complexité**, et deux chapitres en dépendent :

- le **thème 1** y renvoie explicitement : « Notion de complexité : Thème 2 »
  (diapositive 31), juste après avoir introduit les deux ressources — temps et
  mémoire ;
- le **thème 6** utilise $\mathcal{O}(1)$ et $\mathcal{O}(n)$ pour décrire
  `array` (diapositive 19) **sans que ces notations aient jamais été définies**
  dans les documents disponibles.

En conséquence :

- une étape `theme2-complexite` marquée **`external: true`** figure dans le
  parcours, en pointillés, entre le chapitre 1 et le chapitre 5 ;
- les questions et exercices générés **n'exigent jamais de calculer une
  complexité** ; ils se contentent de restituer les valeurs données par les
  notes pour `array`, en les attribuant explicitement à la diapositive 19 ;
- l'exercice `e5-02` compte des tests un par un plutôt que d'annoncer une
  classe asymptotique, et le signale.

**Ce qu'il faudrait :** les diapositives du thème 2, ou confirmation qu'elles
n'existent pas et que la notation 𝒪 vient d'un autre cours.

## 5. Autres prérequis externes

| Étape | Pourquoi elle est externe | Où l'apprendre |
| --- | --- | --- |
| `prereq-cpp` — Bases du C++ | Le thème 3 s'ouvre sur un « Rappel » supposant classes et syntaxe acquises. Les diapositives portent le bandeau **IFT159 — Analyse et programmation** (notes de Gabriel Girard). | IFT159, ou révision des classes et de la compilation séparée .h / .cpp |

## 6. Sujets trop minces — ce qu'il faudrait de plus

| Sujet | Problème | Ce qu'il faudrait |
| --- | --- | --- |
| **Complexité (thème 2)** | Entièrement absent, voir §4 | Les diapositives du thème 2 |
| **TDA SU et PU** (`AnnexeA`) | Le document renvoie à l'annexe A des notes de Jean Goulet, non fournie séparément. Les opérations y sont listées mais les formules mathématiques ressortent dégradées de l'extraction. Le sujet est cité, non enseigné. | L'annexe A du livre de Goulet, ou une version texte du document |
| **Exercices du cours** | Les énoncés numérotés (exercice 1 du thème 1, exercices 3.1 à 3.4 du thème 3, exercice pratique 1 du thème 6) sont mentionnés dans les diapositives mais leurs **corrigés** ne sont pas fournis. Les exercices générés ici sont dérivés du contenu des diapositives, pas des corrigés. | Les corrigés, s'ils existent |
| **Listes chaînées, piles, files, arbres** | Annoncés dans le « portrait hiérarchique » du thème 1 (diapositive 5) mais aucun thème fourni ne les traite. Le cours s'arrête aux tableaux statiques. | Les thèmes 7 et suivants, s'ils existent |
| **Tris** | Le thème 6 mentionne « plusieurs algorithmes, pas tous équivalents » sans en détailler aucun | Les diapositives sur les tris |
| **Examens antérieurs** | Aucun fourni | Les examens des sessions passées, pour caler le format de l'examen blanc |

## 7. Point à vérifier avec le professeur

Le code de recherche dichotomique de la **diapositive 16** déclare
`size_t deb {0}, fin{NB};` — donc des entiers **non signés** — et utilise
`fin = deb - 1;` pour forcer la sortie de boucle. Lorsque l'élément est trouvé
alors que `deb` vaut encore 0, `0 - 1` s'évalue en arithmétique non signée et
ne produit pas −1.

Le chapitre 5 signale ce point dans un encadré et l'exercice `e5-03` le fait
tracer sur deux cas, **sans affirmer que les notes sont fautives** : c'est
présenté comme une observation à confirmer au cours.

## 8. Format de l'examen blanc

`mirrorsPastExam: false`. **Aucun examen antérieur n'a été fourni.** Le format
par défaut (30 questions, 90 minutes) est une convention de la plateforme. Il
ne reproduit pas le format d'un examen réel et ne prédit rien de ce qui sera
évalué.

## 9. Vérifications automatiques passées

Exécuté par `npm run validate` :

- les 5 chapitres déclarés dans `course.json` ont bien leur `.mdx` et leur `.json` ;
- les 160 questions citent un `objectiveId` existant ; chacun des 26 objectifs
  est évalué au moins une fois ;
- chaque distracteur possède son explication ;
- chaque quiz mélange au moins 3 niveaux de Bloom, avec au plus 50 % de rappel ;
- chaque test mélange au moins 3 formats et contient au moins une question de
  difficulté 3 ;
- **aucune bonne réponse n'est plus de deux fois plus longue que tous ses
  distracteurs** — quatre questions ont dû être réécrites à ce titre ;
- aucun exercice `run` sur un langage non exécutable ;
- le graphe de prérequis du parcours est acyclique ;
- les 8 fichiers sources cités existent bien dans `content/sources/IFT339/`.
