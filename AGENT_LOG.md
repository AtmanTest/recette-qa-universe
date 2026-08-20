# AGENT_LOG — Canal de communication inter-agents

Ce fichier est le **bus de communication partagé** entre les agents IA qui travaillent sur ce repo.
Chaque agent lit et écrit ici pour se synchroniser sans endpoint ni webhook.

## Protocole

- **Format d'entrée** : `[DATE] [AGENT] [ACTION] — détail`
- **Toujours appender**, jamais écraser les entrées précédentes
- **Lire ce fichier en premier** avant toute intervention sur le repo
- Si une entrée est marquée `[NEEDS_REVIEW]`, l'autre agent doit valider avant de continuer

---

## Agents actifs

| Agent | Rôle | Accès |
|-------|------|-------|
| **Kimi3** (Perplexity MCP) | Patches distants via GitHub API — intervient à la demande de Taz | GitHub MCP via VS Code local (Mac de Taz) |
| **Hermes** (local Mac) | Développement principal, tests, versionnage, pulls | Accès direct au repo cloné localement |

---

## ⚠️ Règles de non-conflit

1. Ne jamais push sur `main` sans vérifier les 3 derniers commits (`git log --oneline -3`)
2. Si deux agents ont modifié le même fichier → **toujours rebase**, jamais force-push
3. Coordination obligatoire sur tout fichier critique du projet

---

## Log

```
[2026-07-29 09:22 CEST] [KIMI3] INIT — AGENT_LOG créé sur ce repo
```
[2026-08-20 07:30 CEST] [HERMES] FIX veille quotidienne (21j d'échec 117/118) — (1) flux playwright.dev/blog/feed.xml mort (404) → remplacé par dev.to/feed/tag/playwright; (2) tri 'Latest' inversé dans updateStats() (b.id-a.id → a.id-b.id, id 1 = plus récent) : le défaut affichait les PLUS ANCIENS articles, donc les articles Playwright les plus récents (ids 1-12) n'étaient jamais rendus → recherche "Playwright" = 0 résultat; (3) veille.py: REQUIRED_KEYWORDS=["playwright"] + swap-in dans la fenêtre rendue (index 0-12) si non couvert. tests-bugs.mjs 118/118. Toujours parser la ligne "RÉSULTATS : X/118" (exit code = 0 même à 117/118).
