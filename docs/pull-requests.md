# Workflow "professionnel" de pull requests
1. Je regarde ce que j'ai à faire: normalement ça se passe dans l'onglet *Issues* de GitHub, c'est là qu'on devrait avoir toutes les tâches à accomplir ainsi que la ou les personnes qui leurs sont assignés (ainsi qu'une petite discussion si besoin)
2. Je vérifie que je suis bien sur le main sur ma machine et je  `git pull`. (ou alors je `git checkout main` après un pull, peu importe)
3. IMPORTANT: je crée tout de suite ce qui s'appelle une *feature branch* càd. une branche dédiée à la tâche assignée qui se base sur le main actuel
  - Si le devoir m'appelle sur une autre tâche plus urgente, je crée une autre branche pour celle ci.
  - Généralement ces branches ont une durée de vie très courte et se nomment `feat/nom-de-la-feature` ou `bug/nom-du-bug-fix`.
  - Pour créer la branche utilisez `git switch -c feat/...` ou équivalent.
4. Quand j'ai fini de travailler, je `git fetch` `git rebase origin/main`  (explications plus bas) et je `git push`, ce qui crée ma branche sur le github.
5. Sur github je clique sur ma branche (petit menu à côté des fichiers) et j'ouvre un *Pull-Request* sur le main, qui peut mentionner le *Issue* original.
6. Optionnelement un autre membre de l'équipe passe un coup d'oeil sur le pull-request et l'approuve, on peut donc le merge sur le main et fermer le *Issue*

# OKOK, d'accord, mais pourquoi compliquer?
```
        *    <--- branche A
      /
* - * - * - * <-- main
  \
    * - * - * <-- branche B
    
```
Admettons qu'on ait la situation ci-dessus, si on merge tout dans main à la brute, on fini comme ceci:
```
        * - -
      /       \
* - * - * - * - * - *
  \               /
    * - * - * - -
                ^ merge 1
                    ^ merge 2
```
Si par hasard les branches A et B touchent aux mêmes fichiers voire pire au même paragraphe on se retrouve avec un bordel sans nom, on passe des heures à merge et, si il ya un probleme dans un vieux commit (avant le merge) qu'il faut réparer on doit tout refaire à nouveau (:

En utilisant des rebases, le travail de résolution des conflits se passe AVANT le merge (et du coup ne pollue pas le l'historique du main):
```
                * branche A' (rebased)
              / 
* - * - * - * <-- main
  \
    * - * - * <-- branche B


                * main' (PR 1)
              /  \
* - * - * - *     \
                   \
                     * - * - * <-- branche B (rebased)
    
                *
              /  \
* - * - * - *     \
                   \
                     * - * - * <-- main'' (PR 2)
```
C'est pas très évident à dessiner mais comme on peut voir on a 2 pull request (càd *merge* sur main) PR1 et PR2 quand même mais l'historique du main est devenu **linéaire** ce qui rend beaucoup plus facile par la suite de se balader en avant et en arrière dans l'historique, pour - par éxemple - voir les performances ou savoir quand exactement un bug a été introduit sans avoir peur de résoudre 10 000 *merge conflicts* à chaque fois.

# C'est une méthode standard mais qui a ses désavantages:
- Elle requiert une certaine discipline pour ceux qui n'ont pas travaillé comme ça avant.
- On peut se perdre dans les branches si on travaille sur plus d'une chose à la fois.
  - Pour ce deuxième point je vous conseille de regarder la commande `git worktree` qui vous permet de séparer chaque branche dans un dossier à part, ce que je trouve plus intuitif que le workflow `git stash` `git switch` `git stash pop`

# N'ayez crainte
C'est vraiment très difficile de perdre du travail à tout jamais si il a été *commit* sur git, je m'y connais assez bien même en opérations délicates et je saurais vous aider en cas de pépin!
