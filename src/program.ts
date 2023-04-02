// deno-lint-ignore-file no-explicit-any

const ProgramFinished = Symbol('ProgramFinished');
type ProgramFinished = typeof ProgramFinished;
const ProgramCalled = Symbol('ProgramCalled');
type ProgramCalled = typeof ProgramCalled;

type StepResult = ProgramFinished | ProgramCalled | unknown;

   const $ = lift;

   function $$<T,U>(p: () => Program<T, U> | Program<T,U>): Program<T, U> {
     if (p.hasOwnProperty('transitions')) { return lift(() => call(p)) as never };
     return  lift(call(p));
   }

   function $_<T,U>(p: () => Program<T, U> ) : { (state: T): U; isCall: true }; 
   function $_<T,U>(p: Program<T, U> ) : { (state: T): U; isCall: true }; 
   function $_<T,U>(p: (() => Program<T, U>) | Program<T,U>) : { (state: T): U; isCall: true } {
     if (p.hasOwnProperty('transitions')) { return call(() => (p as Program<T,U>)) }
     return  call(p as () => Program<T, U>);
   }

function cond<A, B, C, D, E, F>(
   f: Program<A, B>,
   pred: (b: B) => boolean,
   onTrue: Program<B, C>,
   onFalse: Program<B, D>
): Program<A, E | F> {
   const program = Program<A>();
   program.transitions = [
      ...f.transitions,
      (b: B) => (pred(b) ? onTrue.run(b) : onFalse.run(b)),
   ];
   return program as unknown as Program<A, E | F>;
}

interface Program<T, U> {
   <V>(fn: (state: U) => V): Program<T, V>;
   step: () => StepResult;
   run: (a: T, effect?: (x: unknown) => void) => U;
   trace: (a: T) => unknown[];
   transitions: ((state: any) => unknown)[];
   currentState: StepResult;
   transitionIdx: number;
   if: <C, D>(
      pred: (b: U) => boolean,
      onTrue: Program<U, C>,
      onFalse: Program<U, D>
   ) => Program<T, C | D>;
}

function call<T, U>(p: () => Program<T, U>) {
   function makeCall() {
      return p();
   }
   makeCall.isCall = true as const;
   return makeCall as unknown as { (state: T): U; isCall: true };
}

function lift<T, U>(fn: (state: T) => U) {
   return Program<T>()(fn);
}

lift((x: number) => x + 1);

function Program<T>(): Program<T, T> {
   function transition<U>(fn: (state: T) => U) {
      transition.transitions = [...transition.transitions, fn];
      return transition as unknown as Program<T, U>;
   }

   transition.transitions = [] as ((state: any) => unknown)[];
   transition.currentState = ProgramFinished as StepResult;
   transition.transitionIdx = -1;

   // @ts-ignore
   transition.if = <C, D>(
      pred: (b: T) => boolean,
      onTrue: Program<T, C>,
      onFalse: Program<T, D>
   ) => cond(transition, pred, onTrue, onFalse) as unknown as Program<T, C | D>;
   transition.step = () => {
      transition.transitionIdx++;
      const fn = transition.transitions[transition.transitionIdx];
      if (fn === undefined) {
         return ProgramFinished;
      }
      if (fn.hasOwnProperty('isCall')) {
         const called = (fn as any)();
         transition.transitions.push(...called.transitions);
         return ProgramCalled;
      }
      return fn(transition.currentState);
   };

   transition.run = (a: T, effect?: (x: unknown) => void) => {
      transition.currentState = a;
      while (true) {
         if (effect) {
            effect(transition.currentState);
         }
         const result = transition.step();
         if (result === ProgramFinished) {
            return transition.currentState as T;
         }
         if (result !== ProgramCalled) {
            transition.currentState = result;
         }
      }
   };

   transition.trace = (a: T) => {
      const states: unknown[] = [];
      transition.run(a, (x) => states.push(x));
      return states;
   };

   return transition;
}

function compose<A, B, C>(f: Program<A, B>, g: Program<B, C>): Program<A, C> {
   const program = Program<A>();
   program.transitions = [...f.transitions, ...g.transitions];
   return program as unknown as Program<A, C>;
}

function eager<A, B>(p: Program<A, B>): (a: A) => B {
   return (a) => p.run(a);
}

/*
const program = Program<number>()((state) => state + 1)((state) => state + 3)(
   (state) => state.toString()
);
console.log(program.run(77));
const program2 = Program<string>()((s) => s.length);
console.log(program2.run('hello'));
const composed = compose(program, program2);
console.log(composed.trace(1234567));

const d = program2(() => new Date());
      */

type NoInfer<T> = [T][T extends T ? 0 : never];

const id = <T>(a: T) => a;
const plus =
   <T extends number>(a: NoInfer<T>) =>
   (b: T) =>
      a + b;
const at =
   <T, K extends keyof T>(k: K) =>
   (t: T) =>
      t[k];

const fst = <T>([a]: [T]) => a;
const snd = <T>([, b]: [any, T]) => b;

/// junk below here
const program = Program<number>()(plus(1))(plus(3))(String);
// console.log(program.run(77));
const program2 = Program<string>()(at('length'));
// console.log(program2.run('hello'));
const composed = compose(program, program2);
// console.log(composed.trace(1234567));

const hmm = cond(
   program2,
   (l) => l < 5,
   Program<number>()(plus(1)),
   Program<number>()(() => 'too big')
);
// console.log('hmm', hmm.trace('helllllo'));
// console.log('hmm', hmm.trace('help'));

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

function factorial_logged(n: number): number {
   const $ = lift;
   const fact: () => Program<[number, number], number> = () =>
      cond(
         $(([n, acc]) => tuple(n - 1, acc * n)),
         ([n]) => n > 0,
         $(call(fact)),
         $(snd)
      );
   return fact().run(tuple(n, 1), (x) => console.log(x));
}

//         Program<[number, number]>()((x) => eager(fact())(x)),
function tuple<A, B>(a: A, b: B): [A, B] {
   return [a, b];
}

// console.log(factorial.trace(5));

// const foo = Program<number>()(call(() => program))(call(() => program2));
// console.log(foo.trace(1234));

factorial_logged(5);

{
   type $ = Program<number, number>;
   const up: ()=>$ = () => $(plus(1)).if( (n) => n > 0, down, $(id));
   const down =  $(plus(-2))( $_( up ));

   down.run(10, (x) => console.log({ x }));
}

const foo = lift((a: number) => a + 1).if(
   (a) => a > 0,
   lift((a: number) => a + 1),
   lift((a: number) => a + 2)
);

const fact: () => Program<[number, number], number> = () => {
   return $
   (([n, acc]: [number, number]) => tuple(n - 1, acc * n)).
   if(
      ([n]) => n > 0,
      $$(fact),
      $(snd)
   );
};
