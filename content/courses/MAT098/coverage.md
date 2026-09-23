# Rapport de couverture — MAT098 Compléments de calcul intégral

Diapositives et notes en ligne d'**Olivier Godin** (Université de
Sherbrooke). Généré à partir des fichiers de `content/sources/MAT098/`, qui
restent locaux et ne sont jamais publiés.

---

## 1. Quels fichiers ont alimenté quels chapitres

| Fichier source | Pages | Chapitre(s) | Ce qui en a été tiré |
| --- | --- | --- | --- |
| `1-rappels_calcul_differentiel.pdf` | 213 | 1 à 5 | Chapitre 1 du cours, *Rappels de calcul différentiel* : notions de base (p. 3 à 49), fonctions (p. 50 à 101), limites et continuité (p. 102 à 148), dérivation (p. 149 à 198), étude d'une fonction (p. 199 à 212) |
| `2-integrale_definie.pdf` | 42 | 6 à 8 | Chapitre 2 du cours, *Intégrale définie* : origines et notation sigma, approximation d'une aire (p. 3 à 23), somme de Riemann et intégrale définie (p. 24 à 35), primitives de base (p. 36 à 40) |
| `noteChapitre1.txt` | — | 1 à 5 | Notes en ligne du chapitre 1 : même contenu que les diapositives, plus les séries d'exercices de fin de section (1.1.7, 1.2.7, 1.3.7, 1.4.6), utilisées comme exercices supplémentaires |
| `noteChapitre2.txt` | — | 6 à 8 | Notes en ligne du chapitre 2 : numérotation des définitions, théorèmes et exercices (2.1 à 2.14) |

**Total exploité : 255 pages de PDF sur 255, et les deux fichiers de notes.**

- Les deux PDF ont une couche de texte exploitable ; les formules et les
  énoncés ambigus à l'extraction (exposants, radicaux, fractions) ont été
  **vérifiés sur la page rendue en image** — notamment les exercices 1.26,
  1.31, 1.33, 1.45, 1.46, 1.47, 1.62, 1.70, 1.1, 1.5 et 1.6.
- Les pages de titre de section et la dernière page de chaque PDF (plan) ne
  contiennent pas de matière. La table des matières du premier PDF se
  termine par une entrée « Bidon » (p. 213), qui n'est qu'un reste de mise
  en page.
- Les notes en ligne masquent les réponses (« Réponse. » sans contenu) :
  elles n'ont pas fourni de solutions.

## 2. Fichiers ou parties non utilisés

| Élément | Raison |
| --- | --- |
| Exercices 1.41 et 1.48 (diapositives 116, 147 et 148), exercice 1 de la section 1.3.7 des notes | Ils demandent de **lire un graphique** ; les graphiques sont trop petits pour en tirer des valeurs sûres, et les notes en texte ne les contiennent pas. Non repris plutôt que deviné. |
| Exercices 8 à 10 de la section 1.3.7 des notes | Leur mise en forme dans le texte des notes est ambiguë (fonctions par parties et radicaux sans délimitation claire) et aucune version image n'est disponible. |
| Livres de Stewart et d'Amyotte cités en référence (diapositive 42) | Non fournis ; les diapositives en reprennent des figures et s'inspirent de leurs exercices. |

## 3. Ce qui est produit

| Chapitre | Concepts | Tableaux | Quiz | Test | Cartes | Exercices |
| --- | --- | --- | --- | --- | --- | --- |
| 1 — Notions de base | 9 | 2 | 12 | 21 | 12 | 5 |
| 2 — Les fonctions | 9 | 2 | 12 | 21 | 12 | 5 |
| 3 — Limites et continuité | 8 | 2 | 12 | 21 | 12 | 5 |
| 4 — Dérivation et applications | 8 | 2 | 12 | 21 | 12 | 5 |
| 5 — Étude d'une fonction | 6 | 2 | 12 | 21 | 12 | 5 |
| 6 — Notation sigma et approximation d'une aire | 7 | 2 | 12 | 21 | 12 | 5 |
| 7 — Somme de Riemann et intégrale définie | 8 | 2 | 12 | 21 | 12 | 5 |
| 8 — Primitives de base | 6 | 2 | 12 | 21 | 12 | 5 |
| **Total** | **61** | **16** | **96** | **168** | **96** | **40** |

Les 61 concepts génèrent **61 cartes supplémentaires**, soit **157 cartes**.

### Découpage

Le découpage approuvé (8 chapitres, les cinq sections de *rappels* traitées
en profondeur) est respecté : les chapitres 1 à 5 suivent les cinq sections
du premier PDF, les chapitres 6 à 8 les sections du second.

### Numérotation des exercices du chapitre 2 du cours

Les diapositives de *Intégrale définie* numérotent leurs exercices
« Exercice 1.1 » à « 1.6 », comme au chapitre précédent, alors que les notes
en ligne les numérotent **2.2, 2.3, 2.4, 2.9, 2.13 et 2.14**. La plateforme
utilise la numérotation des notes et rappelle celle des diapositives entre
parenthèses.

### Réponses des exercices

**Aucune réponse n'est publiée** dans les documents fournis (les notes
masquent les leurs). Toutes les réponses de la plateforme — équations,
inéquations, divisions de polynômes, limites, dérivées, études de fonctions,
sommes, intégrales et primitives — ont été **calculées puis vérifiées par un
calcul symbolique indépendant** (sympy), et chaque question le signale par
« réponse de la plateforme ». Les primitives ont en plus été vérifiées en
les dérivant. Aucune réponse n'est présentée comme venant du professeur.

### Modes d'exercices

Aucun exercice n'est en mode `run`. Répartition : `trace` 21, `find-bug` 8,
`fill-blank` 6, `predict-output` 5 — tous avec correction détaillée et
auto-évaluation.

## 4. Écarts relevés dans les documents — à confirmer au cours

Chacun a été vérifié sur la page rendue en image et est signalé dans le
chapitre concerné. Aucun n'a été propagé dans les questions.

1. **Diapositive 44, exemple 1.19** : « $\frac{-3x}{-3} \ge \frac{7}{-3} \implies \ \ge -\frac73$ » — le $x$
   manque avant le dernier $\ge$ (ch. 1).
2. **Diapositive 55** : une fonction est dite négative là où son graphique est
   « au-dessus » de l'axe des $x$ ; il faut lire **au-dessous** (ch. 2).
3. **Diapositive 87, théorème 1.34** : les bases $x$ et $y$ sont prises dans
   $\mathbb{R} \setminus \{1\}$ sans exiger qu'elles soient positives ; et la
   propriété 7 est écrite $x^{\log_b u} = u$ au lieu de $x^{\log_x u} = u$
   (ch. 2).
4. **Diapositive 97** : pour la fonction cosinus, « $\sin x$ est l'abscisse
   du point $P(x)$ » — c'est $\cos x$ (ch. 2).
5. **Diapositive 201** : « trois types d'asymptotes » annoncés, deux décrits ;
   les notes disent « deux types » (ch. 5).
6. **Chapitre 2 du cours** : exercices numérotés 1.1 à 1.6 sur les
   diapositives, 2.x dans les notes (voir §3).

Coquilles mineures non signalées dans les chapitres, sans effet sur le sens :
« $a_x x^n$ » pour $a_n x^n$ (diapositive 133) ; « la dérivée en $g = a$ »
pour « en $x = a$ » (diapositive 182) ; « $(d, g(d))$ » avec l'étiquette
« $f(d)$ » (diapositive 207) ; « Le domaine et l'image et la fonction »
(diapositive 78) ; parenthèse en trop dans le point 3 du théorème 1.38.
Les diapositives 14 et 78 écrivent $\mathbb{R}_+$ pour le domaine de
$\sqrt{x}$ alors que $\mathbb{Z}_+$ exclut 0 dans le même cours ; le
chapitre 2 précise que $0$ appartient au domaine.

## 5. Savoir extérieur aux documents

Aucune étape du parcours n'est marquée `external`. Les ajouts de la
plateforme sont des applications directes des règles des diapositives,
signalés comme tels :

- les exemples numériques qui ne viennent pas d'un exercice (par exemple
  l'asymptote horizontale de $\frac{2x + 1}{x - 4}$, $\int_0^3 x^2\,dx$ par
  une somme de Riemann, $\int_0^\pi \sin x\,dx$) ;
- l'image de $\tan x$ dans le tableau des fonctions usuelles du chapitre 2
  (légende du tableau) ;
- l'explication de la condition $\max \Delta x_k \to 0$ (ch. 7) et la
  notation $[F(x)]_a^b$ pour abréger $F(b) - F(a)$ (ch. 8), signalées comme
  n'apparaissant pas dans les diapositives.

## 6. Sujets trop minces — ce qui manquerait

- **La suite du cours.** La diapositive 37 annonce qu'« au chapitre
  suivant », on s'attardera à des **techniques d'intégration plus
  avancées** : ce chapitre n'a pas été fourni. En particulier, la table des
  primitives ne couvre pas $\frac1x$ ($n = -1$ exclu).
- **Le troisième type d'asymptote** annoncé à la diapositive 201 n'est décrit
  nulle part.
- **Aucun plan de cours ni examen antérieur** : pondération, dates et forme
  des évaluations sont inconnues. Le format de l'examen blanc (30 questions,
  90 minutes) est une convention de la plateforme.
- **Primitives et intégrales** : le chapitre 2 du cours ne propose que
  deux exercices (2.13 et 2.14) sur les primitives ; le chapitre 8 de la
  plateforme est donc le plus mince, et s'appuie sur des exemples de la
  plateforme construits avec la table des diapositives.
