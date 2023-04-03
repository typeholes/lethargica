// deno-lint-ignore-file no-explicit-any

export const ProgramFinished = Symbol('ProgramFinished');
export type ProgramFinished = typeof ProgramFinished;
export const ProgramCalled = Symbol('ProgramCalled');
export type ProgramCalled = typeof ProgramCalled;

export type StepResult = ProgramFinished | ProgramCalled | unknown;

export const $ = lift;

export function $$<T, U>(
   p: () => Program<T, U> | Program<T, U>
): Program<T, U> {
   if (p.hasOwnProperty('transitions')) {
      return lift(() => call(p)) as never;
   }
   return lift(call(p));
}

export function $_<T, U>(
   p: () => Program<T, U>
): { (state: T): U; isCall: true };
export function $_<T, U>(p: Program<T, U>): { (state: T): U; isCall: true };
export function $_<T, U>(
   p: (() => Program<T, U>) | Program<T, U>
): { (state: T): U; isCall: true } {
   if (p.hasOwnProperty('transitions')) {
      return call(() => p as Program<T, U>);
   }
   return call(p as () => Program<T, U>);
}

export function cond<A, B, C, D, E, F>(
   f: Program<A, B>,
   pred: (b: B) => boolean,
   onTrue: Program<B, C>,
   onFalse: Program<B, D>
): Program<A, E | F> {
   const program = Program<A>();
   program.transitions = [
      ...f.transitions,
      (b: B) => (pred(b) ? call(() => onTrue) : call(() => onFalse)),
   ];
   return program as unknown as Program<A, E | F>;
}

export interface Program<T, U> {
   <V>(fn: (state: U) => V): Program<T, V>;
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
      onTrue: Program<U, C>,
      onFalse: Program<U, D>
   ) => Program<T, C | D>;
}

export function call<T, U>(p: () => Program<T, U>) {
   function makeCall() {
      return p();
   }
   makeCall.isCall = true as const;
   return makeCall as unknown as { (state: T): U; isCall: true };
}

export function lift<T, U>(fn: (state: T) => U) {
   return Program<T>()(fn);
}

export function Program<T>(): Program<T, T> {
   function transition<U>(fn: (state: T) => U) {
      transition.transitions = [...transition.transitions, fn];
      return transition as unknown as Program<T, U>;
   }

   transition.transitions = [] as ((state: any) => unknown)[];

   // @ts-ignore just let the Program interface determine the type
   transition.if = <C, D>(
      pred: (b: T) => boolean,
      onTrue: Program<T, C>,
      onFalse: Program<T, D>
   ) => cond(transition, pred, onTrue, onFalse) as unknown as Program<T, C | D>;

   transition.run = (a: T, effect?: (x: unknown) => void) => {
      const scope = {
         transitionIdx: -1,
         transitions: [...transition.transitions],
         currentState: a,
      };

      while (true) {
         if (effect) {
            effect(scope.currentState);
         }
         const result = step(scope);
         if (result === ProgramFinished) {
            return scope.currentState as T;
         }
         if (result !== ProgramCalled) {
            scope.currentState = result as T;
         }
      }
   };

   transition.runAsync = async (
      a: T,
      waitFor: () => PromiseLike<unknown>,
      effect: (x: unknown) => void
   ) => {
      // return currentState as T;
      let cont = true;
      const scope = {
         transitionIdx: -1,
         transitions: [...transition.transitions],
         currentState: a,
      };
      let result = ProgramCalled as StepResult;
      while (cont) {
         await waitFor().then(() => {
            effect(scope.currentState);
            result = step(scope);
            if (result === ProgramFinished) {
               cont = false;
            } else if (result !== ProgramCalled) {
               scope.currentState = result as T;
            }
         });
      }
      return scope.currentState;
   };

   function step(scope: {
      transitionIdx: number;
      transitions: ((state: any) => unknown)[];
      currentState: T;
   }) {
      scope.transitionIdx++;
      const fn = scope.transitions[scope.transitionIdx];
      if (fn === undefined) {
         return ProgramFinished;
      }
      if (fn.hasOwnProperty('isCall')) {
         const called = (fn as any)();
         scope.transitions.splice(
            scope.transitionIdx + 1,
            0,
            ...called.transitions
         );
         return ProgramCalled;
      }
      const result = fn(scope.currentState);
      if (typeof result === 'function' && result.hasOwnProperty('isCall')) {
         const called = (result as any)();
         scope.transitions.splice(
            scope.transitionIdx + 1,
            0,
            ...called.transitions
         );
         return ProgramCalled;
      }

      return result;
   }

   transition.trace = (a: T) => {
      const states: unknown[] = [];
      transition.run(a, (x) => states.push(x));
      return states;
   };

   return transition;
}

export function compose<A, B, C>(
   f: Program<A, B>,
   g: Program<B, C>
): Program<A, C> {
   const program = Program<A>();
   program.transitions = [...f.transitions, ...g.transitions];
   return program as unknown as Program<A, C>;
}

function eager<A, B>(p: Program<A, B>): (a: A) => B {
   return (a) => p.run(a);
}

export type NoInfer<T> = [T][T extends T ? 0 : never];

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

function induction<T, ACC>(
   initialValue: ACC,
   discriminant: (a: T) => boolean,
   baseCase: Program<[T, ACC], [T, ACC]>,
   recursiveCase: Program<[T, ACC], [T, ACC]>
): Program<T, ACC> {
   const induce: () => Program<[T, ACC], ACC> = () =>
      cond(
         recursiveCase,
         ([t, acc]) => discriminant(t),
         Program<[T, ACC]>()((x) => induce().run(x)),
         baseCase
      );
   return Program<T>()((t) => tuple(t, initialValue))((x) => induce().run(x));
}

const factorial = induction(
   1,
   (n: number) => n > 0,
   Program(),
   Program<[number, number]>()(([n, acc]) => tuple(n - 1, acc * n))
);

//         Program<[number, number]>()((x) => eager(fact())(x)),
export function tuple<A, B>(a: A, b: B): [A, B] {
   return [a, b];
}

// console.log(factorial.trace(5));

// const foo = Program<number>()(call(() => program))(call(() => program2));
// console.log(foo.trace(1234));

//factorial_logged(5);

const foo = lift((a: number) => a + 1).if(
   (a) => a > 0,
   lift((a: number) => a + 1),
   lift((a: number) => a + 2)
);

export const fact: () => Program<[number, number], number> = () => {
   return $(([n, acc]: [number, number]) => tuple(n - 1, acc * n)).if(
      ([n]) => n > 0,
      $$(fact),
      $(snd)
   );
};

export const awaitTimeout = (delay: number) =>
   new Promise((resolve) => setTimeout(resolve, delay));

//fact().runAsync([5, 1], () => awaitTimeout(1000), console.log);

    let trace = [] as any[];
    let result = await fact().runAsync([5, 1], () => awaitTimeout(1000), (x) => trace.push(x));
    console.log('waited', result, trace)
