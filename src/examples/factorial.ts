import { induction } from "../combinators.ts";
import { tuple } from "../fns.ts";
import { Program, } from '../program.ts';

const factorial = induction(
   1,
   (n: number) => n > 0,
   Program(),
   Program<[number, number]>()(([n, acc]) => tuple(n - 1, acc * n))
);
