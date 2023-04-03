import { NoInfer } from './utilityTypes.ts';

export const id = <T>(a: T) => a;
export const times =
   <T extends number>(a: NoInfer<T>) =>
   (b: T) =>
      a * b;
export const plus =
   <T extends number>(a: NoInfer<T>) =>
   (b: T) =>
      a + b;
export const at =
   <T, K extends keyof T>(k: K) =>
   (t: T) =>
      t[k];

export const fst = <T>([a]: [T]) => a;
export const snd = <T>([, b]: [any, T]) => b;

export function tuple<A, B>(a: A, b: B): [A, B] {
   return [a, b];
}
