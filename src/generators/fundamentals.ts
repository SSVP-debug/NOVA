import type { GeneratorInput, QuestionGenerator } from '@/core/ports';
import type { MisconceptionId, OptionDraft, QuestionBody } from '@/core/types';
import { createRng, randInt, shuffle, type Rng } from '@/core/util/rng';

function distinctValues(rng: Rng, count: number, min: number, max: number): number[] {
  const values = new Set<number>();
  while (values.size < count) values.add(randInt(rng, min, max));
  return [...values];
}

function buildQuestion(
  rng: Rng,
  prompt: string,
  code: string,
  options: OptionDraft[],
  feedback: QuestionBody['feedback'],
  hints: string[],
): QuestionBody {
  return { prompt, code, options: shuffle(rng, options), feedback, hints };
}

export const accumulatorInit: QuestionGenerator = {
  id: 'loops.accumulator-init',
  concept: 'loops',
  targets: ['accumulator-starts-at-one', 'accumulator-includes-first-twice', 'accumulator-resets-each-loop'],
  generate({ seed }: GeneratorInput): QuestionBody {
    const rng = createRng(seed);
    const values = distinctValues(rng, 3, 2, 9);
    const total = values.reduce((sum, value) => sum + value, 0);
    return buildQuestion(
      rng,
      'What value is printed?',
      `values = [${values.join(', ')}]\ntotal = 0\nfor value in values:\n    total += value\nprint(total)`,
      [
        { text: String(total), correct: true },
        { text: String(total + 1), misconception: 'accumulator-starts-at-one' },
        { text: String(total + values[0]!), misconception: 'accumulator-includes-first-twice' },
        { text: String(values[2]!), misconception: 'accumulator-resets-each-loop' },
      ],
      {
        'accumulator-starts-at-one': { plain: 'The accumulator starts at 0, so the total is the sum of the three values without an extra 1.' },
        'accumulator-includes-first-twice': { plain: `The loop adds every value once. Starting from the first value would count ${values[0]} twice.` },
        'accumulator-resets-each-loop': { plain: 'The total keeps its previous value on each pass; it is not reset to the current value.' },
      },
      ['Track total from its initial value of 0.', 'Add each list value once, in order.'],
    );
  },
};

export const loopCondition: QuestionGenerator = {
  id: 'loops.condition',
  concept: 'loops',
  targets: ['loop-condition-includes-stop', 'loop-condition-skips-last', 'loop-condition-never-starts'],
  generate({ seed }: GeneratorInput): QuestionBody {
    const rng = createRng(seed);
    const values = distinctValues(rng, randInt(rng, 3, 7), 10, 89);
    return buildQuestion(
      rng,
      'Which condition prints every item exactly once without an index error?',
      `values = [${values.join(', ')}]\ni = 0\nwhile CONDITION:\n    print(values[i])\n    i += 1`,
      [
        { text: 'i < len(values)', correct: true },
        { text: 'i <= len(values)', misconception: 'loop-condition-includes-stop' },
        { text: 'i < len(values) - 1', misconception: 'loop-condition-skips-last' },
        { text: 'i > 0', misconception: 'loop-condition-never-starts' },
      ],
      {
        'loop-condition-includes-stop': { plain: `The last valid index is ${values.length - 1}; including len(values) tries to read an index that does not exist.` },
        'loop-condition-skips-last': { plain: 'Stopping before len(values) - 1 leaves the final valid index unvisited.' },
        'loop-condition-never-starts': { plain: 'The index starts at 0, so i > 0 is false before the loop runs.' },
      },
      ['The first index is 0 and the final valid index is one less than the length.', 'The condition must stop before i reaches the length.'],
    );
  },
};

export const indexVsValue: QuestionGenerator = {
  id: 'lists.index-vs-value',
  concept: 'lists',
  targets: ['lists-index-vs-value', 'lists-first-item-skipped', 'lists-length-for-index'],
  generate({ seed }: GeneratorInput): QuestionBody {
    const rng = createRng(seed);
    const values = distinctValues(rng, 4, 20, 89);
    return buildQuestion(
      rng,
      'What values are printed, in order?',
      `values = [${values.join(', ')}]\nfor i in range(len(values)):\n    print(values[i])`,
      [
        { text: values.join('  '), correct: true },
        { text: '0  1  2  3', misconception: 'lists-index-vs-value' },
        { text: values.slice(1).join('  '), misconception: 'lists-first-item-skipped' },
        { text: String(values.length), misconception: 'lists-length-for-index' },
      ],
      {
        'lists-index-vs-value': { plain: 'The loop variable i is an index; values[i] prints the item stored at that index.' },
        'lists-first-item-skipped': { plain: `The loop starts at index 0, so the first item, ${values[0]}, is included.` },
        'lists-length-for-index': { plain: `len(values) is ${values.length}, but each values[i] expression prints a list item, not the length.` },
      },
      ['Write down the indexes from 0 to len(values) - 1.', 'At each index, look up the value stored there.'],
    );
  },
};

export const recursionBaseCase: QuestionGenerator = {
  id: 'recursion.base-case',
  concept: 'recursion',
  targets: ['recursive-base-case-missed', 'recursive-base-case-too-early', 'recursive-base-case-wrong-direction'],
  generate({ seed }: GeneratorInput): QuestionBody {
    const rng = createRng(seed);
    const start = randInt(rng, 2, 7);
    return buildQuestion(
      rng,
      `Which condition should stop this countdown recursion for the call total_to_zero(${start})?`,
      `def total_to_zero(n):\n    if CONDITION:\n        return 0\n    return n + total_to_zero(n - 1)`,
      [
        { text: 'n == 0', correct: true },
        { text: 'n == 1', misconception: 'recursive-base-case-too-early' },
        { text: 'n < 0', misconception: 'recursive-base-case-missed' },
        { text: 'n > 0', misconception: 'recursive-base-case-wrong-direction' },
      ],
      {
        'recursive-base-case-too-early': { plain: 'Stopping at 1 returns before adding 1 to the total, so the result misses that value.' },
        'recursive-base-case-missed': { plain: 'The calls count down to 0, so a condition for n < 0 stops only after the recursion has already passed the intended base case.' },
        'recursive-base-case-wrong-direction': { plain: 'The starting value is positive, so n > 0 returns immediately instead of making the recursive calls.' },
      },
      ['Follow n as it decreases by 1 on each call.', 'Choose the condition that stops exactly when n reaches 0.'],
    );
  },
};
