export type { ProgramI, StepResult };
export { ProgramCalled, ProgramFinished };

const ProgramFinished = Symbol('ProgramFinished');
type ProgramFinished = typeof ProgramFinished;
const ProgramCalled = Symbol('ProgramCalled');
type ProgramCalled = typeof ProgramCalled;

type StepResult = ProgramFinished | ProgramCalled | unknown;

interface ProgramI<T, U> {
   <V>(fn: (state: U) => V): ProgramI<T, V>;
   run: (a: T, effect?: (x: unknown) => void) => U;
   runAsync: (
      a: T,
      waitFor: () => PromiseLike<unknown>,
      effect: (x: unknown) => void
   ) => Promise<U>;
   trace: (a: T) => unknown[];
   transitions: ((state: any) => unknown)[];
   if: <C, D>(
      pred: (b: U) => boolean,
      onTrue: ProgramI<U, C>,
      onFalse: ProgramI<U, D>
   ) => ProgramI<T, C | D>;
   o: <V>(p: ProgramI<V, T>) => ProgramI<V, U>;
}
