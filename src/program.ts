// deno-lint-ignore-file no-explicit-any

import { replaceState, restoreState, tuple } from './fns.ts';
import {
   ProgramI,
   ProgramCalled,
   ProgramFinished,
   StepResult,
   Call,
} from './program.types.ts';

export type { ProgramI, Call };

export const $ = lift;

export function $$<T, U>(
   p: () => ProgramI<T, U> | ProgramI<T, U>
): ProgramI<T, U> {
   if (p.hasOwnProperty('transitions')) {
      return lift(() => call(p)) as never;
   }
   return lift(call(p));
}

// might want to deprecate this
export function $_<T, U>(
   p: () => ProgramI<T, U>
): { (state: T): U; isCall: true };
export function $_<T, U>(p: ProgramI<T, U>): { (state: T): U; isCall: true };
export function $_<T, U>(
   p: (() => ProgramI<T, U>) | ProgramI<T, U>
): { (state: T): U; isCall: true } {
   if (p.hasOwnProperty('transitions')) {
      return call(() => p as ProgramI<T, U>);
   }
   return call(p as () => ProgramI<T, U>);
}

export function cond<A, B, C, D, E, F>(
   f: ProgramI<A, B>,
   pred: (b: B) => boolean,
   onTrue: ProgramI<B, C>,
   onFalse: ProgramI<B, D>
): ProgramI<A, E | F> {
   const program = Program<A>();
   program.transitions = [
      ...f.transitions,
      (b: B) => (pred(b) ? call(() => onTrue) : call(() => onFalse)),
   ];
   return program as unknown as ProgramI<A, E | F>;
}

export function call<T, U, B>(
   p: () => ProgramI<T, U>,
   mergeStates: (t: T, u: U) => B
): Call<T, U, B>;
export function call<T, U>(p: () => ProgramI<T, U>): Call<T, U, U>;

export function call<T, U, B>(
   p: () => ProgramI<T, U>,
   mergeStates: (t: T, u: U) => B = (_, u) => u as unknown as B
): Call<T, U, B> {
   function makeCall() {
      return p();
   }
   makeCall.isCall = true as const;
   makeCall.mergeStates = mergeStates;

   return makeCall as unknown as Call<T, U, B>;
}

export function lift<T, U>(fn: (state: T) => U) {
   return Program<T>()(fn);
}

export function Program<T>(): ProgramI<T, T> {
   function transition<U>(fn: (state: T) => U) {
      transition.transitions = [...transition.transitions, fn];
      return transition as unknown as ProgramI<T, U>;
   }

   transition.transitions = [] as ((state: any) => unknown)[];

   // @ts-ignore just let the Program interface determine the type
   transition.if = <C, D>(
      pred: (b: T) => boolean,
      onTrue: ProgramI<T, C>,
      onFalse: ProgramI<T, D>
   ) =>
      cond(transition, pred, onTrue, onFalse) as unknown as ProgramI<T, C | D>;

   transition.o = <V>(p: ProgramI<V, T>) => {
      transition.transitions.unshift(...p.transitions);
      return transition as unknown as ProgramI<V, T>;
   };

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
      if (fn.hasOwnProperty('isCall') && fn.hasOwnProperty('mergeStates')) {
         const called = (fn as any)();
         const holdState = scope.currentState;
         scope.transitions.splice(
            scope.transitionIdx + 1,
            0,
            ...[
               ...called.transitions,
               (x: any) => ((fn as any).mergeStates as any)(holdState, x),
            ]
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
   f: ProgramI<A, B>,
   g: ProgramI<B, C>
): ProgramI<A, C> {
   const program = Program<A>();
   program.transitions = [...f.transitions, ...g.transitions];
   return program as unknown as ProgramI<A, C>;
}

function eager<A, B>(p: ProgramI<A, B>): (a: A) => B {
   return (a) => p.run(a);
}

export const awaitTimeout = (delay: number) =>
   new Promise((resolve) => setTimeout(resolve, delay));

export function callWith<T, U, S>(
   withState: (t: T) => S,
   p: () => ProgramI<S, U>
): Call<T, U, T> {
   function makeCall() {
      return p();
   }
   makeCall.isCall = true as const;
   makeCall.mergeStates = replaceState;

   const callProgram =  makeCall as unknown as Call<S, U, U>;
   const stateCall = $(withState) (callProgram);
   return call( () => stateCall, restoreState);
}
