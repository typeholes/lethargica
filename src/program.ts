// deno-lint-ignore-file no-explicit-any
interface Program<T, U> {
   <V>(fn: (state: U) => V): Program<T, V>;
   run: (a: T) => U;
   trace: (a: T) => unknown[];
   transitions: ((state: any) => unknown)[];
}

function Program<T>(): Program<T, T> {
   function transition<U>(fn: (state: T) => U) {
      transition.transitions = [...transition.transitions, fn];
      return transition as unknown as Program<T, U>;
   }

   transition.transitions = [] as ((state: any) => unknown)[];

   transition.run = (a: T) =>
      transition.transitions.reduce<unknown>((state, fn) => {
         console.log({ state });
         return fn(state);
      }, a) as T;

   transition.trace = (a: T) =>
      transition.transitions.reduce<unknown[]>(
         (states, fn) => {
            states.push(fn(states[states.length - 1]));
            return states;
         },
         [a]
      );

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
console.log('hmm', hmm.trace('helllllo'));
console.log('hmm', hmm.trace('help'));

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
   Program<[number, number]>(),
   Program<[number, number]>()(([n, acc]) => tuple(n - 1, acc * n))
);

function factorial_manual(n: number): number {
   const program = Program<[number, number]>()(([n, acc]) =>
      tuple(n - 1, acc * n)
   );
   const fact: () => Program<[number, number], number> = () =>
      cond(
         program,
         ([n]) => n > 0,
         Program<[number, number]>()((x) => fact().run(x)),
         Program<[number, number]>()(([_, acc]) => acc)
      );
   return fact().run(tuple(n, 1));
}

//         Program<[number, number]>()((x) => eager(fact())(x)),
function tuple<A, B>(a: A, b: B): [A, B] {
   return [a, b];
}

console.log(factorial.run(5));
