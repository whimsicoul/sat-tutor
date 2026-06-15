/**
 * Fix corrupted characters (U+FFFD) in flagged breakfast problems.
 * No API key required — applies known systematic replacements.
 *
 * Usage:
 *   node scripts/fix-flagged-direct.mjs           # dry run
 *   node scripts/fix-flagged-direct.mjs --apply   # write to DB
 */

import { neon } from '@neondatabase/serverless';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const R = '�';

// ─── Replacement rules (applied in order, most specific first) ────────────────

// Each entry is [searchString, replacement].
// Global regex for en-dash and copyright are applied before these.
const SPECIFIC = [
  // Painting dimensions (× multiplication sign)
  [`149 ${R} 255`, '149 × 255'],
  [`132 ${R} 264`, '132 × 264'],
  // Cree word in painting title (Kent Monkman)
  [`mistik${R}siwak`, 'mistikôsiwak'],
  // Compound-modifier en dashes (non-digit context)
  [`Hong Kong${R}based`, 'Hong Kong–based'],
  [`post${R}World War`, 'post–World War'],
  [`Wisconsin${R}Madison`, 'Wisconsin–Madison'],
  [`Mexico${R} United States`, 'Mexico–United States'],
  [`Prize${R}winning`, 'Prize–winning'],
  // BCE/CE date ranges (letter precedes FFFD)
  [`BCE${R}`, 'BCE–'],
  // Temperature degree symbols (specific decimal values to avoid ambiguity)
  [`90.2${R}`, '90.2°'],
  [`97.7${R}`, '97.7°'],
  [`102.7${R}`, '102.7°'],
  [`111.2${R}`, '111.2°'],
  [`125.6${R}`, '125.6°'],
  [`6${R}C`, '6°C'],
  [`3.5${R}C`, '3.5°C'],
  // Range with space: "3? 4 meters" (answer explanation)
  [`3${R} 4 meters`, '3–4 meters'],
  // km²
  [`km${R}`, 'km²'],
  // Two-FFFD sequences first
  [`L${R} L${R}ng Minh`, 'Lê Lương Minh'],         // Lê Lương Minh
  [`Fr${R}d${R}ric`, 'Frédéric'],                        // Frédéric
  [`M${R} ${R}ngeles Medina`, 'Mª Ángeles Medina'],      // Mª Ángeles Medina
  [`Estefan${R}a Mu${R}oz`, 'Estefanía Muñoz'],         // Estefanía Muñoz
  // Accented names — single FFFD
  [`Ana Mar${R}a `, 'Ana María '],      // María
  [`Santamar${R}a`, 'Santamaría'],      // Santamaría
  [`Luc${R}a `, 'Lucía '],            // Lucía
  [`Ram${R}rez`, 'Ramírez'],            // Ramírez
  [`Ram${R}n`, 'Ramón'],              // Ramón (y Cajal)
  [`Algar${R}n`, 'Algarín'],          // Algarín
  [`Luise${R}o`, 'Luiseño'],          // Luiseño
  [`Cupe${R}o`, 'Cupeño'],            // Cupeño
  [`Id${R}r`, 'Idár'],               // Idár
  [`Cr${R}nica`, 'Crónica'],          // Crónica
  [`H${R}ctor`, 'Héctor'],            // Héctor
  [`Sue${R}o de`, 'Sueño de'],        // Sueño
  [`Gonz${R}lez`, 'González'],        // González
  [`Jo${R}o`, 'João'],               // João
  [`M${R}nica`, 'Mônica'],            // Mônica (Brazilian Portuguese)
  [`Kj${R}r`, 'Kjær'],               // Kjær
  [`Sany${R}-`, 'Sanyé-'],            // Sanyé-
  [`Laod${R}keia`, 'Laodíkeia'],      // Laodíkeia
  [`Neshnab${R}`, 'Neshnabé'],        // Neshnabé
  [`t${R}ngara`, 'túngara'],      // túngara
  [`B${R}rre`, 'Børre'],             // Børre
  [`S${R}thre`, 'Sæthre'],            // Sæthre
  [`${R}ntonia`, 'Ántonia'],           // Ántonia (My Ántonia)
  [`Vicu${R}a`, 'Vicuña'],            // Vicuña
  [`Cardel${R}s`, 'Cardelús'],        // Cardelús
  [`choib${R}`, 'choibá'],            // choibá
  [`Grimk${R}`, 'Grimké'],            // Grimké
  [`Guy-Blach${R}`, 'Guy-Blaché'],    // Guy-Blaché
  [`alacr${R}n`, 'alacrán'],          // alacrán
  [`L${R}pez`, 'López'],             // López
  [`Mar${R}a `, 'María '],           // María (trailing space → avoids "Mañanaland" collision)
  [`Forn${R}s`, 'Fornés'],           // Fornés
  [`Jos${R} `, 'José '],            // José
  [`Mart${R}’`, `Martí’`], // Martí’ (curly apostrophe)
  [`Mart${R}'`, `Martí'`],           // Martí' (straight apostrophe)
  [`Mart${R}n`, 'Martín'],           // Martín
  [`Mart${R}nez`, 'Martínez'],       // Martínez
  [`Garc${R}a`, 'García'],           // García
  [`S${R}anii`, 'Sáanii'],           // Sáanii
  [`Yucat${R}n`, 'Yucatán'],         // Yucatán
  [`Batalh${R}o`, 'Batalhão'],       // Batalhão
  [`Bront${R}`, 'Brontë'],           // Brontë
  [`Ta${R}nos`, 'Taínos'],           // Taínos
  [`Lumi${R}re`, 'Lumière'],         // Lumière
  [`Ang${R}lica`, 'Angélica'],       // Angélica
  [`Rinc${R}n`, 'Rincón'],          // Rincón
  [`San Sebasti${R}n`, 'San Sebastián'], // Sebastián
  [`Chlo${R} `, 'Chloé '],          // Chloé
  [`Montr${R}al`, 'Montréal'],       // Montréal
  [`Qu${R}bec`, 'Québec'],           // Québec
  [`${R}rbol`, 'Árbol'],             // Árbol
  [`Gij${R}n`, 'Gijón'],            // Gijón
  [`${R}rbol de la Sidra`, 'Árbol de la Sidra'], // Árbol (longer match, harmless duplicate)
  [`Nicol${R}s`, 'Nicolás'],        // Nicolás
  [`Pap${R}`, 'Papá'],              // Papá
  [`Cede${R}o`, 'Cedeño'],          // Cedeño
  [`Gal${R}pagos`, 'Galápagos'],    // Galápagos
  [`Pinz${R}n`, 'Pinzón'],          // Pinzón
  [`Namb${R} Pueblo`, 'Nambé Pueblo'],
  [`Alc${R}zar`, 'Alcázar'],        // Alcázar
  [`Andaluc${R}a`, 'Andalucía'],    // Andalucía
  [`Vel${R}zquez`, 'Velázquez'],    // Velázquez
  [`Roc${R}o`, 'Rocío'],            // Rocío
  [`Alem${R}n`, 'Alemán'],          // Alemán
  [`Coyoac${R}n`, 'Coyoacán'],     // Coyoacán
  [`Danc${R}k`, 'Dančák'],     // Dančák
  [`Sim${R}es`, 'Simões'],          // Simões
  [`St${R}ger`, 'Stöger'],          // Stöger
  [`Anik${R} `, 'Anikó '],         // Anikó
  [`na${R}ve`, 'naïve'],            // naïve
  [`Caf${R}`, 'Café'],             // Café
  [`Esplandi${R}n`, 'Esplandián'], // Esplandián
  [`Din${R}`, 'Diné'],             // Diné
  [`pi${R}at`, 'piñat'],           // piñata / piñatas
  [`S${R}ng I Sing`, 'Sóng I Sing'], // Sóng I Sing
  [`Mu${R}oz`, 'Muñoz'],           // Muñoz (standalone, after Estefanía Muñoz above)
  [`Ma${R}analand`, 'Mañanaland'], // Mañanaland
  // Finnish lake name
  [`Ouluj${R}rvi`, 'Oulujärvi'],
  // Hernández surname
  [`Hern${R}ndez`, 'Hernández'],
  // Mexico (no space before United)
  [`Mexico${R}United States`, 'Mexico–United States'],
  // San José followed by period
  [`Jos${R}.`, 'José.'],
  // Temperature table header
  [`(${R}C`, '(°C'],
  // Temperature decimal value
  [`27.56${R}C`, '27.56°C'],
  // Temperature 36.57°C
  [`36.57${R}C`, '36.57°C'],
  // Latitude degrees
  [`45${R} north`, '45° north'],
  // Norwegian lake Mjøsa
  [`Mj${R}sa`, 'Mjøsa'],
  // January–April range (d86f2bc0)
  [`January${R}April`, 'January–April'],
  // Lê Lương Minh single-FFFD version (e610cd09: ươ was dropped)
  [`L${R} Lng Minh`, 'Lê Lương Minh'],
  // Andrés / Hincapié (1adb7166)
  [`Andr${R}s`, 'Andrés'],
  [`Hincapi${R} `, 'Hincapié '],
  // André Izidoro (5f2f004a)
  [`Andr${R} `, 'André '],
  // Temperature degrees in Navajo Nation table (dde323c1)
  [`93${R}`, '93°'],
  [`94${R}`, '94°'],
  [`65${R}`, '65°'],
  [`99${R}`, '99°'],
  [`83${R}`, '83°'],
  [`50${R}`, '50°'],
  [`${R}ngeles`, 'Ángeles'],        // Ángeles (fallback)
];

// ─── Fix function ─────────────────────────────────────────────────────────────

function fix(text) {
  if (!text || !text.includes(R)) return text;
  let s = text;

  // 1. Copyright symbol: FFFD immediately before a 4-digit year then " by "
  //    e.g. "©2003 by Jhumpa Lahiri"
  s = s.replace(/�(\d{4}) by /g, '©$1 by ');

  // 2. En dash between two adjacent digits
  //    e.g. "1873–1908", "18–22", "1914–16"
  s = s.replace(/(\d)�(\d)/g, '$1–$2');

  // 2b. En dash after percent: '17%�18%' -> '17%-18%'
  s = s.replace(/%�(\d)/g, '%–$1');


  // 2c. Degree before F: 9,800�F – 9,800°F
  s = s.replace(/(\d)�F/g, '$1°F');
  // 3. Specific string replacements
  for (const [from, to] of SPECIFIC) {
    if (s.includes(from)) s = s.split(from).join(to);
  }

  return s;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TEXT_FIELDS = ['question', 'choice_a', 'choice_b', 'choice_c', 'choice_d', 'answer_explanation'];

async function main() {
  const applyChanges = process.argv.includes('--apply');
  const sql = neon(process.env.DATABASE_URL);

  console.log(applyChanges
    ? '\x1b[33m--- APPLY MODE ---\x1b[0m'
    : '\x1b[36m--- DRY RUN (add --apply to write) ---\x1b[0m');

  const rows = await sql`
    SELECT id, external_id, question, choice_a, choice_b, choice_c, choice_d, answer_explanation
    FROM breakfast_problems
    WHERE review_status = 'flagged_for_review'
    ORDER BY external_id NULLS LAST
  `;

  console.log(`Fetched ${rows.length} flagged problems.\n`);

  let countFixed = 0, countPartial = 0, countUnchanged = 0;

  for (const p of rows) {
    const updates = {};
    for (const f of TEXT_FIELDS) {
      const orig = p[f];
      if (!orig || !orig.includes(R)) continue;
      const result = fix(orig);
      if (result !== orig) updates[f] = result;
    }

    const label = (p.external_id ?? p.id).substring(0, 8);

    if (Object.keys(updates).length === 0) {
      countUnchanged++;
      console.log(`  SKIP     ${label}`);
      continue;
    }

    const allClean = TEXT_FIELDS.every(f => {
      const v = updates[f] ?? p[f];
      return !v || !v.includes(R);
    });

    if (allClean) {
      countFixed++;
      console.log(`\x1b[32m  OK       ${label}\x1b[0m`);
    } else {
      countPartial++;
      console.log(`\x1b[33m  PARTIAL  ${label} (some ? remain)\x1b[0m`);
    }

    for (const [f, newVal] of Object.entries(updates)) {
      const orig = p[f];
      const show = s => s.replace(/�/g, '\x1b[31m?\x1b[0m');
      console.log(`    ${f}:`);
      console.log(`      BEFORE: ${show(orig.substring(0, 120))}`);
      console.log(`      AFTER:  ${show(newVal.substring(0, 120))}`);
    }

    if (applyChanges) {
      const merged = {
        question:           updates.question           ?? p.question,
        choice_a:           updates.choice_a           ?? p.choice_a,
        choice_b:           updates.choice_b           ?? p.choice_b,
        choice_c:           updates.choice_c           ?? p.choice_c,
        choice_d:           updates.choice_d           ?? p.choice_d,
        answer_explanation: updates.answer_explanation ?? p.answer_explanation,
      };
      await sql`
        UPDATE breakfast_problems
        SET
          question           = ${merged.question},
          choice_a           = ${merged.choice_a},
          choice_b           = ${merged.choice_b},
          choice_c           = ${merged.choice_c},
          choice_d           = ${merged.choice_d},
          answer_explanation = ${merged.answer_explanation},
          review_status      = ${allClean ? null : 'flagged_for_review'}
        WHERE id = ${p.id}
      `;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Fully fixed:    ${countFixed}`);
  console.log(`Partial (? remains): ${countPartial}`);
  console.log(`No changes:     ${countUnchanged}`);
  if (!applyChanges) console.log('\nRe-run with --apply to write to DB.');
}

main().catch(e => { console.error(e); process.exit(1); });
