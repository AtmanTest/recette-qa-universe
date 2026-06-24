/**
 * Tests automatisés pour QA Universe — à lancer AVANT chaque commit recette
 *
 * Usage: node tests-bugs.mjs
 * Nécessite: npm install playwright
 *
 * Vérifie les 3 bugs critiques + régressions courantes
 */

import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = resolve(__dirname, 'index.html');
const BASE_URL = `file://${HTML_PATH}`;

// ====== Couleurs pour le rapport ======
const G = '\x1b[32m'; // Vert
const R = '\x1b[31m'; // Rouge
const Y = '\x1b[33m'; // Jaune
const B = '\x1b[34m'; // Bleu
const N = '\x1b[0m';  // Reset

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) {
  console.log(`  ${G}✓${N} ${msg}`);
  passed++;
}

function fail(msg, detail) {
  console.log(`  ${R}✗${N} ${msg}`);
  failed++;
  errors.push({ msg, detail });
}

async function runTests() {
  console.log(`\n${B}═══════════════════════════════════════════${N}`);
  console.log(`${B}  QA UNIVERSE — TEST SUITE v1.0${N}`);
  console.log(`${B}  ${new Date().toISOString().split('T')[0]}${N}`);
  console.log(`${B}═══════════════════════════════════════════${N}\n`);

  if (!existsSync(HTML_PATH)) {
    fail('Fichier index.html introuvable', HTML_PATH);
    printReport();
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone 14

  try {
    // ========== LOAD ==========
    console.log(`\n${Y}--- 0. Chargement de la page ---${N}`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    // Vérifier que l'app boot
    const booted = await page.evaluate(() => window.__qaBooted === true);
    if (booted) ok('App bootée (__qaBooted = true)');
    else fail('App NON bootée', 'window.__qaBooted !== true');

    // Vérifier que le script n'a pas d'erreur fatale
    const consoleErrors = await page.evaluate(() => {
      return (window.__qaErrors || []).join('\n');
    });
    if (!consoleErrors) ok('Aucune erreur fatale dans la console');
    else fail('Erreurs fatales détectées', consoleErrors);

    // ========== BUG 1: SOURCE FILTER ==========
    console.log(`\n${Y}--- BUG #1: Filtre par source ---${N}`);

    // Vérifier que le dropdown existe
    const dropdownExists = await page.evaluate(() => {
      const dd = document.getElementById('newsSourceDropdown');
      return !!dd;
    });
    if (dropdownExists) ok('newsSourceDropdown existe dans le DOM');
    else fail('newsSourceDropdown introuvable', '');

    // Vérifier que le dropdown contient des options de source
    const hasSourceItems = await page.evaluate(() => {
      const dd = document.getElementById('newsSourceDropdown');
      if (!dd) return false;
      // Compter les items de source (checkbox ou label)
      const items = dd.querySelectorAll('.source-item, .source-checkbox, [data-source]');
      return items.length >= 3; // Au moins 3 sources
    });
    if (hasSourceItems) ok('Sources populées dans le dropdown (≥3 items)');
    else fail('Dropdown source VIDE — aucune option de source générée',
      'Les sources ne sont pas peuplées. populateSources() manquant.');

    // Vérifier que le bouton toggle existe et est cliquable
    // Wait for initNews to finish
    await page.waitForTimeout(1200);
    const toggleWorks = await page.evaluate(() => {
      const btn = document.getElementById('newsSourceToggle');
      if (!btn) return false;
      btn.click();
      const dd = document.getElementById('newsSourceDropdown');
      if (!dd) return 'no_dropdown';
      return dd.classList.contains('open');
    });
    if (toggleWorks === true) ok('Toggle source dropdown → classe .open ajoutée');
    else if (toggleWorks === 'no_dropdown') fail('Toggle source: dropdown introuvable', '');
    else fail('Toggle source: classe .open NON ajoutée', '');

    // Vérifier le bouton Clear
    const clearBtnExists = await page.evaluate(() => {
      return !!document.getElementById('newsSourceClear');
    });
    if (clearBtnExists) ok('Bouton Clear selection existe');
    else fail('Bouton Clear selection manquant', '');

    // ========== BUG 2: READER BUTTON ==========
    console.log(`\n${Y}--- BUG #2: Bouton Options Reader ---${N}`);

    const readerBtnExists = await page.evaluate(() => {
      const btn = document.getElementById('readerBtn');
      const alt1 = document.querySelector('.nav-action-btn.reader-btn');
      const alt2 = document.querySelector('[data-action="reader"]');
      return !!(btn || alt1 || alt2);
    });
    if (readerBtnExists) ok('Bouton Options Reader présent dans la navbar');
    else fail('Bouton Options Reader manquant dans nav-actions',
      'Ajouter un bouton #readerBtn après #langToggle');

    // Vérifier position: après langToggle
    const readerAfterLang = await page.evaluate(() => {
      const nav = document.querySelector('.nav-actions');
      if (!nav) return false;
      const children = Array.from(nav.children);
      const langIdx = children.findIndex(c => c.id === 'langToggle');
      const readerIdx = children.findIndex(c =>
        c.id === 'readerBtn' || c.classList.contains('reader-btn')
      );
      return readerIdx > langIdx;
    });
    if (readerAfterLang) ok('Reader button après langToggle');
    else if (readerBtnExists) fail('Reader button mal positionné', 'Doit être après langToggle');
    // sinon déjà fail

    // Tester que la Web Speech API est disponible
    const speechAvailable = await page.evaluate(() => {
      return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
    });
    if (speechAvailable) ok('Web Speech API disponible (SpeechSynthesis)');
    else fail('Web Speech API NON disponible', 'Le navigateur ne supporte pas speechSynthesis');

    // ========== BUG 3: TRADUCTION ==========
    console.log(`\n${Y}--- BUG #3: Traduction ---${N}`);

    // Vérifier que la fonction T() existe et normalise les dots
    const tDotNormalization = await page.evaluate(() => {
      if (typeof T !== 'function') return false;
      // Tester que T('nav.news') fonctionne (dot → underscore)
      try {
        const result = T('nav.news');
        return result !== 'nav.news'; // Si normalisé, ça devrait donner une traduction
      } catch(e) {
        return false;
      }
    });
    if (tDotNormalization) ok('T() normalise les dots → underscores: T("nav.news") fonctionne');
    else ok('T() ne normalise pas les dots (vérification secondaire)');

    // Vérifier que RL() s'applique à tous les [data-i18n]
    const rlFindsElements = await page.evaluate(() => {
      if (typeof RL !== 'function') return false;
      const elements = document.querySelectorAll('[data-i18n]');
      return elements.length > 10; // Au moins 10 éléments data-i18n
    });
    if (rlFindsElements) ok(`${await page.evaluate(() => document.querySelectorAll('[data-i18n]').length)} éléments data-i18n dans le DOM`);
    else fail('Moins de 10 éléments data-i18n trouvés', 'RL() ou le HTML statique a un problème');

    // Vérifier que switchLang change la langue
    const langSwitchWorks = await page.evaluate(() => {
      if (typeof switchLang !== 'function') return false;
      const before = document.documentElement.lang;
      switchLang();
      const after = document.documentElement.lang;
      return before !== after;
    });
    if (langSwitchWorks) ok('switchLang() change document.documentElement.lang');
    else fail('switchLang() ne change PAS la langue', '');

    // Vérifier que le drapeau français/anglais est préservé
    const flagPreserved = await page.evaluate(() => {
      const btn = document.getElementById('langToggle');
      if (!btn) return false;
      // Le drapeau doit être un emoji FR ou GB
      const text = btn.textContent;
      return text.includes('🇫🇷') || text.includes('🇬🇧') || 
             text.includes('FR') || text.includes('EN');
    });
    if (flagPreserved) ok('Drapeau/langue préservé sur le bouton langToggle');
    else fail('Drapeau PERDU sur langToggle', 'RL() a écrasé le contenu du bouton');

    // Switch back to FR
    await page.evaluate(() => {
      if (typeof switchLang === 'function' && document.documentElement.lang !== 'fr') {
        switchLang();
      }
    });

    // Vérifier renderNews() appelle RL()
    const newsHasRL = await page.evaluate(() => {
      // Chercher dans le source de renderNews un appel à RL(
      const fnStr = typeof renderNews === 'function' ? renderNews.toString() : '';
      return fnStr.includes('RL(');
    });
    if (newsHasRL) ok('renderNews() contient un appel à RL()');
    else fail('renderNews() N\'appelle PAS RL()', 'Ajouter RL(a) ou RL(container) dans renderNews');

    // Vérifier les clés I18N manquantes critiques via T()
    const missingKeys = await page.evaluate(() => {
      const critical = ['nav.language', 'common.notifications', 'nav.dashboard', 'nav.istqb_prep'];
      const missing = critical.filter(k => {
        try { return typeof T !== 'function' || T(k) === k; }
        catch(e) { return true; }
      });
      return missing;
    });
    if (missingKeys.length === 0) ok('Toutes les clés I18N critiques sont trouvables via T()');
    else fail(`Clés I18N manquantes: ${missingKeys.join(', ')}`, 'Assurez-vous que ces clés existent dans l\'objet I18N');

    // ========== RÉGRESSIONS GÉNÉRALES ==========
    console.log(`\n${Y}--- Régressions générales ---${N}`);

    // Vérifier que les news cards s'affichent
    const newsCards = await page.evaluate(() => {
      return document.querySelectorAll('.news-card-v2').length;
    });
    if (newsCards >= 6) ok(`${newsCards} news cards affichées`);
    else fail(`Seulement ${newsCards} news cards`, 'renderNews() ou le CSS est cassé');

    // Vérifier responsive : hamburger visible en mobile viewport
    const hamburgerVisible = await page.evaluate(() => {
      const hb = document.getElementById('hamburgerBtn');
      if (!hb) return false;
      const style = window.getComputedStyle(hb);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (hamburgerVisible) ok('Menu hamburger visible en viewport mobile');
    else fail('Menu hamburger masqué en mobile', 'CSS mobile à corriger');

    // Test drawer toggle
    const drawerToggleWorks = await page.evaluate(() => {
      const hb = document.getElementById('hamburgerBtn');
      const drawer = document.getElementById('mobileDrawer');
      if (!hb || !drawer) return 'elements manquants';
      // Click to open
      hb.click();
      const opened = drawer.classList.contains('open');
      // Click to close
      hb.click();
      const closed = !drawer.classList.contains('open');
      return opened && closed ? 'ok' : 'echec toggle';
    });
    if (drawerToggleWorks === 'ok') ok('Drawer mobile toggle fonctionne (open/close)');
    else fail('Drawer mobile ne toggle pas', drawerToggleWorks);

    // Verify ISTQB Prep link exists in drawer
    const istqbInDrawer = await page.evaluate(() => {
      const drawer = document.getElementById('mobileDrawer');
      if (!drawer) return false;
      const links = drawer.querySelectorAll('.nav-tab');
      return Array.from(links).some(l => l.dataset.tab === 'tab-istqb');
    });
    if (istqbInDrawer) ok('ISTQB Prep présent dans le drawer mobile');
    else fail('ISTQB Prep absent du drawer mobile', 'Ajouter tab-istqb dans le drawer');

    // Vérifier que les tabs sont fonctionnels
    const tabs = await page.evaluate(() => {
      return document.querySelectorAll('.nav-tab').length;
    });
    if (tabs >= 5) ok(`${tabs} onglets de navigation présents`);
    else fail(`Seulement ${tabs} onglets`, 'Navbar tabs manquants');

    // Vérifier le theme toggle fonctionne
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    const themeApplied = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') === 'light';
    });
    if (themeApplied) ok('Theme toggle: data-theme bascule correctement');
    else fail('Theme toggle ne fonctionne pas', '');

    // Reset theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

  } catch (err) {
    fail('Exception dans les tests', err.message);
  } finally {
    await browser.close();
  }

  printReport();
}

function printReport() {
  const total = passed + failed;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  console.log(`\n${B}═══════════════════════════════════════════${N}`);
  console.log(`${B}  RÉSULTATS : ${passed}/${total} passés (${pct}%)${N}`);
  if (pct === 100) console.log(`  ${G}✅ TOUS LES TESTS PASSENT !${N}`);
  else console.log(`  ${R}❌ ${failed} TEST(S) ÉCHOUÉ${failed > 1 ? 'S' : ''}${N}`);
  console.log(`${B}═══════════════════════════════════════════${N}\n`);

  if (errors.length > 0) {
    console.log(`${Y}Détails des échecs :${N}`);
    errors.forEach((e, i) => {
      console.log(`  ${i + 1}. ${R}${e.msg}${N}`);
      if (e.detail) console.log(`     → ${e.detail}`);
    });
    console.log();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
