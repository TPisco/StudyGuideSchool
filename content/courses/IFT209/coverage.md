# Rapport de couverture — IFT209 Programmation système

Architecture des ordinateurs et assembleur **ARMv8**. Généré à partir des
fichiers de `content/sources/IFT209/`, qui restent locaux et ne sont jamais
publiés.

---

## 1. Quels fichiers ont alimenté quels chapitres

| Fichier source | Pages | Chapitre(s) | Ce qui en a été tiré |
| --- | --- | --- | --- |
| `Chapitre 1.pdf` | 32 | 1 | Systèmes de numération, les six cas de conversion, groupement et éclatement, capacité Max(B, n) |
| `Exchap1-sol.pdf` | 8 | 1 | Exercices du professeur avec solutions — les exercices du chapitre 1 en dérivent directement |
| `Chapitre2_ARM.pdf` | 40 | 2 | Architecture externe et interne, von Neumann, RISC/CISC, mémoire et boutisme, nombre d'opérandes, pipeline, registres ARM |
| `Cor-Exchap2.pdf` | 4 | 2 | Solutions des exercices 1 à 3 (programmes à 3, 2, 1 et 0 opérandes ; boutisme ; gain du pipeline) — voir §4 |
| `Chapitre 3.pdf` | 34 | 3 | Hiérarchie des mémoires, vie d'un programme, modes d'adressage, les 7 modes de l'ARM, chargement et stockage, MOV synthétique |
| `Chapitre 4.pdf` | 25 | 4 | Normes de programmation, sections, pseudo-instructions, printf et scanf, formats, programme du rectangle |
| `ResumeARM.pdf` | 10 | 3, 4 | Aide-mémoire : rôle de chaque registre, str, formats, pseudo-instructions (dont `.xword`), SAVE et RESTORE |
| `Sommaire ARMv8 + Débogage GDB.pdf` | 5 | 3, 4 | Codes condition modifiés par `subs`, `ldr wd` contre `ldrsw`, tailles des formats, commandes GDB |
| `Guide VM 2026.docx` | 1 | 4 | Seulement les commandes `make`, `make NAME=foo`, `make clean` et l'exécution `./labo1` (voir §2) |

**Total exploité : 158 pages de PDF sur 158, plus le guide de la machine
virtuelle.** Quatre pages sans couche de texte ont été rendues en image et lues
visuellement (chap. 3 p. 5, chap. 4 p. 17 et 25, Cor-Exchap2 p. 4) ; les
tableaux de la diapositive 3 et le code de la diapositive 22 du chapitre 4
ont aussi été vérifiés sur image, l'extraction de texte en mélangeant les
colonnes.

## 2. Fichiers non utilisés, et pourquoi

| Fichier | Raison |
| --- | --- |
| `EquipeAvecKOUE4172.txt` | Fichier vide (0 octet). Son nom indique une équipe de laboratoire ; aucun contenu de cours. |
| `fib.as` et le dossier `fib/` | **Ton propre travail de laboratoire** (somme des termes pairs de Fibonacci, champ « Auteur.e.s » vide), pas du matériel d'enseignement. Publier une solution de laboratoire serait de toute façon inapproprié. Seul fait retenu, ici et nulle part ailleurs : le gabarit inclut `ift209.as`, qui fournit sans doute les macros `SAVE` et `RESTORE`. |
| `VM-IFT209-ARM/` | La machine virtuelle elle-même (disques, installateur VMware) : aucun contenu de cours. |
| `Guide VM 2026.docx` — sauf la section 5 | Le guide contient l'**identifiant et le mot de passe** du compte de la machine virtuelle. **Délibérément non repris** sur le site, qui pourrait être déployé publiquement. Seules les commandes de compilation et d'exécution le sont. |

## 3. Ce qui est produit

| Chapitre | Concepts | Tableaux | Quiz | Test | Cartes | Exercices |
| --- | --- | --- | --- | --- | --- | --- |
| 1 — Systèmes de numération | 8 | 3 | 12 | 20 | 12 | 5 |
| 2 — Architecture des ordinateurs | 8 | 3 | 12 | 20 | 13 | 5 |
| 3 — L'accès aux données | 8 | 3 | 12 | 20 | 12 | 5 |
| 4 — Premier programme ARMv8 | 9 | 5 | 12 | 21 | 12 | 5 |
| **Total** | **33** | **14** | **48** | **81** | **49** | **20** |

Les 33 concepts génèrent **33 cartes mémoire supplémentaires**, soit **82
cartes** dans la file de révision.

### Modes d'exercices

L'assembleur ARMv8 **ne s'exécute pas dans un navigateur** — émuler un
processeur ARM avec la bibliothèque C serait un faux exécuteur. **Aucun
exercice de ce cours n'est en mode `run`.** Un langage `asm` (« Assembleur
ARMv8 ») a été ajouté au schéma pour que ces exercices soient étiquetés
honnêtement.

| Mode | Nombre | Langage |
| --- | --- | --- |
| `trace` | 8 | assembleur, texte, pseudo-code |
| `find-bug` | 4 | assembleur, texte |
| `predict-output` | 4 | texte, C++ |
| `fill-blank` | 4 | assembleur, texte |

L'exercice C++ du chapitre 2 est le programme témoin du boutisme de la
diapositive 19 : on prédit sa sortie sur une machine big-endian puis
little-endian, sans l'exécuter.

## 4. Écarts relevés dans les documents — à confirmer au cours

Chaque écart a été **vérifié par calcul** avant d'être signalé. Aucun n'a été
propagé dans le matériel d'étude.

1. **`Cor-Exchap2.pdf`, exercice 2, question 2, big-endian.** Les octets de
   0x400 à 0x407 sont `A7 65 FC 00 1A 54 7B D7`. En big-endian, le double-mot
   à 0x400 vaut donc `A765FC001A547BD7`, et celui à 0x404 vaut
   `1A547BD7FF013418`. La solution donne **les deux valeurs inversées** (et
   reprend la mauvaise pour 0x400 « avec contrainte de frontière »). Les
   réponses little-endian et toutes celles de la question 1 sont exactes.
   Les exercices du chapitre 2 ne reposent que sur les cas vérifiés.
2. **`Chapitre 3.pdf`, diapositive 33.** « 35 = 100101 » : or
   100101₂ = 37. 35 s'écrit 100011₂, et 35 décalé de 8 donne bien 8960. Le
   principe est juste ; signalé par un encadré dans le chapitre 3.
3. **`Chapitre 3.pdf`, diapositive 31.** Le stockage 64 bits est écrit
   « stx (avec x0-x30) ». ResumeARM (`str x23,[x20]`) et le Sommaire
   (`str xd, a` — 8 octets) donnent `str`. Les notes suivent les
   aide-mémoire ; signalé par un encadré.
4. **`Chapitre 4.pdf`, diapositive 23.** Le commentaire du second `neg` dit
   « |X2-X1| » au lieu de « |Y2-Y1| ». Le code est juste ; seul le commentaire
   est erroné.
5. **`.align`.** Les trois documents disent que `.align k` place la donnée
   suivante à une adresse multiple de k. D'après la documentation de
   l'assembleur GNU — **savoir extérieur au cours** —, sur ARM l'argument est
   un exposant : `.align 4` aligne sur 16 octets. Cela ne casse aucun
   programme du cours, mais peut surprendre dans GDB. Présenté dans le
   chapitre 4 dans un encadré **« hors cours »** en pointillés ; les
   exercices suivent la règle du cours. À vérifier sur la machine virtuelle.

## 5. Savoir extérieur aux documents

| Élément | Où | Comment il est signalé |
| --- | --- | --- |
| Programmation impérative et C (`printf`, `scanf`, `&`) | Parcours, avant le chapitre 4 | Étape `prereq-prog`, **`external: true`**, en pointillés |
| Comportement de `.align` dans l'assembleur GNU | Chapitre 4, §2.2 | Encadré `external` « hors cours », en pointillés |

Le type d'encadré `external` a été ajouté au composant `Callout` pour ce
cours : même code visuel que les étapes externes du parcours (pointillés,
flèche ↗, étiquette « hors cours »).

## 6. Sujets trop minces — ce qui manquerait

- **Le cours s'arrête au chapitre 4.** Les documents fournis couvrent le
  premier programme complet ; rien sur les sous-programmes (`bl`, `ret`, pile,
  `SAVE`/`RESTORE` en détail), les tableaux, les branchements conditionnels
  en profondeur ou la virgule flottante — alors que ResumeARM et le Sommaire
  listent déjà ces instructions. Les chapitres suivants seront à ajouter
  quand leurs diapositives seront disponibles.
- **Pas d'exercices du professeur pour les chapitres 3 et 4.** Seuls les
  chapitres 1 et 2 ont un corrigé ; les exercices des chapitres 3 et 4 sont
  construits à partir des diapositives et vérifiés par calcul, mais ne
  reproduisent aucun énoncé du professeur.
- **Aucun examen antérieur.** Le format de l'examen blanc (30 questions,
  90 minutes) est une convention de la plateforme, et l'interface le dit.
- **Les macros `SAVE` et `RESTORE`** ne sont décrites que par une ligne dans
  ResumeARM. Leur contenu exact (le fichier `ift209.as`) n'a pas été fourni.
