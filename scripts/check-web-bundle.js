#!/usr/bin/env node

/**
 * Web バンドルのスモークテスト
 *
 * `expo export --platform web` が成功しても、バンドルがブラウザで
 * 実行できるとは限らない。実際 SDK 57 移行時に、ビルドは通るのに
 * 起動時例外で画面が真っ白になる問題が発生した:
 *
 *   TypeError: (0 , e.createRequire) is not a function
 *
 * 原因は @supabase/supabase-js の ESM ビルド (Node 前提) が選ばれたこと。
 * Metro は import.meta.url を globalThis.__ExpoImportMetaRegistry.url に
 * 書き換えるため、バンドルを "import.meta" で grep しても検出できない。
 *
 * そのため「grep で確認」ではなく「実際に実行して確認」する。
 * jsdom 上でバンドルを評価し、
 *   - 起動時に例外 / console.error が出ないこと
 *   - #root に DOM が描画されること
 * を検証する。
 *
 * 使い方: pnpm check:web  (事前に expo export --platform web が必要)
 */

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const DIST = path.join(__dirname, '..', 'dist');
const BUNDLE_DIR = path.join(DIST, '_expo/static/js/web');
const BOOT_TIMEOUT_MS = 15000;

function fail(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(DIST)) {
  fail('dist/ がありません。先に `expo export --platform web` を実行してください。');
}

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const bundles = fs.readdirSync(BUNDLE_DIR).filter((f) => f.endsWith('.js'));
if (bundles.length === 0) {
  fail(`${BUNDLE_DIR} に JS バンドルがありません。`);
}

/**
 * jsdom が実装していないブラウザ API を補う。
 * ここで補うのは「実ブラウザには存在するが jsdom に無い」ものだけ。
 * アプリ側の不具合を隠さないよう、最小限にとどめる。
 */
function installBrowserStubs(window) {
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  for (const name of ['ResizeObserver', 'IntersectionObserver']) {
    if (!window[name]) {
      window[name] = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
  }

  // jsdom は CSSFontFaceRule を公開していない。
  // expo-font の web 実装が `rule instanceof CSSFontFaceRule` を使う。
  if (!window.CSSFontFaceRule) {
    window.CSSFontFaceRule = class CSSFontFaceRule {};
  }

  if (!window.scrollTo) {
    window.scrollTo = () => {};
  }

  // Supabase などがネットワークを叩いても検証を止めない
  if (!window.fetch) {
    window.fetch = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      });
  }
}

async function run() {
  const errors = [];
  const virtualConsole = new VirtualConsole();

  virtualConsole.on('error', (...args) => {
    errors.push(args.map(String).join(' '));
  });
  virtualConsole.on('jsdomError', (e) => {
    errors.push(e.stack || e.message);
  });

  // React のコミットフェーズなど、eval の try/catch の外で投げられる例外も拾う
  process.on('uncaughtException', (e) => {
    errors.push(e && e.stack ? e.stack : String(e));
  });
  process.on('unhandledRejection', (e) => {
    errors.push(e && e.stack ? e.stack : String(e));
  });

  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    virtualConsole,
  });

  installBrowserStubs(dom.window);

  for (const file of bundles) {
    const code = fs.readFileSync(path.join(BUNDLE_DIR, file), 'utf8');
    try {
      dom.window.eval(code);
    } catch (e) {
      errors.push(`[${file}] ${e && e.stack ? e.stack : String(e)}`);
    }
  }

  // React のマウントを待つ
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  const root = () => dom.window.document.getElementById('root');
  while (Date.now() < deadline) {
    if (errors.length > 0) break;
    if (root() && root().innerHTML.trim() !== '') break;
    await new Promise((r) => setTimeout(r, 100));
  }

  if (errors.length > 0) {
    fail(
      `Web バンドルの起動でエラーが発生しました:\n\n${errors.join('\n---\n')}`
    );
  }

  const rendered = root() ? root().innerHTML.trim() : '';
  if (rendered === '') {
    fail(
      '#root に何も描画されませんでした (画面が真っ白になる状態)。\n' +
        'エラーは出ていないため、マウント処理が走っていない可能性があります。'
    );
  }

  console.log('✅ Web バンドルはエラーなく起動し、#root に描画されました');
  console.log(`   bundle: ${bundles.join(', ')}`);
  console.log(`   rendered: ${rendered.length} bytes of DOM`);
  process.exit(0);
}

run().catch((e) => fail(String(e && e.stack ? e.stack : e)));
