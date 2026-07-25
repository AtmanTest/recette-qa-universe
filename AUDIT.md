# AUDIT — QA Universe v3 UI Overhaul

Date : 2026-07-25
Baseline : 118/118 tests → inchangé

## Modifications UI

| Point | Section | Fichier/lignes | Description |
|-------|---------|----------------|-------------|
| A1 | Navbar | CSS :root + .navbar | hauteur 64→60px |
| A2 | Navbar | Logo HTML + .nav-logo CSS | Pill glassmorphism QA + "Universe" |
| A3 | Navbar | .nav-tab.active | border + borderRadius + boxShadow |
| A4 | Navbar | .navbar--scrolled + JS | scroll blur, border, shadow |
| A5 | Navbar | .nav-action-btn:hover | bg rgba white 0.06, radius 10 |
| B6 | Hero | .dash-hero | gradient violet+teal, 20px radius, ::before blob |
| B7 | Hero | Avatar TJ | box-shadow glow renforcé |
| B8 | Hero | .xp-bar-fill | xpShimmer animation |
| C9 | Cards | .card, .dash-stat-card | backdrop-filter blur(12px), bg rgba |
| C9b | Cards | :hover | border 0.35, shadow 32px, translateY(-3) |
| C10 | Cards | .card::before | width 3→4px |
| C11 | Cards | .kpi-icon, .tool-avatar | radius 12px, inset shadow |
| D12 | Mesh BG | .mesh-bg::before/after | opacity 0.3→0.4 |
| D12c | Mesh BG | .mesh-accent-blob | nouveau blob violet flottant + animation |
| E13 | Typo | .section-title | 2.25rem, -0.03em, ::before ligne 32px |
| E14 | Layout | .tab-inner | max-width 1280px |
| F15 | News | .news-card-v2 .news-hero-card | radius 16/20px, min-height 340px |
| F17 | News | .news-card-v2 .news-tag | font-size 10px, letter-spacing |
| G18 | Chatbot | .chatbot-fab | gradient violet, pulse animation |
| G19 | Chatbot | .chatbot-panel | backdrop blur 24px, radius 20, premium shadow |
| G20 | Chatbot | .msg-bubble | bot/user radius asymétriques |
| G21 | Chatbot | .chatbot-header, .status | gradient+teal, pulse status |
| G22 | Chatbot | .ai-quick-qs mobile | scroll-snap, hide scrollbar |
| H23 | Mobile | .chatbot-panel ≤639px | fullscreen 75vh |
| H24 | Mobile | .creator-avatar-wrapper | display:none mobile |
| H27 | Mobile | .nav-tab mobile | min-height/width 44px |
| H28 | Mobile | footer, chatbot | safe-area-inset-bottom |
| I29 | Light | chatbot panel/bubbles/input | overrides blanc |
| I30 | Light | .mesh-bg opacity | 0.15 !important |
| J31 | Anim | scroll-reveal | IntersectionObserver + .visible class |
| J32 | Anim | tab switch | tabFadeIn 280ms |
| J33 | Anim | .nav-tab:hover | translateY(-1px) |
| J34 | Anim | .btn-primary:hover | box-shadow glow 4px |

## Bugs corrigés
- Scroll reveal initial : utilisait inline opacity:0 → invisible car prioritaire sur CSS (corrigé : classe .scroll-reveal + !non-inline)

## Améliorations Hermes
- Aucune (respect strict des 34 points)
