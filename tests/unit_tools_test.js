const TOOLS = require('../src/js/tools.js');
const jsonpath = require('jsonpath');
const nunjucks = require('nunjucks');

// Mock global variables for tools that use them
global.jsonpath = jsonpath;
global.nunjucks = nunjucks;

const results = [];

function runTest(toolId, lines, params, expectedResult, testName) {
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool) {
        results.push({ toolId, testName, status: 'FAILED', error: 'Tool not found' });
        return;
    }

    try {
        const output = tool.process(lines, params);
        // Use JSON stringify for comparison to handle arrays
        const passed = JSON.stringify(output.result) === JSON.stringify(expectedResult);

        if (passed) {
            results.push({ toolId, testName, status: 'PASSED' });
        } else {
            results.push({
                toolId,
                testName,
                status: 'FAILED',
                expected: expectedResult,
                actual: output.result,
                params: params,
                input: lines,
                error_prop: output.error
            });
        }
    } catch (e) {
        results.push({ toolId, testName, status: 'ERROR', error: e.message, stack: e.stack });
    }
}

// --- DEDUPLICATE ---
runTest('deduplicate', ['a', 'b', 'a'], { trim: true }, ['a', 'b'], 'Deduplicate simple');
runTest('deduplicate', ['a', 'A'], { trim: true }, ['a', 'A'], 'Deduplicate case sensitive');
runTest('deduplicate', ['  ', ''], { trim: true }, [], 'Deduplicate empty/whitespace with trim');
runTest('deduplicate', ['  ', ''], { trim: false }, ['  '], 'Deduplicate empty/whitespace without trim - ignores empty string');

// --- SORT ---
runTest('sort', ['10', '2', '1'], { order: 'num-asc' }, ['1', '2', '10'], 'Sort num-asc');
runTest('sort', ['10', '2', '1'], { order: 'num-desc' }, ['10', '2', '1'], 'Sort num-desc');
runTest('sort', ['b', 'a', 'c'], { order: 'asc' }, ['a', 'b', 'c'], 'Sort alpha-asc');
runTest('sort', ['b', 'a', 'c'], { order: 'desc' }, ['c', 'b', 'a'], 'Sort alpha-desc');
runTest('sort', ['10', '2', 'apple'], { order: 'num-asc' }, ['2', '10', 'apple'], 'Sort numeric with non-numeric');
runTest('sort', ['apple', '10', '2'], { order: 'num-asc' }, ['2', '10', 'apple'], 'Sort numeric with non-numeric 2');
runTest('sort', ['  ', 'a', ''], { order: 'asc' }, ['a'], 'Sort filters out empty/whitespace lines');

// --- FILTER ---
runTest('filter', ['Apple', 'Banana', 'apple'], { query: 'apple', mode: 'contains' }, ['Apple', 'apple'], 'Filter contains case insensitive');
runTest('filter', ['Apple', 'Banana'], { query: 'Apple', mode: 'starts' }, ['Apple'], 'Filter starts with');
runTest('filter', ['Apple', 'Banana'], { query: 'ana', mode: 'ends' }, ['Banana'], 'Filter ends with');
runTest('filter', ['Apple', 'Banana'], { query: 'z', mode: 'contains' }, ['(пусто)'], 'Filter no match');
runTest('filter', ['Apple', 'Banana', 'Cherry'], { query: 'a', mode: 'not_contains' }, ['Cherry'], 'Filter not_contains');

// --- CSV ---
runTest('csv', ['1;John;Doe', '2;Jane;Smith'], { delimiter: ';', template: '$2 $3 ($1)', skipHeader: false }, ['John Doe (1)', 'Jane Smith (2)'], 'CSV semicolon');
runTest('csv', ['1,John,Doe', '2,Jane,Smith'], { delimiter: ',', template: '$2 $3 ($1)', skipHeader: false }, ['John Doe (1)', 'Jane Smith (2)'], 'CSV comma');
runTest('csv', ['header1;header2', 'val1;val2'], { delimiter: ';', template: '$1', skipHeader: true }, ['val1'], 'CSV skip header');
runTest('csv', ['val1'], { delimiter: ';', template: '$2', skipHeader: false }, [''], 'CSV column out of range');
runTest('csv', ['"John, Doe";1'], { delimiter: ',', template: '$1', skipHeader: false }, ['"John'], 'CSV simple split bug with quotes');

// --- CASE ---
runTest('case', ['hello world'], { mode: 'upper' }, ['HELLO WORLD'], 'Case upper');
runTest('case', ['HELLO WORLD'], { mode: 'lower' }, ['hello world'], 'Case lower');
runTest('case', ['hello world'], { mode: 'cap' }, ['Hello world'], 'Case cap sentence');
runTest('case', ['hello world. how are you?'], { mode: 'cap' }, ['Hello world. How are you?'], 'Case cap multi-sentence');
runTest('case', ['hello world'], { mode: 'word' }, ['Hello World'], 'Case word');

// --- JOIN ---
runTest('join', ['a', 'b', 'c'], { prefix: '[', delimiter: ',', lastDelimiter: '&', suffix: ']' }, ['[a,b&c]'], 'Join 3 items');
runTest('join', ['a', 'b'], { prefix: '[', delimiter: ',', lastDelimiter: '&', suffix: ']' }, ['[a&b]'], 'Join 2 items');
runTest('join', ['a'], { prefix: '[', delimiter: ',', lastDelimiter: '&', suffix: ']' }, ['[a]'], 'Join 1 item');
runTest('join', [], { prefix: '[', delimiter: ',', lastDelimiter: '&', suffix: ']' }, [''], 'Join 0 items');

// --- JSON PATH ---
runTest('json_path', ['{"items":[{"id":1},{"id":2}]}'], { query: '$.items[*].id', inputMode: 'combined', stringify: true }, ['1', '2'], 'JSONPath combined');
runTest('json_path', ['{"id":1}', '{"id":2}'], { query: '$.id', inputMode: 'lines', stringify: true }, ['1', '2'], 'JSONPath lines');
runTest('json_path', ['{"a": {"b": 1}}'], { query: '$.a', inputMode: 'combined', stringify: true }, ['{"b":1}'], 'JSONPath stringify object');
runTest('json_path', ['{"a": {"b": 1}}'], { query: '$.a', inputMode: 'combined', stringify: false }, ['[object Object]'], 'JSONPath no stringify object');

// --- JS FUNCTION ---
runTest('js_function', ['a', 'b'], { code: 'return line + line' }, ['aa', 'bb'], 'JS Function simple');
runTest('js_function', ['a'], { code: 'invalid code' }, ['Ошибка компиляции: Unexpected identifier \'code\''], 'JS Function compile error');

// --- REGEX ---
runTest('regex', ['a1b2c'], { pattern: '\\d', replacement: '_', flags: 'g' }, ['a_b_c'], 'Regex basic');
runTest('regex', ['abc'], { pattern: '(', replacement: '_', flags: 'g' }, ['Invalid regular expression: /(/g: Unterminated group'], 'Regex invalid pattern');
runTest('regex', ['abc'], { pattern: 'a', replacement: '$1', flags: 'g' }, ['$1bc'], 'Regex missing group replacement bug');

// --- COMPARE ---
runTest('compare', ['a', 'b'], { list2: 'b\nc', operation: 'common', delimiter: '\\n' }, ['b'], 'Compare common');
runTest('compare', ['a', 'b'], { list2: 'b\nc', operation: 'diff', delimiter: '\\n' }, ['a'], 'Compare diff');
runTest('compare', ['a', 'b'], { list2: 'b\nc', operation: 'all', delimiter: '\\n' }, ['[-] a', '[=] b', '[+] c'], 'Compare all');
runTest('compare', [' a '], { list2: 'a', operation: 'common', delimiter: '\\n' }, ['a'], 'Compare common with trim');

// --- DUPLICATES ---
runTest('duplicates', ['a', 'b', 'a', 'b', 'b'], { showCounts: true }, ['a (2)', 'b (3)'], 'Duplicates with counts');
runTest('duplicates', ['a', 'b', 'a'], { showCounts: false }, ['a'], 'Duplicates without counts');
runTest('duplicates', ['a', 'b'], { showCounts: true }, ['(Нет дубликатов)'], 'Duplicates none');

// --- WRAPPER ---
runTest('wrapper', ['a'], { prefix: 'pre-', suffix: '-post' }, ['pre-a-post'], 'Wrapper');

// --- TRIM ---
runTest('trim', ['  a  '], { mode: 'both' }, ['a'], 'Trim both');
runTest('trim', ['  a  '], { mode: 'left' }, ['a  '], 'Trim left');
runTest('trim', ['  a  '], { mode: 'right' }, ['  a'], 'Trim right');

// --- AI CLEANER ---
runTest('ai_cleaner', ['— «test»'], { replaceStr: '' }, ['- "test"'], 'AI Cleaner typographic');
runTest('ai_cleaner', ['test!@#$'], { replaceStr: '?' }, ['test!@#$'], 'AI Cleaner preserves common punctuation');
runTest('ai_cleaner', ['test\u0001'], { replaceStr: '' }, ['test'], 'AI Cleaner removes control chars');

// --- JSON FORMAT ---
runTest('json_format', ['{"a":1}'], { indent: '2', joinDelim: '\\n' }, ['{', '  "a": 1', '}'], 'JSON Format');
runTest('json_format', ['{"a":1}', '{"b":2}'], { indent: '0', joinDelim: ',' }, ['{"a":1,"b":2}'], 'JSON Format combined lines');

// --- SPLIT ---
runTest('split', ['a,b', 'c,d'], { delimiter: ',' }, ['a', 'b', 'c', 'd'], 'Split');

// --- ADD LINE ---
runTest('add_line', ['b'], { content: 'a', position: 'start' }, ['a', 'b'], 'Add line start');

// --- TEMPLATE ---
runTest('template', ['a', 'b'], { tpl: '{{ lines | reverse | join(",") }}' }, ['b,a'], 'Template reverse join');

console.log(JSON.stringify(results, null, 2));
