# Rapport de couverture — MAT115 Logique et mathématiques discrètes

Diapositives de **Youness Mir** (Département de mathématiques, Université de
Sherbrooke). Généré à partir des fichiers de `content/sources/MAT115/`, qui
restent locaux et ne sont jamais publiés.

---

## 1. Quels fichiers ont alimenté quels chapitres

| Fichier source | Pages | Chapitre(s) | Ce qui en a été tiré |
| --- | --- | --- | --- |
| `Semaine 1.pdf` | 43 | 1, 2 | Plan de cours (diapositives 2 à 7) ; logique propositionnelle : propositions, connecteurs, tables de vérité, priorité (ch. 1) ; logique du premier ordre, quantificateurs, Tarski UdeS (ch. 2) |
| `Semaine 2.pdf` | 36 | 2, 3 | Fin de la logique du premier ordre : variables liées et libres, formules fermées (ch. 2) ; tautologies, lois LP-1 à LP-55, séquents, déduction naturelle (ch. 3) |
| `Semaine 3.pdf` | 19 | 3, 4 | Exercices de déduction naturelle (diapositive 2, ch. 3) ; valuations, modèles, cohérence, conséquence logique (ch. 4) |
| `Semaine 4.pdf` | 22 | 5 | FNC, FND, transformation d'une formule en forme normale |

**Total exploité : 120 pages sur 120.**

- Une grande partie des diapositives de la semaine 2 (24 sur 36 : 10 à 13,
  15 à 18, 20 à 22, 24 à 36) et quelques-unes de la semaine 1 (28, 36, 42,
  43) et de la semaine 3 (2) sont des **images sans couche de texte** : elles
  ont été rendues en image et lues visuellement, une à une.
- Les pages de titre (diapositive 1 de chaque document) ne contiennent pas de
  matière.

## 2. Fichiers non utilisés

| Fichier | Raison |
| --- | --- |
| `Devoirs/Devoir 1/Devoir 1.docx` et `Devoir 1.json` | **Devoir noté** (4 %, à rendre le 18 septembre, en équipe), à faire dans Tarski UdeS. La plateforme **ne le résout pas**. Le chapitre 2 entraîne la même compétence — traduire un énoncé en formule avec les prédicats de Tarski — sur les exemples des diapositives. |
| `tarski/` (`tarski-udes-1.0.2-all.jar` et lanceurs) | Logiciel, pas un document de cours. Le chapitre 2 décrit sa syntaxe telle que la présentent les diapositives. |
| `panda/` | Logiciel de déduction naturelle, pas un document de cours. Le chapitre 3 renvoie à Panda pour confirmer les noms de règles (voir §4, point 3). |
| `Guide 2026.docx` | Copie **identique** (même empreinte) du `Guide VM 2026.docx` d'IFT209, déjà traité avec ce cours. Il ne concerne pas MAT115. |
| `Devoirs-20260904.zip`, `Devoirs-20260909.zip`, `panda.zip`, `tarski.zip` | Archives des dossiers ci-dessus. |

## 3. Ce qui est produit

| Chapitre | Concepts | Tableaux | Quiz | Test | Cartes | Exercices |
| --- | --- | --- | --- | --- | --- | --- |
| 1 — Logique propositionnelle | 8 | 3 | 12 | 21 | 12 | 5 |
| 2 — Logique du premier ordre | 9 | 2 | 12 | 21 | 12 | 5 |
| 3 — Lois de la logique et déduction naturelle | 8 | 4 | 12 | 21 | 12 | 5 |
| 4 — Sémantique | 6 | 2 | 12 | 21 | 12 | 5 |
| 5 — Formes normales | 7 | 2 | 12 | 21 | 12 | 5 |
| **Total** | **38** | **13** | **60** | **105** | **60** | **25** |

Les 38 concepts génèrent **38 cartes supplémentaires**, soit **98 cartes**.

### Découpage : 5 chapitres au lieu de 4

Le découpage approuvé prévoyait 4 chapitres. La semaine 4 (formes normales)
introduit une notion et une méthode distinctes de la sémantique ; elle forme
un chapitre à part, pour garder des chapitres de taille comparable.

### Vérification des réponses

Les diapositives ne donnent **pas de solutions** aux exercices numérotés
(déduction naturelle 4, 5, 8 et 10). Toutes les preuves et tous les calculs
de la plateforme ont été rédigés par elle, et le chapitre le dit. Chaque
affirmation logique — tautologie, équivalence, valeur sous une valuation,
modèle, cohérence, conséquence logique, appartenance à la FNC ou à la FND —
a été **vérifiée mécaniquement** par un évaluateur de tables de vérité qui
applique la priorité du cours (¬ > ∧ > ∨, ⊕ > ⇒, ⇐ > ⇔), avant d'être
écrite dans une question. Les 55 lois LP-1 à LP-55 ont toutes été vérifiées
comme tautologies.

### Modes d'exercices

Aucun exercice n'est en mode `run`. Répartition : `trace` 11, `find-bug` 5,
`fill-blank` 5, `predict-output` 4 — tous avec correction détaillée et
auto-évaluation.

## 4. Écarts relevés dans les diapositives — à confirmer au cours

Chacun est signalé dans le chapitre concerné. Aucun n'a été propagé dans les
questions.

1. **Semaine 1, diapositive 18** : l'exemple de l'équivalence pose « A : Nous
   sommes jeudi », puis traduit A ⇔ B par « Nous sommes vendredi si et
   seulement si… » (ch. 1).
2. **Semaine 1, diapositive 4 (plan de cours)** : « Troisième devoir » figure
   **deux fois** (16 octobre et 16 novembre), suivi d'un « Quatrième
   devoir », alors que l'évaluation compte **5 devoirs** : les deux derniers
   sont sans doute les quatrième et cinquième. Les dates sont données « à
   titre indicatif ».
3. **Semaine 2, diapositives 30 et 34** : les indices 1 et 2 des règles
   $[E_{\wedge}]$ et $[I_{\vee}]$ sont inversés entre la présentation des
   règles et le tableau de synthèse. Le chapitre 3 suit la diapositive 34 —
   à confirmer au cours et dans Panda.
4. **Semaine 3, diapositive 6** : la valuation choisie pour montrer que
   $X_1 \wedge \neg X_2 \vee X_3 \Rightarrow X_4$ n'est pas valide en est en
   fait un **modèle** (l'hypothèse est fausse). La conclusion reste juste ;
   le chapitre 4 donne une valuation qui convient.
5. **Semaine 3, diapositives 16 et 17** : la même question reçoit deux
   réponses (« lignes 4 et 8 », puis « lignes 4, 6 et 8 ») ; la bonne est
   4, 6 et 8. Dans la réponse (c), « les formules X₁ et X₂ » désigne les
   formules (1) et (2) (ch. 4).
6. **Semaine 4, diapositives 12 à 17** : dans la partie FND, les
   explications des exemples 3 et 4 sont celles de la FNC, et les
   diapositives 15 à 17 écrivent « (FNC) » dans la définition de la FND ; la
   17 annonce « ne sont pas en FNC ». Les verdicts sont justes (ch. 5).
7. **Semaine 4, diapositives 20 et 22** : LP-18 est mal appliquée à la
   deuxième ligne, $(\neg X_1 \vee \neg\neg X_3) \vee X_3$ au lieu de
   $(\neg X_1 \wedge \neg\neg X_3) \vee X_3$ ; la ligne suivante est juste.
   Les diapositives 21 et 22 renvoient aux « diapo 26 » et « diapo 27 », qui
   sont les diapositives 19 et 20 de ce document (ch. 5).

## 5. Savoir extérieur aux documents

Aucune étape du parcours n'est marquée `external`. Les seuls ajouts de la
plateforme sont signalés comme tels dans les chapitres :

- les preuves des exercices de déduction naturelle 4, 5, 8 et 10 (ch. 3),
  construites uniquement avec les règles des diapositives ;
- la simplification de $(X_3 \vee \neg X_1) \wedge (X_3 \vee X_3)$ en $X_3$
  (ch. 5), obtenue avec les lois LP-6 et LP-13 du cours ;
- la FND simplifiée de $X_1 \Leftrightarrow X_2$ (ch. 5, exercice e5-05),
  obtenue avec LP-4, LP-11 et LP-19.

## 6. Sujets trop minces — ce qui manquerait

- **La suite du cours.** Le plan de cours (Semaine 1, diapositive 7) annonce
  quatre parties : logique ; **ensembles, relations et fonctions** ; **types
  de preuves** ; **automates**. Les documents fournis s'arrêtent aux formes
  normales, dans la première partie. Les trois autres restent à ajouter.
- **Le manuel obligatoire** — Marc Frappier, *Logique et mathématiques
  discrètes — Notes de cours* (2021) — n'a pas été fourni. Les diapositives
  y renvoient sans le reproduire ; les chapitres n'en tirent rien.
- **Aucune solution officielle** pour les exercices de déduction naturelle,
  et aucun corrigé de devoir.
- **Aucun examen antérieur.** Le plan de cours annonce deux examens de 180
  minutes (intra et final, 40 % chacun), tout le matériel autorisé, mais ne
  décrit pas leur forme. Le format de l'examen blanc (30 questions, 90
  minutes) est une convention de la plateforme et ne prédit rien.
