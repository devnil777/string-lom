const TOOLS = require('../src/js/tools.js');
global.jsonpath = require('jsonpath');
global.nunjucks = require('nunjucks');

const results = [];

function test(toolId, name, lines, params, expectedResult, expectedStats) {
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool) {
        console.error(`Tool not found: ${toolId}`);
        return;
    }

    const output = tool.process(lines, params);

    // Simple deep comparison for arrays
    const passed = JSON.stringify(output.result) === JSON.stringify(expectedResult);

    results.push({
        toolId,
        testName: name,
        input: lines,
        params,
        output,
        expectedResult,
        passed
    });

    if (!passed) {
        console.log(`FAILED: [${toolId}] ${name}`);
        console.log(`  Input: ${JSON.stringify(lines)}`);
        console.log(`  Params: ${JSON.stringify(params)}`);
        console.log(`  Expected: ${JSON.stringify(expectedResult)}`);
        console.log(`  Got: ${JSON.stringify(output.result)}`);
    }
}

// Helper for complex combinations
function runCombinations() {
    console.log("--- Running Combinatorial Tests ---");

    // Sort + Deduplicate
    const sortTool = TOOLS.find(t => t.id === 'sort');
    const dedupTool = TOOLS.find(t => t.id === 'deduplicate');

    const input = [' b', 'a', 'b', ' a '];
    const sorted = sortTool.process(input, {order: 'asc'}).result;
    const final = dedupTool.process(sorted, {trim: true}).result;

    const expected = ['a', 'b'];
    if (JSON.stringify(final) !== JSON.stringify(expected)) {
        console.log(`FAILED Combinatorial: Sort + Dedup`);
        console.log(`  Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(final)}`);
    } else {
        results.push({passed: true});
    }
}

// --- REGEX ---
test('regex', 'Basic match', ['abc123def'], {pattern: '\\d+', replacement: '[$&]'}, ['abc[123]def']);
test('regex', 'Empty pattern', ['abc'], {pattern: ''}, ['abc']);
test('regex', 'Multiple matches', ['1 2 3'], {pattern: '\\d', replacement: 'X'}, ['X X X']);
test('regex', 'No match', ['abc'], {pattern: '\\d', replacement: 'X'}, ['abc']);
test('regex', 'Capture groups', ['hello world'], {pattern: '(\\w+) (\\w+)', replacement: '$2 $1'}, ['world hello']);
test('regex', 'Flags: case-insensitive', ['ABC'], {pattern: 'a', replacement: 'X', flags: 'gi'}, ['XBC']);
test('regex', 'Empty replacement', ['a1b'], {pattern: '\\d', replacement: ''}, ['ab']);

// --- DEDUPLICATE ---
test('deduplicate', 'Basic dupes', ['a', 'b', 'a', 'c'], {trim: true}, ['a', 'b', 'c']);
test('deduplicate', 'Trim dupes', [' a', 'a '], {trim: true}, ['a']);
test('deduplicate', 'No trim dupes', [' a', 'a '], {trim: false}, [' a', 'a ']);
test('deduplicate', 'Empty lines removed', ['a', '', 'b'], {trim: true}, ['a', 'b']);
test('deduplicate', 'Empty lines kept if no trim?', ['a', '', 'b'], {trim: false}, ['a', 'b']); // Actually current logic filters val: if (val && !unique.has(val))

// --- SORT ---
test('sort', 'Ascending', ['c', 'a', 'b'], {order: 'asc'}, ['a', 'b', 'c']);
test('sort', 'Descending', ['a', 'c', 'b'], {order: 'desc'}, ['c', 'b', 'a']);
test('sort', 'Numeric Asc', ['10', '2', '1'], {order: 'num-asc'}, ['1', '2', '10']);
test('sort', 'Numeric Desc', ['1', '10', '2'], {order: 'num-desc'}, ['10', '2', '1']);
test('sort', 'Numeric with non-numbers', ['10', 'a', '2'], {order: 'num-asc'}, ['2', '10', 'a']);
test('sort', 'Russian alphabet', ['яблоко', 'арбуз', 'банан'], {order: 'asc'}, ['арбуз', 'банан', 'яблоко']);

// --- COMPARE ---
test('compare', 'Common', ['a', 'b', 'c'], {list2: 'b\nd', operation: 'common', delimiter: '\\n'}, ['b']);
test('compare', 'Diff (A-B)', ['a', 'b', 'c'], {list2: 'b\nd', operation: 'diff', delimiter: '\\n'}, ['a', 'c']);
test('compare', 'All with marks', ['a', 'b'], {list2: 'b\nd', operation: 'all', delimiter: '\\n'}, ['[=] b', '[-] a', '[+] d']); // Set order might vary but let's check current impl

// --- DUPLICATES ---
test('duplicates', 'Find dupes', ['a', 'b', 'a', 'c', 'b'], {showCounts: true}, ['a (2)', 'b (2)']);
test('duplicates', 'Find dupes no counts', ['a', 'b', 'a'], {showCounts: false}, ['a']);
test('duplicates', 'No dupes message', ['a', 'b', 'c'], {showCounts: true}, ['(Нет дубликатов)']);

// --- FILTER ---
test('filter', 'Contains', ['apple', 'banana', 'cherry'], {query: 'a', mode: 'contains'}, ['apple', 'banana']);
test('filter', 'Not contains', ['apple', 'banana', 'cherry'], {query: 'a', mode: 'not_contains'}, ['cherry']);
test('filter', 'Starts with', ['apple', 'banana', 'cherry'], {query: 'ap', mode: 'starts'}, ['apple']);
test('filter', 'Ends with', ['apple', 'banana', 'cherry'], {query: 'na', mode: 'ends'}, ['banana']);
test('filter', 'No match message', ['apple'], {query: 'z', mode: 'contains'}, ['(пусто)']);
test('filter', 'Empty query', ['a', 'b'], {query: '', mode: 'contains'}, ['a', 'b']);

// --- CSV ---
test('csv', 'Basic CSV', ['a;b', 'c;d'], {delimiter: ';', template: '$1 - $2', skipHeader: false}, ['a - b', 'c - d']);
test('csv', 'Skip header', ['h1;h2', 'a;b'], {delimiter: ';', template: '$1', skipHeader: true}, ['a']);
test('csv', 'Custom delimiter', ['a,b', 'c,d'], {delimiter: ',', template: '$2', skipHeader: false}, ['b', 'd']);
test('csv', 'Missing columns', ['a;b'], {delimiter: ';', template: '$1 - $2 - $3', skipHeader: false}, ['a - b - ']);

// --- CASE ---
test('case', 'Upper', ['hello world'], {mode: 'upper'}, ['HELLO WORLD']);
test('case', 'Lower', ['HELLO WORLD'], {mode: 'lower'}, ['hello world']);
test('case', 'Capitalize sentence', ['hello. world', 'test'], {mode: 'cap'}, ['Hello. World', 'Test']);
test('case', 'Word capitalize', ['hello world'], {mode: 'word'}, ['Hello World']);

// --- WRAPPER ---
test('wrapper', 'Prefix/Suffix', ['middle'], {prefix: '(', suffix: ')'}, ['(middle)']);
test('wrapper', 'Only prefix', ['a'], {prefix: '> ', suffix: ''}, ['> a']);

// --- TRIM ---
test('trim', 'Both', ['  hello  '], {mode: 'both'}, ['hello']);
test('trim', 'Left', ['  hello  '], {mode: 'left'}, ['hello  ']);
test('trim', 'Right', ['  hello  '], {mode: 'right'}, ['  hello']);

// --- AI CLEANER ---
test('ai_cleaner', 'Typography dash', ['—'], {replaceStr: ''}, ['-']);
test('ai_cleaner', 'Typography quotes', ['«test»'], {replaceStr: ''}, ['"test"']);
test('ai_cleaner', 'Special chars replacement', ['#'], {replaceStr: 'X'}, ['X']);

// --- JSON FORMAT ---
test('json_format', 'Pretty print 2', ['{"a":1}'], {indent: '2', joinDelim: '\\n'}, ['{', '  "a": 1', '}']);
test('json_format', 'Pretty print 4', ['{"a":1}'], {indent: '4', joinDelim: '\\n'}, ['{', '    "a": 1', '}']);
test('json_format', 'Pretty print Tab', ['{"a":1}'], {indent: 'tab', joinDelim: '\\n'}, ['{', '\t"a": 1', '}']);
test('json_format', 'Minify', ['{', '  "a": 1', '}'], {indent: '0', joinDelim: '\\n'}, ['{"a":1}']);

// --- JSON PATH ---
test('json_path', 'Combined mode', ['{"users":[{"name":"Alice"},{"name":"Bob"}]}'], {query: '$.users[*].name', inputMode: 'combined', joinDelim: '\\n', stringify: true}, ['Alice', 'Bob']);
test('json_path', 'Lines mode', ['{"a":1}', '{"a":2}'], {query: '$.a', inputMode: 'lines', stringify: true}, ['1', '2']);
test('json_path', 'Object stringify', ['{"a":{"b":1}}'], {query: '$.a', inputMode: 'combined', stringify: true}, ['{"b":1}']);
test('json_path', 'Object no stringify', ['{"a":{"b":1}}'], {query: '$.a', inputMode: 'combined', stringify: false}, ['[object Object]']);

// --- JOIN ---
test('join', 'Basic join', ['a', 'b', 'c'], {prefix: '<', delimiter: '|', lastDelimiter: '>', suffix: 'End'}, ['<a|b>cEnd']);
test('join', 'Single item', ['a'], {prefix: '(', suffix: ')'}, ['(a)']);
test('join', 'Empty list', [], {prefix: '[', suffix: ']'}, ['']); // Should it be [] or ['']? Current: ['']

// --- SPLIT ---
test('split', 'Basic split', ['a,b,c'], {delimiter: ','}, ['a', 'b', 'c']);
test('split', 'Multiple lines', ['a,b', 'c,d'], {delimiter: ','}, ['a', 'b', 'c', 'd']);

// --- ADD LINE ---
test('add_line', 'Start', ['b'], {content: 'a', position: 'start'}, ['a', 'b']);
test('add_line', 'End', ['a'], {content: 'b', position: 'end'}, ['a', 'b']);

// --- TEMPLATE ---
test('template', 'Nunjucks body', ['a', 'b'], {tpl: '{{body}}'}, ['a', 'b']);
test('template', 'Nunjucks custom', ['a'], {tpl: 'Line: {{lines[0]}}'}, ['Line: a']);

// --- JS FUNCTION ---
test('js_function', 'Math', ['1', '2'], {code: 'return Number(line) * 2'}, [2, 4]);

runCombinations();

// Summary
const total = results.length;
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => r && r.passed === false).length;

console.log(`\n--- Summary ---`);
console.log(`Total cases: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
}
