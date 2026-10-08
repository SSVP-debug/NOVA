import type { GeneratorInput, QuestionGenerator } from '@/core/ports';
import type { MisconceptionId, OptionDraft, QuestionBody } from '@/core/types';
import { createRng, randInt, shuffle } from '@/core/util/rng';

const wrongs = (r: ReturnType<typeof createRng>, focus: MisconceptionId[], pool: OptionDraft[]) =>
  [...pool.filter(o => focus.includes(o.misconception as MisconceptionId)), ...pool.filter(o => !focus.includes(o.misconception as MisconceptionId))].slice(0, 3);

export const accumulatorInit: QuestionGenerator = {
  id: 'accumulator.init', concept: 'loops',
  targets: ['accumulator-not-initialized','accumulator-wrong-start','accumulator-updated-wrong'],
  generate({seed, focus}: GeneratorInput): QuestionBody {
    const r=createRng(seed), a=randInt(r,2,9), b=randInt(r,2,9), c=randInt(r,2,9), total=a+b+c;
    const pool: OptionDraft[]=[{text:String(a+b),misconception:'accumulator-not-initialized'},{text:String(total+1),misconception:'accumulator-wrong-start'},{text:String(a*b*c),misconception:'accumulator-updated-wrong'}];
    return {prompt:'What value is printed?',code:`total = 0\nfor x in [${a}, ${b}, ${c}]:\n    total += x\nprint(total)`,options:shuffle(r,[{text:String(total),correct:true},...wrongs(r,focus,pool)]),hints:['Find the starting value of total.','Add each x to total once.'],feedback:{'accumulator-not-initialized':{plain:'The accumulator starts at 0 and receives all three values.'},'accumulator-wrong-start':{plain:'Here total starts at 0, so there is no extra starting value.'},'accumulator-updated-wrong':{plain:'The code uses +=, so it adds each value rather than multiplying them.'}}};
  }
};

export const loopCondition: QuestionGenerator = {
  id:'loops.condition', concept:'loops',
  targets:['condition-too-early','condition-too-late','wrong-comparison'],
  generate({seed,focus}: GeneratorInput): QuestionBody {
    const r=createRng(seed), start=randInt(r,1,3), stop=randInt(r,start+3,8);
    const truth=Array.from({length:stop-start},(_,i)=>start+i).join(' ');
    const pool: OptionDraft[]=[
      {text:Array.from({length:stop-start-1},(_,i)=>start+i).join(' '),misconception:'condition-too-early'},
      {text:Array.from({length:stop-start+1},(_,i)=>start+i).join(' '),misconception:'condition-too-late'},
      {text:Array.from({length:stop-start},(_,i)=>start+1+i).join(' '),misconception:'wrong-comparison'}];
    return {prompt:'What values are printed?',code:`i = ${start}\nwhile i < ${stop}:\n    print(i)\n    i += 1`,options:shuffle(r,[{text:truth,correct:true},...wrongs(r,focus,pool)]),hints:[`Check i before each iteration. The loop stops when i is ${stop}.`,'The condition is checked before the body runs.'],feedback:{'condition-too-early':{plain:'The loop includes every value below the stop value.'},'condition-too-late':{plain:`When i reaches ${stop}, i < ${stop} is false, so it is not printed.`},'wrong-comparison':{plain:'The loop begins at the initial value of i and increments by one.'}}};
  }
};

export const indexVsValue: QuestionGenerator = {
  id:'lists.index-vs-value', concept:'lists',
  targets:['index-vs-value','index-starts-at-one','len-is-last-index'],
  generate({seed,focus}: GeneratorInput): QuestionBody {
    const r=createRng(seed), nums=[randInt(r,10,30),randInt(r,31,60),randInt(r,61,90)], idx=randInt(r,0,2), correct=String(nums[idx]);
    const pool: OptionDraft[]=[{text:String(idx),misconception:'index-vs-value'},{text:String(idx+1),misconception:'index-starts-at-one'},{text:String(nums.length),misconception:'len-is-last-index'}];
    return {prompt:`What is nums[${idx}]?`,code:`nums = [${nums.join(', ')}]`,options:shuffle(r,[{text:correct,correct:true},...wrongs(r,focus,pool)]),hints:['The number inside [] is a position.','List positions start at 0.'],feedback:{'index-vs-value':{plain:`Index ${idx} selects the stored value ${correct}; the index itself is not the value.`},'index-starts-at-one':{plain:'The first list item is at index 0, not index 1.'},'len-is-last-index':{plain:`The list length is ${nums.length}, so the last index is ${nums.length-1}.`}}};
  }
};

export const baseCase: QuestionGenerator = {
  id:'recursion.base-case', concept:'recursion',
  targets:['missing-base-case','base-case-wrong','recursive-step-not-smaller'],
  generate({seed,focus}: GeneratorInput): QuestionBody {
    const r=createRng(seed); randInt(r,2,6);
    const pool: OptionDraft[]=[{text:'n < 0',misconception:'missing-base-case'},{text:'n == 2',misconception:'base-case-wrong'},{text:'n += 1',misconception:'recursive-step-not-smaller'}];
    return {prompt:'Which condition is a safe base case for factorial(n)?',code:`def factorial(n):\n    if ???:\n        return 1\n    return n * factorial(n - 1)`,options:shuffle(r,[{text:'n <= 1',correct:true},...wrongs(r,focus,pool)]),hints:['A base case must eventually be reached.','The recursive call decreases n by one.'],feedback:{'missing-base-case':{plain:'Stopping only below zero misses the usual factorial base cases 0 and 1.'},'base-case-wrong':{plain:'Stopping at 2 does not define the required result for 0 or 1.'},'recursive-step-not-smaller':{plain:'A recursive step must move toward the base case; increasing n moves away from it.'}}};
  }
};
