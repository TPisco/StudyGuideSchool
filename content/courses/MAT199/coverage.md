# Rapport de couverture — MAT199 Algèbre linéaire appliquée en informatique

Notes de cours de **Myriam Chabot**, adaptées des notes du **Pr. Shiping
Liu** ; banque d'exercices de Jean-Philippe Morissette et Myriam Chabot.
Généré à partir des fichiers de `content/sources/MAT199/`, qui restent locaux
et ne sont jamais publiés.

---

## 1. Quels fichiers ont alimenté quels chapitres

| Fichier source | Pages | Chapitre(s) | Ce qui en a été tiré |
| --- | --- | --- | --- |
| `2026-03-MAT199-ChapI.pdf` | 32 | 1, 2 | Polynômes ; matrices, produit par colonnes, transposée, couleurs RVB (ch. 1) ; rang, inverses, puissances, LU (ch. 2) |
| `2026-03-MAT199-ChapII.pdf` | 13 | 3 | Déterminants : développement, raccourcis, opérations élémentaires, propriétés, inversibilité |
| `2026-03-MAT199-ChapIII.pdf` | 14 | 4 | Systèmes : écriture matricielle, systèmes échelonnés, Gauss, théorème du rang, homogènes |
| `2026-03-MAT199-ChapIV-partie1.pdf` | 30 | 5 | Espaces vectoriels : axiomes, combinaisons linéaires, familles libres, base, dimension, coordonnées, matrices de passage, début des sous-espaces |
| `2026-03_MAT199_ex.pdf` | 8 | 1, 2, 3 | Banque d'exercices : exercices 1.1, 1.2, 1.10, 2.3 repris dans les quiz et tests |
| `2026-03_MAT199_ed.pdf` | 1 | 2 | Exercices dirigés : séance 1, n° 7 et 8 (rang) |
| `2026-03_MAT199_ed1_sol.pdf` | 9 | 1, 2 | Solutions manuscrites de la séance 1 — **vérification croisée** (voir §4) |
| `2026-03_MAT199_ed3_sol.pdf` | 12 | 2, 3, 4 | Solutions manuscrites de la séance 3 — **vérification croisée** et décomposition LU alternative citée au ch. 3 |

**Total exploité : 119 pages sur 119.**

- `ChapIV-partie1.pdf` est une impression de notes **sans couche de texte** :
  les 30 pages ont été rendues en image et lues visuellement.
- Les deux solutions de séance sont **manuscrites** ; leur couche de texte
  (OCR) est inutilisable, mais les pages rendues en image sont parfaitement
  lisibles et ont toutes été lues.
- Plusieurs pages sont **volontairement blanches** (espace de prise de notes
  en classe) : ChapI p. 22 et 27, ChapII p. 8, ChapIII p. 7, 9 et 12,
  ChapIV p. 11, 18, 21, 27 et 29. Rien n'y manque.

## 2. Fichiers non utilisés

Aucun. Tous les documents fournis ont servi.

## 3. Ce qui est produit

| Chapitre | Concepts | Tableaux | Quiz | Test | Cartes | Exercices |
| --- | --- | --- | --- | --- | --- | --- |
| 1 — Polynômes et opérations matricielles | 9 | 3 | 12 | 21 | 12 | 5 |
| 2 — Rang, matrices inversibles et LU | 8 | 2 | 12 | 21 | 12 | 5 |
| 3 — Déterminants | 8 | 2 | 12 | 21 | 12 | 5 |
| 4 — Systèmes d'équations linéaires | 8 | 2 | 12 | 21 | 12 | 5 |
| 5 — Espaces vectoriels | 8 | 2 | 12 | 22 | 12 | 5 |
| **Total** | **41** | **11** | **60** | **106** | **60** | **25** |

Les 41 concepts génèrent **41 cartes supplémentaires**, soit **101 cartes**.

### Solutions des exercices

Les notes laissent **en blanc** la solution de chaque exercice. Toutes les
solutions de la plateforme ont été **calculées puis vérifiées par un calcul
symbolique indépendant** (sympy) : rangs, inverses, déterminants, systèmes,
décompositions LU, matrices de passage. Les notes le signalent dans
l'introduction de chaque chapitre. Aucune solution n'est présentée comme
venant de la professeure, sauf les deux cas où la solution officielle de
séance est explicitement citée (ch. 2, exercice e2-02 ; ch. 3, exercice
e3-04).

### Rendu mathématique

Pour ce cours, la plateforme a gagné un composant `MathText` : les formules
`$…$` des quiz, tests, cartes, exercices et tableaux sont désormais
typographiées par KaTeX, comme dans les notes. La comparaison des réponses
courtes accepte aussi `5/2`, `2,5` et `2.5` comme la même valeur, et le signe
moins typographique `−`.

### Modes d'exercices

Aucun exercice n'est en mode `run` (aucun code à exécuter). Répartition :
`trace` 11, `predict-output` 5, `find-bug` 5, `fill-blank` 4 — tous avec
correction détaillée et auto-évaluation.

## 4. Vérification croisée avec les solutions officielles

Les **27 exercices** résolus dans les solutions des séances 1 et 3 ont été
recalculés indépendamment. **Tous concordent** : 1.5 n° 1 (1) à (4), 5 (1),
7, 8, 10, 12 (1), 13 (1), 15 (1) ; séance 1 n° 7 et 8 ; 2.10 n° 1 (1) à (3),
3, 5 (1) à (3), 6 (1) et (2) ; 3.12 n° 1 (1) et (2), 3, 4 (2) et 5.

Deux différences de forme, sans conséquence :

- **2.10 n° 3** : la solution officielle commence par $\frac12 L_1$ et obtient
  une décomposition LU différente (diagonale de L : 2, 1, 1). Les deux sont
  justes — une LU n'est pas unique — et le chapitre 3 le signale.
- **1.5 n° 13 (1)** : la solution recopie la dernière ligne de la matrice
  comme $(7, 3, 10, 15)$ alors que les notes donnent $-15$. Le calcul qui suit
  utilise bien $-15$, et l'inverse obtenu est correct pour la matrice des
  notes (vérifié).

## 5. Écarts relevés dans les notes — à confirmer au cours

Chaque écart a été vérifié sur la page rendue en image, pas seulement sur
l'extraction de texte. Tous sont signalés dans le chapitre concerné.

1. **ChapI, définition 1.2.5** : la colonne $j$ de $B$ est écrite
   $(b_{1j}, \dots, b_{jn})^T$ ; le dernier terme est $b_{nj}$ (ch. 1).
2. **ChapI, p. 16, exemple du lemme 1.3.3** : l'inverse de $L_2 - 4L_1$ est
   noté « $L_2 + 4L_2$ » au lieu de $L_2 + 4L_1$ (ch. 2).
3. **ChapIII, p. 8, exemple du théorème 3.7** : les matrices augmentées
   portent $(0, -3, 6 \mid 1)$ et $(0, -6, 12 \mid 2)$ au lieu de
   $(0, -3, -6 \mid 1)$ et $(0, -6, -12 \mid 2)$ ; l'équation intermédiaire
   « $-6y - 12 = 2$ » a perdu son $z$. La conclusion est juste (ch. 4).
4. **ChapIII, p. 11** : l'exemple invoque le théorème 3.11(**2**) là où
   l'argument (moins d'équations que d'inconnues) est le point (**3**) (ch. 4).
5. **ChapIV, p. 16** : l'énoncé parle de $\{v_1, v_2, v_3\}$ puis nomme les
   vecteurs $u_1, u_2, u_3$ (ch. 5).

Coquilles mineures non signalées dans les chapitres, car sans effet sur le
sens : « proposition 6.1.3 » pour 1.1.3 (ChapI p. 3) ;
$(A_1\ A_1 \cdots A_n)$ pour $(A_1\ A_2 \cdots A_n)$ (proposition 1.2.11) ;
$j_{r-r}$ pour $j_{r-1}$ (remarque après 1.3.1) ; « cyant » (ChapIV p. 26).

## 6. Savoir extérieur aux documents

| Élément | Où | Comment il est signalé |
| --- | --- | --- |
| Calcul algébrique : fractions, radicaux | Parcours, avant le chapitre 1 | Étape `prereq-algebre`, **`external: true`** |

Les exemples ajoutés par la plateforme pour illustrer une remarque dont
l'exemple est laissé en blanc dans les notes (non-commutativité, produit nul
sans facteur nul) utilisent des matrices tirées des notes elles-mêmes, et le
chapitre 1 précise qu'ils ont été choisis par la plateforme.

## 7. Sujets trop minces — ce qui manquerait

- **La suite du chapitre IV.** Le document « partie 1 » s'arrête à la
  définition des sous-espaces vectoriels (section 4.3, p. 30). La partie 2
  n'a pas été fournie : le chapitre 5 est à compléter.
- **SciLab.** La séance 2 est une « Introduction à SciLab » et l'exercice
  1.5 n° 2 est marqué (SCILAB) ; aucun document SciLab n'a été fourni. Rien
  n'est enseigné sur l'outil.
- **Séance 2 et au-delà.** Seules les solutions des séances 1 et 3 sont
  disponibles.
- **Aucun examen antérieur.** L'exemple des notes mentionne une pondération
  tests 15 % / intra 35 % / final 50 %, mais aucun examen n'a été fourni : le
  format de l'examen blanc (30 questions, 90 minutes) est une convention de la
  plateforme.
- **Valeurs propres** : l'introduction du chapitre II annonce que le
  déterminant servira à calculer les valeurs propres ; ce chapitre n'est pas
  encore dans les documents.
