import { assertEquals } from 'https://deno.land/std@0.182.0/testing/asserts.ts';
import {
   $,
   id,
   plus,
   times,
   $_,
   Program,
   call,
   cond,
   snd,
   tuple,
   $$,
   compose,
awaitTimeout,
fact,
} from './program.ts';



Deno.test('id number', () => {
   assertEquals($(id).run(3), 3);
});

Deno.test('id string', () => {
   assertEquals($(id).run('s'), 's');
});

Deno.test('id array', () => {
   assertEquals($(id).run([1, 2, 3]), [1, 2, 3]);
});

Deno.test('id object', () => {
   assertEquals($(id).run({ a: 1, b: 2 }), { a: 1, b: 2 });
});

Deno.test('id function', () => {
   assertEquals($(id).run(id) === id, true);
});

Deno.test('id function ap', () => {
   const x = $((f: (a: number) => number) => f(3));
   assertEquals(x.run(plus(1)), 4);
});

Deno.test('call', () => {
   const direct = $(plus(1))(times(5));
   const indirect = $(plus(1))($_($(times(5))));
   assertEquals(direct.run(3), indirect.run(3));
});

function factorial(n: number, effect: (x: unknown) => void = id): number {
   const fact: () => Program<[number, number], number> = () =>
      cond(
         $(([n, acc]) => tuple(n - 1, acc * n)),
         ([n]) => n > 0,
         $(call(fact)),
         $(snd)
      );
   return fact().run(tuple(n, 1), effect);
}

Deno.test('factorial', () => {
   assertEquals(factorial(1), 1);
   assertEquals(factorial(2), 2);
   assertEquals(factorial(3), 6);
   assertEquals(factorial(4), 24);
   assertEquals(factorial(5), 120);
   assertEquals(factorial(6), 720);
});

function dedup<T>(xs: T[]): T[] {
   return xs.reduce((acc, x) => {
      if (acc[acc.length - 1] !== x) {
         acc.push(x);
      }
      return acc;
   }, [] as T[]);
}

Deno.test('factorial trace', () => {
   const trace: any[] = [];
   factorial(5, (x) => trace.push(x));
   assertEquals(dedup(trace), [
      [5, 1],
      [4, 5],
      [3, 20],
      [2, 60],
      [1, 120],
      [0, 120],
      120,
   ]);
});

Deno.test('fact async', async () => {
   const result = await fact().runAsync( [5,1], () => awaitTimeout(10), (x) => {})
   assertEquals(result, 120 );
});

Deno.test('fact trace async', async () => {
   const trace: any[] = [];
   const result = await fact().runAsync( [5,1], () => awaitTimeout(10), (x) => trace.push(x));
   assertEquals(dedup(trace), [
      [5, 1],
      [4, 5],
      [3, 20],
      [2, 60],
      [1, 120],
      [0, 120],
      120,
   ]);
});

{
   type $ = Program<number, number>;
   const up: () => $ = () => $(plus(1)).if((n) => n > 0, down, $(id));
   const down = $(plus(-3))($_(up));
   const isEven = $( (n: number) => n < 0) .o (up());

   const isEvener = Program<number>()($_(up))((n) => n < 0);


   Deno.test('mutual recursion', () => {
      for (let i = 2; i < 10; i++) {
         assertEquals(up().run(i), -1 + (i % 2), `isEven(${i})`);
      }
   });

   Deno.test('isEven', () => {
      for (let i = 1; i < 10; i++) {
         assertEquals(
            isEven.run(i),
            i % 2 === 0,
            `isEven(${i} ${isEven.run(i)} ${i % 2 === 0})`
         );
      }
   });

   const composedIsEven = compose(
      up(),
      $((n) => n < 0)
   );

   Deno.test('composed isEven', () => {
      for (let i = 1; i < 10; i++) {
         assertEquals(
            composedIsEven.run(i),
            i % 2 === 0,
            `isEven(${i} ${isEven.run(i)} ${i % 2 === 0})`
         );
      }
   });
}
