/**
 * 最小限のスキーマ検証
 *
 * 外部 API のレスポンスなど、型が保証されない入力を検証するための小さな実装。
 * 以前は zod を使っていたが、利用していたのは object / string / number /
 * boolean / array / nullable だけで、zod のメジャー移行コスト (v3 -> v4) に
 * 見合っていなかったため置き換えた。
 *
 * 使い方:
 *   const UserSchema = object({id: string(), name: string()});
 *   const user = UserSchema.parse(json);        // 不正なら ValidationError
 *   const users = UserSchema.array().parse(json);
 *   const maybe = UserSchema.nullable().parse(json);
 *
 * zod と同様、object は未知のフィールドを取り除く。
 */

/** 検証に失敗したことを表す。path は失敗した位置 (例: "data[0].id") */
export class ValidationError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(path ? `${path}: ${message}` : message);
    this.name = 'ValidationError';
    this.path = path;
  }
}

export interface Validator<T> {
  /** 検証して値を返す。不正なら ValidationError を投げる */
  parse(value: unknown, path?: string): T;
  /** この型の配列を検証する Validator を返す */
  array(): Validator<T[]>;
  /** null を許容する Validator を返す */
  nullable(): Validator<T | null>;
}

/** Validator から検証後の型を取り出す */
export type Infer<V> = V extends Validator<infer T> ? T : never;

/** エラーメッセージ用に値の種別を表す */
function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function createValidator<T>(
  parse: (value: unknown, path: string) => T,
): Validator<T> {
  const self: Validator<T> = {
    parse: (value, path = '') => parse(value, path),

    array: () =>
      createValidator<T[]>((value, path) => {
        if (!Array.isArray(value)) {
          throw new ValidationError(
            path,
            `expected array, got ${describeValue(value)}`,
          );
        }
        return value.map((item, index) => self.parse(item, `${path}[${index}]`));
      }),

    nullable: () =>
      createValidator<T | null>((value, path) =>
        value === null ? null : self.parse(value, path),
      ),
  };

  return self;
}

function primitive<T>(typeName: string): Validator<T> {
  return createValidator<T>((value, path) => {
    if (typeof value !== typeName) {
      throw new ValidationError(
        path,
        `expected ${typeName}, got ${describeValue(value)}`,
      );
    }
    return value as T;
  });
}

export const string = (): Validator<string> => primitive<string>('string');
export const boolean = (): Validator<boolean> => primitive<boolean>('boolean');

export const number = (): Validator<number> =>
  createValidator<number>((value, path) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new ValidationError(
        path,
        `expected number, got ${
          Number.isNaN(value) ? 'NaN' : describeValue(value)
        }`,
      );
    }
    return value;
  });

type Shape = Record<string, Validator<unknown>>;
type InferShape<S extends Shape> = {[K in keyof S]: Infer<S[K]>};

/** オブジェクトを検証する。未知のフィールドは取り除く */
export function object<S extends Shape>(shape: S): Validator<InferShape<S>> {
  const keys = Object.keys(shape);

  return createValidator<InferShape<S>>((value, path) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ValidationError(
        path,
        `expected object, got ${describeValue(value)}`,
      );
    }

    const input = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key of keys) {
      result[key] = shape[key].parse(
        input[key],
        path ? `${path}.${key}` : key,
      );
    }

    return result as InferShape<S>;
  });
}
