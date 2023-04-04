import { id, plus, snd, times, tuple } from './fns.ts';
import { cond, compose, Program, $$, $_, ProgramI } from './program.ts';
export { cond, compose };
import { $ } from './program.ts';

export function traverse<U, V, A>(
   shrink: (x: U) => [U, A],
   expand: (x: V, a: A) => V,
   isEmpty: (x: U) => boolean,
   empty: V
): ProgramI<U, V> {
   type US = [U, V];
   const _traverse: () => ProgramI<US, V> = () =>
      $(([xs, acc]: US) => {
         const [newXs, a] = shrink(xs);
         const newAcc = expand(acc, a);
         return tuple(newXs, newAcc);
      }).if(([xs]: US) => isEmpty(xs), $$(_traverse), $(snd));

   const prog = _traverse().o($((x: U) => tuple(x, empty)));
   return prog;
}

export const reverse = <U>() =>
   traverse<U[], U[], U>(
      (x) => [x.slice(1), x[0]],
      (xs, x) => [x, ...xs],
      (xs) => xs.length > 0,
      []
   );

export function map<T, U>(fn: (x: T) => U): ProgramI<T[], U[]> {
   return traverse<T[], U[], T>(
      (xs) => [xs.slice(1), xs[0]],
      (ys, x) => [...ys, fn(x)],
      (xs) => xs.length > 0,
      []
   );
}

export function fold<T, U>(fn: (a: U, b: T) => U, zero: U): ProgramI<T[], U> {
   return traverse<T[], U, T>(
      (xs) => [xs.slice(1), xs[0]],
      (y, x) => fn(y, x),
      (xs) => xs.length > 0,
      zero
   );
}

export const mConcat = fold as <T>(fn: (a: T, b: T) => T, zero: T) => ProgramI<T[], T>;

//map(times(2)) .o ( Program<number[]>()).run([1, 2, 3], console.log);
//Program<number[]>() ($_(map(times(2)))).run([1, 2, 3], console.log);

mConcat((a, b ) => a + b, 0)
   .o(Program<number[]>())
   .run([1, 2, 3,5], console.log);