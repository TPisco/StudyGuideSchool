# content/sources/ — mes documents, jamais publiés

Ce dossier contient **mes fichiers originaux** (diapositives, PDF, notes,
énoncés de TP, plans de cours). Ils sont protégés par le droit d'auteur de
mes professeurs.

- `content/sources/` est dans `.gitignore`.
- Rien ici n'est jamais committé, poussé ou déployé.
- Ces fichiers sont lus **localement** pour générer le matériel d'étude.
- Seul le matériel généré (`content/courses/`) est publié.

## Comment ajouter un cours

```
content/sources/<CODE-DU-COURS>/
    plan-de-cours.pdf        <- le plan de cours définit la structure
    cours-01.pdf
    cours-02.pdf
    tp-01.pdf
    examen-2024.pdf
```

Puis lancer `/add-course <CODE-DU-COURS>` dans Claude Code.
