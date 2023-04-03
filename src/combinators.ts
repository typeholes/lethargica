import { id, snd, times, tuple } from './fns.ts';
import { cond, compose, Program, $$, $_, ProgramI } from './program.ts';
export { cond, compose };
import { $ } from './program.ts';

function traverse<U, V, A>(
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

const reverse = <T, U>(p: ProgramI<T, U[]>) =>
   traverse<U[], U[], U>(
      (x) => [x.slice(1), x[0]],
      (xs, x) => [x, ...xs],
      (xs) => xs.length > 0,
      []
   ).o(p);

function map<S, T, U>(
   fn: (x: T) => U,
   p: ProgramI<S[], T[]>
): ProgramI<S[], U[]> {
   return traverse<T[], U[], T>(
      (xs) => [xs.slice(1), xs[0]],
      (ys, x) => [...ys, fn(x)],
      (xs) => xs.length > 0,
      []
   ).o(p);
}

map(times(2), Program<number[]>()).run([1, 2, 3], console.log);
