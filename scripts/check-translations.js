#!/usr/bin/env node

/**
 * Check for missing translations in .po files
 * Exits with code 1 if any translations are missing
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/locale/locales');
const SOURCE_LOCALE = 'en';

function parsePo(content) {
  const entries = [];
  const blocks = content.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let msgid = '';
    let msgstr = '';
    let isHeader = false;

    for (const line of lines) {
      if (line.startsWith('#')) continue;

      if (line.startsWith('msgid ""') && lines.some((l) => l.startsWith('"POT-Creation-Date'))) {
        isHeader = true;
        break;
      }

      if (line.startsWith('msgid ')) {
        msgid = line.slice(7, -1); // Remove 'msgid "' and trailing '"'
      } else if (line.startsWith('"') && !msgstr) {
        // Continuation of msgid
        msgid += line.slice(1, -1);
      } else if (line.startsWith('msgstr ')) {
        msgstr = line.slice(8, -1); // Remove 'msgstr "' and trailing '"'
      } else if (line.startsWith('"') && msgstr !== undefined) {
        // Continuation of msgstr
        msgstr += line.slice(1, -1);
      }
    }

    if (!isHeader && msgid) {
      entries.push({ msgid, msgstr });
    }
  }

  return entries;
}

function checkLocale(locale) {
  const poPath = path.join(LOCALES_DIR, locale, 'messages.po');

  if (!fs.existsSync(poPath)) {
    console.error(`❌ Missing translation file: ${poPath}`);
    return { locale, missing: [], error: 'File not found' };
  }

  const content = fs.readFileSync(poPath, 'utf-8');
  const entries = parsePo(content);

  const missing = entries.filter((e) => e.msgid && !e.msgstr);

  return { locale, missing, total: entries.length };
}

function main() {
  const locales = fs.readdirSync(LOCALES_DIR).filter((f) => {
    const stat = fs.statSync(path.join(LOCALES_DIR, f));
    return stat.isDirectory() && f !== SOURCE_LOCALE;
  });

  console.log('🌐 Checking translations...\n');

  let hasErrors = false;

  for (const locale of locales) {
    const result = checkLocale(locale);

    if (result.error) {
      hasErrors = true;
      continue;
    }

    const missingCount = result.missing.length;
    const totalCount = result.total;

    if (missingCount > 0) {
      hasErrors = true;
      console.log(`❌ ${locale}: ${missingCount}/${totalCount} translations missing`);
      console.log('   Missing translations:');
      result.missing.slice(0, 10).forEach((m) => {
        console.log(`   - "${m.msgid}"`);
      });
      if (result.missing.length > 10) {
        console.log(`   ... and ${result.missing.length - 10} more`);
      }
      console.log('');
    } else {
      console.log(`✅ ${locale}: All ${totalCount} translations present`);
    }
  }

  if (hasErrors) {
    console.log('\n💡 Run "pnpm intl:extract" to update .po files, then add missing translations.');
    process.exit(1);
  } else {
    console.log('\n✨ All translations are complete!');
    process.exit(0);
  }
}

main();
