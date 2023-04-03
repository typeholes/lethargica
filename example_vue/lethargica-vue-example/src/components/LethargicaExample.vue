<script setup lang="ts">
import { $, $$, awaitTimeout, type ProgramI } from 'lethargica'
import { snd } from 'lethargica/fns';


import { reactive } from 'vue'

function tuple<T, U>(t: T, u: U): [T, U] {
  return [t, u]
}

const fact: () => ProgramI<[number, number], number> = () => {
  return $(([n, acc]: [number, number]) => tuple(n - 1, acc * n)).if(
    ([n]: [number, number]) => n > 0,
    $$(fact),
    $(snd)
  )
}

const state = reactive({
  trace: [] as any[]
})

const factorial = fact().o($((x: number) => [x, 1]))

function trace<T>(x: T): void {
  state.trace = []
  factorial.runAsync(
    5,
    () => awaitTimeout(1000),
    (x) => state.trace.push(x)
  )
}

factorial.runAsync(5, () => awaitTimeout(1000), console.log)
</script>

<template>
    <div style="height: 100%; top: 0; left: 2em; position: fixed">
    <pre>
const fact = {{ fact }}
const factorial = fact().o($((x: number) => [x, 1]));
  factorial.runAsync(
    5,
    () => awaitTimeout(1000),
    (x) => state.trace.push(x)
  )
</pre
    >
    <div>
      <button @click="trace">Trace</button>
      <pre>{{ state.trace.map((x) => `${x}`).join('\n') }}</pre>
    </div>
  </div>
</template>
