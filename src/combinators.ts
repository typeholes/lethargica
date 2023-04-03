import { tuple } from "./fns.ts";
import { cond, compose, ProgramI, Program } from "./program.ts";
export { cond, compose };


export function induction<T, ACC>(
   initialValue: ACC,
   discriminant: (a: T) => boolean,
   baseCase: ProgramI<[T, ACC], [T, ACC]>,
   recursiveCase: ProgramI<[T, ACC], [T, ACC]>
): ProgramI<T, ACC> {
   const induce: () => ProgramI<[T, ACC], ACC> = () =>
      cond(
         recursiveCase,
         ([t, acc]) => discriminant(t),
         Program<[T, ACC]>()((x) => induce().run(x)),
         baseCase
      );
   return Program<T>()((t) => tuple(t, initialValue))((x) => induce().run(x));
}