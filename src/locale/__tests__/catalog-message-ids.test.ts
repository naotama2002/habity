import fs from 'fs';
import path from 'path';
import { msg } from '@lingui/core/macro';

/**
 * マクロが生成するメッセージ ID と、コンパイル済みカタログのキーが
 * 一致していることを検証する。
 *
 * この 2 つは別々の仕組みで生成される:
 * - ID: babel の @lingui/babel-plugin-lingui-macro (ビルド時)
 * - キー: @lingui/cli の `lingui compile` (intl:compile)
 *
 * lingui のバージョンや設定がずれると ID の生成規則が変わり
 * (例: v6 で URL-safe Base64 に変更)、実行時に翻訳が引けなくなる。
 * 型エラーにもビルドエラーにもならないため、ここで明示的に検証する。
 *
 * このファイル中の msg`...` は babel-jest が実際のビルドと同じ
 * babel.config.js で展開するため、本番と同じ ID が得られる。
 */

const LOCALES_DIR = path.resolve(__dirname, '../locales');
const LOCALES = ['en', 'ja'];

/** コンパイル済みカタログ (messages.mjs) を読み込む */
function loadCompiledCatalog(locale: string): Record<string, string[]> {
  const source = fs.readFileSync(
    path.join(LOCALES_DIR, locale, 'messages.mjs'),
    'utf8'
  );
  const match = source.match(/JSON\.parse\((".*")\)/s);
  if (!match) {
    throw new Error(
      `Could not parse compiled catalog for "${locale}". Run \`pnpm intl:compile\`.`
    );
  }
  return JSON.parse(JSON.parse(match[1]));
}

/** マクロが展開されて得られる ID を取り出す */
function idOf(descriptor: unknown): string {
  expect(descriptor).toMatchObject({ id: expect.any(String) });
  return (descriptor as { id: string }).id;
}

describe('compiled message catalogs', () => {
  it.each(LOCALES)('%s catalog is non-empty', (locale) => {
    expect(Object.keys(loadCompiledCatalog(locale)).length).toBeGreaterThan(0);
  });

  it('en and ja catalogs contain exactly the same message IDs', () => {
    const en = Object.keys(loadCompiledCatalog('en')).sort();
    const ja = Object.keys(loadCompiledCatalog('ja')).sort();

    expect(ja).toEqual(en);
  });

  it('macro-generated IDs exist in every compiled catalog', () => {
    const ids = [
      idOf(msg`← Back`),
      idOf(msg`Sign Out`),
      idOf(msg`{streak} days`),
    ];

    for (const locale of LOCALES) {
      const catalogIds = Object.keys(loadCompiledCatalog(locale));
      for (const id of ids) {
        expect(catalogIds).toContain(id);
      }
    }
  });

  it('resolves macro-generated IDs to the Japanese translations', () => {
    const ja = loadCompiledCatalog('ja');

    expect(ja[idOf(msg`← Back`)]).toEqual(['← 戻る']);
    expect(ja[idOf(msg`Sign Out`)]).toEqual(['ログアウト']);
  });

  it('interpolated messages compile to placeholder-aware entries', () => {
    const en = loadCompiledCatalog('en');

    expect(en[idOf(msg`{streak} days`)]).toEqual([['streak'], ' days']);
  });

  it('uses URL-safe Base64 IDs (lingui v6 format)', () => {
    const ids = Object.keys(loadCompiledCatalog('en'));

    expect(ids.some((id) => id.includes('-') || id.includes('_'))).toBe(true);
    expect(ids.filter((id) => id.includes('+') || id.includes('/'))).toEqual(
      []
    );
  });
});
