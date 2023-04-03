# Lethargica

An embedded DSL for describing programs in an FP style and executing them with effects, including async effects.

Note that programs will execute fairly slowly and there will be memory overhead for the instructions. This is not intended for anything needing high performance.

---

Use cases

-  Providing visualization of program execution
-  Reference implementations to test against optimized implementations
-  People so enamored with FP that they don't mind a few orders of magnitiude of performance degredation.

---

A program is modeled as a series of state transitions `(s: CurrentState) => NewState`.
The easiest way to create a program is to "lift" a lambda

```ts
const id = <T>(x: T) => T;
const idP = $(id);
//    ^? idP: ProgramI<unknown,unknown>
```

A program can be run with an optional effect for each step of the computation or runAsync the waits for a given promise and executes an effect for each step

```ts
idP.run(5);
/// simply returns 5;

idP.run(5, console.log);
// returns 5 and also logs 5 to the console

idP.runAsync(5, () => awaitTimeout(1000), console.log);
// waits for 1 second then logs 5 to the console and returns 5
```

This would be much more useful on programs with more than one transition. We can create a program with a sequence of transitions simply by listing lambdas after the program

```ts
const inc5x = $(id)((x) => x + 1)((x) => x * 5);
```

Note that the parenthesis are necessary. Programs are actually functions that take a transition and push in onto the program's transition list.

You can combine programs with combinators. Some are used often enough that we have combinator methods on Programs for convenience

```ts
compose(inc5x, inc5x);
inc5x.o(inc5x);
```

Again, the parenthesis are nescessary since this is just a method invocation. We are just using spacing to make it look like an infix composition operator.

conditional evaluation is provided by the `cond` combinator or the `.if` method

```ts
const doubleButOnlyUpToTen = $
(id).
if( (x) => x > 5),
    $(() => "We can't go over 10"),
    $((x) => x * 2);
```

Hopefully you've gotten used to the spacing abuse by now.

We also need to be able to call programs. The `call` function takes a program and returns a special lambda so we can just includes calls in the transition list as usual. For convenience `call` will also evaluate a `() => Program` and has an alias of `$_`. These are all equivalent

```ts
idP (call(idP))
idP (call(()=>id{}))
idP ($_(idP))
idP ($_(()=>idP))
```

The eager nature of call makes it easy to express recursive functions

```ts
const forever = () => idP($_(forever));
```

Mandatory factorial example
```ts
export const fact: () => ProgramI<[number, number], number> = () => {
   return $(([n, acc]: [number, number]) => tuple(n - 1, acc * n)).if(
      ([n]) => n > 0,
      $$(fact),
      $(snd)
   );
};

const factorial = fact() .o ($(x => [x,1]));

factorial.runAsync(5, () => awaitTimeout(1000), console.log);
// very slowly logs
    //   [5, 1]
    //   [4, 5]
    //   [3, 20]
    //   [2, 60]
    //   [1, 120]
    //   [0, 120]
    //   120
```

And a truly awful implementation of `isEven` to demonstrate mutual recursion
```ts
const up: () => ProgramI<number,number> = () => $
    (plus(1)).
    if((n) => n > 0, down, $(id));
const down = $(plus(-3)) ($_(up));
const isEven = $((n: number) => n < 0) .o (up());
```
