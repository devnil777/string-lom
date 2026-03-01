// helper to normalize delimiter parameters
function resolveDelimiter(params, id = 'delimiter', defaultVal = '\n') {
    let val = params[id] !== undefined ? params[id] : defaultVal;
    if (val === 'custom') {
        val = params[id + 'Custom'] || '';
    }
    if (val === '\\n') return '\n';
    return val || defaultVal;
}

const TOOLS = [
    {
        id: 'regex',
        title: 'tool_regex_title',
        icon: 'fas fa-search',
        description: 'tool_regex_desc',
        params: [
            { id: 'pattern', type: 'text', label: 'tool_regex_pattern', placeholder: '\\d+', value: '\\d+' },
            { id: 'replacement', type: 'text', label: 'tool_regex_replacement', placeholder: '[$1]', value: '' },
            { id: 'caseInsensitive', type: 'checkbox', label: 'tool_regex_case', value: false },
            { id: 'onlyMatched', type: 'checkbox', label: 'tool_regex_only_matched', value: false }
        ],
        help: 'https://en.wikipedia.org/wiki/Regular_expression',
        process: (lines, params) => {
            if (!params.pattern) return { result: lines, stats: { msg: i18n.t('tool_regex_empty') } };
            try {
                const flags = 'gm' + (params.caseInsensitive ? 'i' : '');
                const regex = new RegExp(params.pattern, flags);

                let count = 0;
                let result = [];

                if (params.onlyMatched) {
                    result = lines.map(line => {
                        const matches = [...line.matchAll(regex)];
                        if (matches.length > 0) {
                            const lineResults = matches.map(m => {
                                count++;
                                if (params.replacement) {
                                    // Apply replacement to the match itself
                                    const singleRegex = new RegExp(params.pattern, flags.replace('g', ''));
                                    return m[0].replace(singleRegex, params.replacement);
                                } else {
                                    return m[0];
                                }
                            });
                            return lineResults.join('');
                        } else {
                            return '';
                        }
                    });
                } else {
                    result = lines.map(line => {
                        const m = line.match(regex);
                        if (m) count += m.length;
                        return line.replace(regex, params.replacement || '');
                    });
                }

                return { result, stats: { matches: count } };
            } catch (e) {
                return { result: [e.message], error: true };
            }
        }
    },
    {
        id: 'deduplicate',
        title: 'tool_dedup_title',
        icon: 'fas fa-clone',
        description: 'tool_dedup_desc',
        params: [
            { id: 'trim', type: 'checkbox', label: 'tool_dedup_trim', value: true }
        ],
        process: (lines, params) => {
            const unique = new Set();
            const resultArr = [];
            lines.forEach(item => {
                const val = params.trim ? item.trim() : item;
                if (val && !unique.has(val)) {
                    unique.add(val);
                    resultArr.push(val);
                }
            });
            return {
                result: resultArr,
                stats: { original: lines.length, unique: unique.size, removed: lines.length - unique.size }
            };
        }
    },
    {
        id: 'sort',
        title: 'tool_sort_title',
        icon: 'fas fa-sort-alpha-down',
        description: 'tool_sort_desc',
        params: [
            {
                id: 'mode', type: 'select', label: 'tool_sort_mode', options: [
                    { v: 'text', l: 'tool_sort_text' },
                    { v: 'numeric', l: 'tool_sort_numeric' },
                    { v: 'smart', l: 'tool_sort_smart' }
                ], value: 'text'
            },
            {
                id: 'direction', type: 'select', label: 'tool_sort_direction', options: [
                    { v: 'asc', l: 'tool_sort_asc' },
                    { v: 'desc', l: 'tool_sort_desc' }
                ], value: 'asc'
            },
            { id: 'caseInsensitive', type: 'checkbox', label: 'tool_sort_case', value: false }
        ],
        process: (lines, params) => {
            let items = [...lines].filter(x => x.trim());
            const direction = params.direction === 'asc' ? 1 : -1;
            const caseInsensitive = params.caseInsensitive;

            const compareStrings = (s1, s2) => {
                const collatorOptions = {
                    numeric: params.mode === 'smart',
                    sensitivity: caseInsensitive ? 'accent' : 'variant'
                };
                return s1.localeCompare(s2, i18n.locale, collatorOptions);
            };

            if (params.mode === 'numeric') {
                items.sort((a, b) => {
                    const sA = a.trim();
                    const sB = b.trim();
                    const nA = Number(sA);
                    const nB = Number(sB);
                    const isANum = sA !== '' && !isNaN(nA);
                    const isBNum = sB !== '' && !isNaN(nB);

                    if (isANum && isBNum) return (nA - nB) * direction;
                    if (isANum) return -1; // Numbers always first
                    if (isBNum) return 1;

                    return compareStrings(a, b) * direction;
                });
            } else {
                items.sort((a, b) => {
                    return compareStrings(a, b) * direction;
                });
            }
            return { result: items, stats: {} };
        }
    },
    {
        id: 'reverse',
        title: 'tool_reverse_title',
        icon: 'fas fa-arrows-alt-v',
        description: 'tool_reverse_desc',
        params: [],
        process: (lines) => {
            return { result: [...lines].reverse(), stats: {} };
        }
    },
    {
        id: 'compare',
        title: 'tool_compare_title',
        icon: 'fas fa-exchange-alt',
        description: 'tool_compare_desc',
        params: [
            { id: 'list2', type: 'textarea', label: 'tool_compare_list2', placeholder: 'tool_compare_placeholder', value: '' },
            { id: 'delimiter', type: 'delimiter', label: 'tool_compare_delimiter', value: '\\n' },
            { id: 'operation', type: 'select', label: 'tool_compare_show', options: [{ v: 'common', l: 'tool_compare_common' }, { v: 'diff', l: 'tool_compare_diff' }, { v: 'all', l: 'tool_compare_all' }], value: 'common' }
        ],
        process: (lines, params) => {
            const delim = resolveDelimiter(params, 'delimiter', '\n');
            const setA = new Set(lines.map(x => x.trim()).filter(x => x));
            const listB = (params.list2 || '').split(delim).map(x => x.trim()).filter(x => x);
            const setB = new Set(listB);

            let resultLines = [];

            if (params.operation === 'common') {
                resultLines = [...setA].filter(x => setB.has(x));
            } else if (params.operation === 'diff') {
                resultLines = [...setA].filter(x => !setB.has(x));
            } else {
                [...setA].forEach(x => {
                    if (setB.has(x)) resultLines.push(`[=] ${x}`);
                    else resultLines.push(`[-] ${x}`); // In A but not B
                });
                [...setB].forEach(x => {
                    if (!setA.has(x)) resultLines.push(`[+] ${x}`); // In B but not A
                });
            }

            return {
                result: resultLines,
                stats: { outputLines: resultLines.length }
            };
        }
    },
    {
        id: 'duplicates',
        title: 'tool_duplicates_title',
        icon: 'fas fa-copy',
        description: 'tool_duplicates_desc',
        params: [
            { id: 'showCounts', type: 'checkbox', label: 'tool_duplicates_show_counts', value: true }
        ],
        process: (lines, params) => {
            const items = lines.map(x => x.trim()).filter(x => x);
            const counts = {};
            items.forEach(x => counts[x] = (counts[x] || 0) + 1);

            let resultArr = [];
            Object.entries(counts).forEach(([k, v]) => {
                if (v > 1) {
                    resultArr.push(params.showCounts ? `${k} (${v})` : k);
                }
            });

            if (resultArr.length === 0) return { result: [i18n.t('tool_duplicates_none')], stats: { duplicates: 0 } };

            return { result: resultArr, stats: { duplicates: resultArr.length } };
        }
    },
    {
        id: 'filter',
        title: 'tool_filter_title',
        icon: 'fas fa-filter',
        description: 'tool_filter_desc',
        params: [
            { id: 'query', type: 'text', label: 'tool_filter_query', value: '' },
            { id: 'mode', type: 'select', label: 'tool_sort_mode', options: [{ v: 'contains', l: 'tool_filter_contains' }, { v: 'not_contains', l: 'tool_filter_not_contains' }, { v: 'starts', l: 'tool_filter_starts' }, { v: 'ends', l: 'tool_filter_ends' }], value: 'contains' }
        ],
        process: (lines, params) => {
            const q = (params.query || '').toLowerCase();

            const res = lines.filter(item => {
                const val = item.toLowerCase();
                if (params.mode === 'contains') return val.includes(q);
                if (params.mode === 'not_contains') return !val.includes(q);
                if (params.mode === 'starts') return val.startsWith(q);
                if (params.mode === 'ends') return val.endsWith(q);
                return true;
            });

            return { result: res.length ? res : ['(empty)'], stats: { matched: res.length, removed: lines.length - res.length } };
        }
    },
    {
        id: 'csv',
        title: 'tool_csv_title',
        icon: 'fas fa-file-csv',
        description: 'tool_csv_desc',
        params: [
            { id: 'delimiter', type: 'delimiter', label: 'tool_csv_delimiter', value: ';' },
            { id: 'template', type: 'text', label: 'tool_csv_template', value: '$1 - $2' },
            { id: 'skipHeader', type: 'checkbox', label: 'tool_csv_skip_header', value: false }
        ],
        process: (lines, params) => {
            const delim = resolveDelimiter(params, 'delimiter', ';');
            const start = params.skipHeader ? 1 : 0;
            const validLines = lines.filter(l => l.trim());

            const res = [];
            for (let i = start; i < validLines.length; i++) {
                const cols = validLines[i].split(delim);
                let rowStr = params.template || '';
                rowStr = rowStr.replace(/\$(\d+)/g, (m, n) => {
                    const idx = parseInt(n) - 1;
                    return cols[idx] !== undefined ? cols[idx].trim() : '';
                });
                res.push(rowStr);
            }

            return { result: res, stats: { rows: res.length } };
        }
    },
    {
        id: 'case',
        title: 'tool_case_title',
        icon: 'fas fa-font',
        description: 'tool_case_desc',
        params: [
            { id: 'mode', type: 'select', label: 'tool_sort_mode', options: [{ v: 'upper', l: 'tool_case_upper' }, { v: 'lower', l: 'tool_case_lower' }, { v: 'cap', l: 'tool_case_cap' }, { v: 'word', l: 'tool_case_word' }], value: 'lower' }
        ],
        process: (lines, params) => {
            const res = lines.map(line => {
                let r = line;
                if (params.mode === 'upper') r = line.toUpperCase();
                if (params.mode === 'lower') r = line.toLowerCase();
                if (params.mode === 'cap') {
                    r = line.replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
                }
                if (params.mode === 'word') {
                    r = line.replace(/\b\w/g, c => c.toUpperCase());
                }
                return r;
            });
            return { result: res, stats: {} };
        }
    },
    {
        id: 'wrapper',
        title: 'tool_wrapper_title',
        icon: 'fas fa-box',
        description: 'tool_wrapper_desc',
        params: [
            { id: 'prefix', type: 'text', label: 'tool_wrapper_prefix', value: '' },
            { id: 'suffix', type: 'text', label: 'tool_wrapper_suffix', value: '' }
        ],
        process: (lines, params) => {
            const res = lines.map(l => (params.prefix || '') + l + (params.suffix || ''));
            return { result: res, stats: {} };
        }
    },
    {
        id: 'trim',
        title: 'tool_trim_title',
        icon: 'fas fa-cut',
        description: 'tool_trim_desc',
        params: [
            { id: 'mode', type: 'select', label: 'tool_sort_mode', options: [{ v: 'both', l: 'tool_trim_both' }, { v: 'left', l: 'tool_trim_left' }, { v: 'right', l: 'tool_trim_right' }], value: 'both' }
        ],
        process: (lines, params) => {
            let changed = 0;
            const res = lines.map(l => {
                let t = l;
                if (params.mode === 'left') t = l.trimStart();
                else if (params.mode === 'right') t = l.trimEnd();
                else t = l.trim();

                if (t.length !== l.length) changed++;
                return t;
            });
            return { result: res, stats: { lines_changed: changed } };
        }
    },
    {
        id: 'ai_cleaner',
        title: 'tool_ai_cleaner_title',
        icon: 'fas fa-magic',
        description: 'tool_ai_cleaner_desc',
        params: [
            { id: 'replaceStr', type: 'text', label: 'tool_ai_cleaner_replace', value: '' }
        ],
        process: (lines, params) => {
            let removed = 0;
            const res = lines.map(line => {
                let t = line.replace(/[—–]/g, '-').replace(/[«»„“]/g, '"');
                const startLen = t.length;
                t = t.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, params.replaceStr || '');
                removed += startLen - t.length;
                return t;
            });
            return { result: res, stats: { removed } };
        }
    },
    {
        id: 'json_format',
        title: 'tool_json_format_title',
        icon: 'fas fa-code',
        description: 'tool_json_format_desc',
        params: [
            { id: 'indent', type: 'select', label: 'tool_json_format_indent', options: [{ v: '2', l: 'tool_json_format_2spaces' }, { v: '4', l: 'tool_json_format_4spaces' }, { v: 'tab', l: 'tool_json_format_tab' }, { v: '0', l: 'tool_json_format_minify' }], value: '2' },
            { id: 'joinDelim', type: 'select', label: 'tool_json_format_join', options: [{ v: '\\n', l: 'newline' }, { v: '', l: '(none)' }, { v: ' ', l: 'space' }], value: '\\n' }
        ],
        process: (lines, params) => {
            const joinD = params.joinDelim === '\\n' ? '\n' : params.joinDelim;
            const combined = lines.join(joinD);

            if (!combined.trim()) return { result: lines, stats: { msg: i18n.t('tool_json_format_empty') } };

            let parsed;
            try {
                parsed = JSON.parse(combined);
            } catch (e) {
                return { result: [e.message], error: true };
            }

            let space = 2;
            if (params.indent === '4') space = 4;
            if (params.indent === 'tab') space = '\t';
            if (params.indent === '0') space = 0;

            const formatted = JSON.stringify(parsed, null, space);
            const resLines = formatted.split('\n');

            return { result: resLines, stats: { lines: resLines.length } };
        }
    },
    {
        id: 'json_path',
        title: 'tool_json_path_title',
        icon: 'fas fa-sitemap',
        description: 'tool_json_path_desc',
        params: [
            { id: 'query', type: 'text', label: 'tool_json_path_query', value: '$.*' },
            { id: 'inputMode', type: 'select', label: 'tool_json_path_input_mode', options: [{ v: 'combined', l: 'tool_json_path_combined' }, { v: 'lines', l: 'tool_json_path_lines' }], value: 'combined' },
            { id: 'joinDelim', type: 'select', label: 'tool_json_format_join', options: [{ v: '\\n', l: 'newline' }, { v: '', l: '(none)' }, { v: ' ', l: 'space' }], value: '\\n' },
            { id: 'stringify', type: 'checkbox', label: 'tool_json_path_stringify', value: true }
        ],
        help: 'https://jsonpath.com/',
        process: (lines, params) => {
            if (typeof jsonpath === 'undefined') {
                return { result: [i18n.t('tool_json_path_lib_error')], error: true };
            }

            const stringifyItem = (item) => {
                if (typeof item === 'object' && item !== null) {
                    return params.stringify ? JSON.stringify(item) : String(item);
                }
                return String(item);
            };

            try {
                let resLines = [];
                let errorCount = 0;

                if (params.inputMode === 'lines') {
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const parsed = JSON.parse(line);
                            const jpResult = jsonpath.query(parsed, params.query || '$.*');
                            resLines.push(...jpResult.map(stringifyItem));
                        } catch (e) {
                            errorCount++;
                        }
                    }
                    const stats = { items: resLines.length };
                    if (errorCount > 0) stats['parse_errors'] = errorCount;
                    return { result: resLines, stats };
                } else {
                    const joinD = params.joinDelim === '\\n' ? '\n' : params.joinDelim;
                    const combined = lines.join(joinD);

                    if (!combined.trim()) return { result: lines, stats: { msg: i18n.t('tool_json_format_empty') } };

                    let parsed;
                    try {
                        parsed = JSON.parse(combined);
                    } catch (e) {
                        return { result: [`${i18n.t('tool_json_path_parse_error')}${e.message}`], error: true };
                    }

                    const jpResult = jsonpath.query(parsed, params.query || '$.*');
                    resLines = jpResult.map(stringifyItem);
                    return { result: resLines, stats: { items: resLines.length } };
                }
            } catch (e) {
                return { result: [`${i18n.t('tool_json_path_error')}${e.message}`], error: true };
            }
        }
    },
    {
        id: 'join',
        title: 'tool_join_title',
        icon: 'fas fa-link',
        description: 'tool_join_desc',
        params: [
            { id: 'prefix', type: 'text', label: 'tool_join_prefix', value: '' },
            { id: 'delimiter', type: 'delimiter', label: 'tool_compare_delimiter', value: ', ' },
            { id: 'lastDelimiter', type: 'delimiter', label: 'tool_join_last_delimiter', value: ' and ' },
            { id: 'suffix', type: 'text', label: 'tool_join_suffix', value: '' }
        ],
        process: (lines, params) => {
            if (lines.length === 0) return { result: [''], stats: { count: 0 } };
            let res = '';
            const lastDelim = params.lastDelimiter === ' and ' ? i18n.t('tool_join_and') : resolveDelimiter(params, 'lastDelimiter', '');
            if (lines.length === 1) {
                res = (params.prefix || '') + lines[0] + (params.suffix || '');
            } else {
                const allButLast = lines.slice(0, -1).join(resolveDelimiter(params, 'delimiter', ''));
                res = (params.prefix || '') + allButLast + lastDelim + lines[lines.length - 1] + (params.suffix || '');
            }
            return { result: [res], stats: {} };
        }
    },
    {
        id: 'split',
        title: 'tool_split_title',
        icon: 'fas fa-columns',
        description: 'tool_split_desc',
        params: [
            { id: 'delimiter', type: 'delimiter', label: 'tool_compare_delimiter', value: ',' }
        ],
        process: (lines, params) => {
            const delim = resolveDelimiter(params, 'delimiter', ',');
            const res = lines.flatMap(l => l.split(delim));
            return { result: res, stats: { count: res.length } };
        }
    },
    {
        id: 'add_line',
        title: 'tool_add_line_title',
        icon: 'fas fa-plus-square',
        description: 'tool_add_line_desc',
        params: [
            { id: 'startLine', type: 'text', label: 'tool_add_line_start', value: '' },
            { id: 'betweenLines', type: 'text', label: 'tool_add_line_between', value: '' },
            { id: 'endLine', type: 'text', label: 'tool_add_line_end', value: '' }
        ],
        process: (lines, params) => {
            let res = [];
            let start = params.startLine || '';
            let between = params.betweenLines || '';
            let end = params.endLine || '';

            if (start !== '') res.push(start);

            for (let i = 0; i < lines.length; i++) {
                res.push(lines[i]);
                if (i < lines.length - 1 && between !== '') {
                    res.push(between);
                }
            }

            if (end !== '') res.push(end);

            return { result: res, stats: {} };
        }
    },
    {
        id: 'template',
        title: 'tool_template_title',
        icon: 'fas fa-terminal',
        description: 'tool_template_desc',
        params: [
            { id: 'tpl', type: 'textarea', label: 'tool_template_tpl', value: '{% for line in lines %}\n- {{ line }}\n{% endfor %}' }
        ],
        help: 'https://mozilla.github.io/nunjucks/templating.html',
        process: (lines, params) => {
            try {
                const res = nunjucks.renderString(params.tpl || '', {
                    body: lines.join('\n'),
                    lines: lines
                });
                return { result: res.split('\n'), stats: { length: res.length } };
            } catch (e) {
                return { result: [e.message], error: true };
            }
        }
    },
    {
        id: 'js_function',
        title: 'tool_js_function_title',
        icon: 'fas fa-code',
        description: 'tool_js_function_desc',
        params: [
            { id: 'code', type: 'textarea', label: 'tool_js_function_code', value: 'return line.toUpperCase();' }
        ],
        process: (lines, params) => {
            try {
                const fn = new Function('line', params.code || 'return line');
                const res = lines.map(l => {
                    try {
                        return fn(l);
                    } catch (e) {
                        return `[Error: ${e.message}]`;
                    }
                });
                return { result: res, stats: { count: res.length } };
            } catch (e) {
                return { result: [`${i18n.t('tool_js_function_compilation_error')}${e.message}`], error: true };
            }
        }
    },
    {
        id: 'shuffle',
        title: 'tool_shuffle_title',
        icon: 'fas fa-random',
        description: 'tool_shuffle_desc',
        params: [
            { id: 'seed', type: 'text', label: 'tool_shuffle_seed', value: '' }
        ],
        init: (params) => {
            if (!params.seed) {
                params.seed = Math.floor(Math.random() * 1000000).toString();
            }
        },
        process: (lines, params) => {
            const seedVal = parseInt(params.seed) || 0;
            const mulberry32 = (a) => {
                return function () {
                    let t = a += 0x6D2B79F5;
                    t = Math.imul(t ^ t >>> 15, t | 1);
                    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                    return ((t ^ t >>> 14) >>> 0) / 4294967296;
                }
            }
            const random = mulberry32(seedVal);
            const items = [...lines];
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }
            return { result: items, stats: {} };
        }
    },
    {
        id: 'to_hex',
        title: 'tool_to_hex_title',
        icon: 'fas fa-hashtag',
        description: 'tool_to_hex_desc',
        params: [
            {
                id: 'encoding', type: 'select', label: 'tool_to_hex_encoding', options: [
                    { v: 'utf-8', l: 'UTF-8' },
                    { v: 'utf-16le', l: 'UTF-16LE' },
                    { v: 'utf-16be', l: 'UTF-16BE' },
                    { v: 'win1251', l: 'Windows-1251' },
                    { v: 'koi8-r', l: 'KOI8-R' },
                    { v: 'cp866', l: 'CP866' }
                ], value: 'utf-8'
            },
            {
                id: 'format', type: 'select', label: 'tool_to_hex_format', options: [
                    { v: 'plain', l: 'tool_to_hex_plain' },
                    { v: 'spaced', l: 'tool_to_hex_spaced' },
                    { v: 'dump', l: 'tool_to_hex_dump' },
                    { v: 'dump_ascii', l: 'tool_to_hex_dump_ascii' }
                ], value: 'spaced'
            },
            { id: 'uppercase', type: 'checkbox', label: 'tool_to_hex_uppercase', value: true }
        ],
        process: (lines, params) => {
            const res = [];
            const encoder = new TextEncoder();

            const win1251Encode = (str) => {
                const arr = new Uint8Array(str.length);
                for (let i = 0; i < str.length; i++) {
                    const code = str.charCodeAt(i);
                    if (code <= 127) arr[i] = code;
                    else if (code >= 0x0410 && code <= 0x044F) arr[i] = code - 0x0350; // А-я
                    else if (code === 0x0401) arr[i] = 168; // Ё
                    else if (code === 0x0451) arr[i] = 184; // ё
                    else arr[i] = 63; // '?'
                }
                return arr;
            };

            const koi8rEncode = (str) => {
                const koi8Table = {
                    'ё': 0xa3, 'Ё': 0xb3, 'а': 0xc1, 'б': 0xc2, 'в': 0xd7, 'г': 0xc7, 'д': 0xc4, 'е': 0xc5, 'ж': 0xd6, 'з': 0xda,
                    'и': 0xc9, 'й': 0xca, 'к': 0xcb, 'л': 0xcc, 'м': 0xcd, 'н': 0xce, 'о': 0xcf, 'п': 0xd0, 'р': 0xd2, 'с': 0xd3,
                    'т': 0xd4, 'у': 0xd5, 'ф': 0xc6, 'х': 0xc8, 'ц': 0xc3, 'ч': 0xde, 'ш': 0xdb, 'щ': 0xdd, 'ъ': 0xdf, 'ы': 0xd9,
                    'ь': 0xd8, 'э': 0xdc, 'ю': 0xc0, 'я': 0xd1, 'А': 0xe1, 'Б': 0xe2, 'В': 0xf7, 'Г': 0xe7, 'Д': 0xe4, 'Е': 0xe5,
                    'Ж': 0xf6, 'З': 0xfa, 'И': 0xe9, 'Й': 0xea, 'К': 0xeb, 'Л': 0xec, 'М': 0xed, 'Н': 0xee, 'О': 0xef, 'П': 0xf0,
                    'Р': 0xf2, 'С': 0xf3, 'Т': 0xf4, 'У': 0xf5, 'Ф': 0xe6, 'Х': 0xe8, 'Ц': 0xe3, 'Ч': 0xfe, 'Ш': 0xfb, 'Щ': 0xfd,
                    'Ъ': 0xff, 'Ы': 0xf9, 'Ь': 0xf8, 'Э': 0xfc, 'Ю': 0xe0, 'Я': 0xf1
                };
                const arr = new Uint8Array(str.length);
                for (let i = 0; i < str.length; i++) {
                    const char = str[i];
                    const code = str.charCodeAt(i);
                    if (code <= 127) arr[i] = code;
                    else if (koi8Table[char]) arr[i] = koi8Table[char];
                    else arr[i] = 63;
                }
                return arr;
            };

            const cp866Encode = (str) => {
                const arr = new Uint8Array(str.length);
                for (let i = 0; i < str.length; i++) {
                    const code = str.charCodeAt(i);
                    if (code <= 127) arr[i] = code;
                    else if (code >= 0x0410 && code <= 0x042F) arr[i] = code - 0x0390; // А-П
                    else if (code >= 0x0430 && code <= 0x043F) arr[i] = code - 0x0390; // а-п
                    else if (code >= 0x0440 && code <= 0x044F) arr[i] = code - 0x0360; // р-я
                    else if (code === 0x0401) arr[i] = 0xf0; // Ё
                    else if (code === 0x0451) arr[i] = 0xf1; // ё
                    else arr[i] = 63;
                }
                return arr;
            };

            lines.forEach(line => {
                let bytes;
                try {
                    if (params.encoding === 'utf-8') {
                        bytes = encoder.encode(line);
                    } else if (params.encoding === 'utf-16le') {
                        bytes = new Uint8Array(line.length * 2);
                        for (let i = 0; i < line.length; i++) {
                            const code = line.charCodeAt(i);
                            bytes[i * 2] = code & 0xff;
                            bytes[i * 2 + 1] = (code >> 8) & 0xff;
                        }
                    } else if (params.encoding === 'utf-16be') {
                        bytes = new Uint8Array(line.length * 2);
                        for (let i = 0; i < line.length; i++) {
                            const code = line.charCodeAt(i);
                            bytes[i * 2] = (code >> 8) & 0xff;
                            bytes[i * 2 + 1] = code & 0xff;
                        }
                    } else if (params.encoding === 'win1251') {
                        bytes = win1251Encode(line);
                    } else if (params.encoding === 'koi8-r') {
                        bytes = koi8rEncode(line);
                    } else if (params.encoding === 'cp866') {
                        bytes = cp866Encode(line);
                    }
                } catch (e) {
                    res.push(`[${i18n.t('tool_to_hex_error')}${e.message}]`);
                    return;
                }

                if (!bytes) return;

                const toHexStr = (b) => {
                    let h = b.toString(16).padStart(2, '0');
                    return params.uppercase ? h.toUpperCase() : h;
                };

                if (params.format === 'plain') {
                    res.push(Array.from(bytes).map(toHexStr).join(''));
                } else if (params.format === 'spaced') {
                    res.push(Array.from(bytes).map(toHexStr).join(' '));
                } else {
                    const showAscii = params.format === 'dump_ascii';
                    for (let i = 0; i < bytes.length; i += 16) {
                        const chunk = bytes.slice(i, i + 16);
                        const offset = i.toString(16).padStart(8, '0').toUpperCase();
                        const hexParts = Array.from(chunk).map(toHexStr);

                        let hexStr = "";
                        for (let j = 0; j < hexParts.length; j++) {
                            hexStr += hexParts[j] + (j === 7 ? "  " : " ");
                        }

                        const paddedHex = hexStr.padEnd(50, ' ');

                        if (showAscii) {
                            const ascii = Array.from(chunk).map(b => (b >= 32 && b <= 255) ? String.fromCharCode(b) : '.').join('');
                            res.push(`${offset}: ${paddedHex} |${ascii}|`);
                        } else {
                            res.push(`${offset}: ${paddedHex}`);
                        }
                    }
                }
            });

            return { result: res, stats: {} };
        }
    },
    {
        id: 'from_hex',
        title: 'tool_from_hex_title',
        icon: 'fas fa-th-list',
        description: 'tool_from_hex_desc',
        params: [
            {
                id: 'encoding', type: 'select', label: 'tool_from_hex_encoding', options: [
                    { v: 'utf-8', l: 'UTF-8' },
                    { v: 'utf-16le', l: 'UTF-16LE' },
                    { v: 'utf-16be', l: 'UTF-16BE' },
                    { v: 'win1251', l: 'Windows-1251' },
                    { v: 'koi8-r', l: 'KOI8-R' },
                    { v: 'cp866', l: 'CP866' }
                ], value: 'utf-8'
            }
        ],
        process: (lines, params) => {
            const allHex = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                let hPart = line;
                if (line.includes(':')) {
                    const parts = line.split(':');
                    hPart = parts.slice(1).join(':').split('|')[0];
                }

                const invalidMatches = hPart.match(/[^a-fA-F0-9\s]/g);
                if (invalidMatches) {
                    const uniqueInvalid = [...new Set(invalidMatches)];
                    return {
                        result: `${i18n.t('tool_from_hex_invalid_chars')} ${i + 1}: ${uniqueInvalid.join(' ')}`,
                        error: true
                    };
                }

                const hexOnly = hPart.replace(/\s/g, '');
                if (hexOnly.length && hexOnly.length % 2 !== 0) {
                    return {
                        result: `${i18n.t('tool_from_hex_incomplete')} ${i + 1}`,
                        error: true
                    };
                }

                for (let j = 0; j < hexOnly.length; j += 2) {
                    allHex.push(parseInt(hexOnly.substr(j, 2), 16));
                }
            }

            if (allHex.length === 0) {
                return {
                    result: i18n.t('tool_from_hex_not_found'),
                    error: true
                };
            }

            const bytes = new Uint8Array(allHex);
            let decoded = "";

            try {
                if (params.encoding === 'utf-8') {
                    decoded = new TextDecoder('utf-8').decode(bytes);
                } else if (params.encoding === 'utf-16le') {
                    decoded = new TextDecoder('utf-16le').decode(bytes);
                } else if (params.encoding === 'utf-16be') {
                    decoded = new TextDecoder('utf-16be').decode(bytes);
                } else if (params.encoding === 'win1251') {
                    decoded = new TextDecoder('windows-1251').decode(bytes);
                } else if (params.encoding === 'koi8-r') {
                    decoded = new TextDecoder('koi8-r').decode(bytes);
                } else if (params.encoding === 'cp866') {
                    try {
                        decoded = new TextDecoder('ibm866').decode(bytes);
                    } catch (e) {
                        for (let i = 0; i < bytes.length; i++) {
                            const b = bytes[i];
                            if (b <= 127) decoded += String.fromCharCode(b);
                            else if (b >= 128 && b <= 159) decoded += String.fromCharCode(b + 0x0390);
                            else if (b >= 160 && b <= 175) decoded += String.fromCharCode(b + 0x0390);
                            else if (b >= 224 && b <= 239) decoded += String.fromCharCode(b + 0x0360);
                            else if (b === 0xf0) decoded += 'Ё';
                            else if (b === 0xf1) decoded += 'ё';
                            else decoded += '?';
                        }
                    }
                }
            } catch (e) {
                return { result: [`${i18n.t('tool_from_hex_error')}${e.message}`], error: true };
            }

            return { result: decoded.split('\n'), stats: { bytes: bytes.length } };
        }
    },
    {
        id: 'encode',
        title: 'tool_encode_title',
        icon: 'fas fa-link',
        description: 'tool_encode_desc',
        params: [
            {
                id: 'mode', type: 'select', label: 'tool_encode_mode', options: [
                    { v: 'b64encode', l: 'Base64 Encode' },
                    { v: 'b64decode', l: 'Base64 Decode' },
                    { v: 'urlencode', l: 'URL Encode' },
                    { v: 'urldecode', l: 'URL Decode' }
                ], value: 'b64encode'
            }
        ],
        process: (lines, params) => {
            let errors = 0;
            const res = lines.map(line => {
                if (!line) return line;
                try {
                    if (params.mode === 'b64encode') {
                        return btoa(unescape(encodeURIComponent(line)));
                    } else if (params.mode === 'b64decode') {
                        return decodeURIComponent(escape(atob(line)));
                    } else if (params.mode === 'urlencode') {
                        return encodeURIComponent(line);
                    } else if (params.mode === 'urldecode') {
                        return decodeURIComponent(line);
                    }
                } catch (e) {
                    errors++;
                    return `[${i18n.t('tool_encode_error')}${e.message}]`;
                }
                return line;
            });
            return { result: res, stats: errors > 0 ? { errors } : {} };
        }
    },
    {
        id: 'hash',
        title: 'tool_hash_title',
        icon: 'fas fa-fingerprint',
        description: 'tool_hash_desc',
        params: [
            {
                id: 'algorithm', type: 'select', label: 'tool_hash_algorithm', options: [
                    { v: 'crc32', l: 'CRC32' },
                    { v: 'md5', l: 'MD5' },
                    { v: 'sha1', l: 'SHA-1' },
                    { v: 'sha224', l: 'SHA-224' },
                    { v: 'sha256', l: 'SHA-256' },
                    { v: 'sha384', l: 'SHA-384' },
                    { v: 'sha512', l: 'SHA-512' },
                    { v: 'sha3', l: 'SHA-3' },
                    { v: 'ripemd160', l: 'RIPEMD-160' }
                ], value: 'md5'
            }
        ],
        process: (lines, params) => {
            if (params.algorithm !== 'crc32' && typeof CryptoJS === 'undefined') {
                return { result: [i18n.t('tool_hash_lib_error')], error: true };
            }

            const makeCRCTable = function () {
                let c;
                let crcTable = [];
                for (let n = 0; n < 256; n++) {
                    c = n;
                    for (let k = 0; k < 8; k++) {
                        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
                    }
                    crcTable[n] = c;
                }
                return crcTable;
            };
            let crcTable = null;

            let errors = 0;
            const res = lines.map(line => {
                let h = '';
                try {
                    if (params.algorithm === 'crc32') {
                        if (!crcTable) crcTable = makeCRCTable();
                        let crc = 0 ^ (-1);
                        const encoder = new TextEncoder();
                        const bytes = encoder.encode(line);
                        for (let i = 0; i < bytes.length; i++) {
                            crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
                        }
                        const crcNum = (crc ^ (-1)) >>> 0;
                        h = crcNum.toString(16).padStart(8, '0');
                    } else if (params.algorithm === 'md5') {
                        h = CryptoJS.MD5(line).toString();
                    } else if (params.algorithm === 'sha1') {
                        h = CryptoJS.SHA1(line).toString();
                    } else if (params.algorithm === 'sha224') {
                        h = CryptoJS.SHA224(line).toString();
                    } else if (params.algorithm === 'sha256') {
                        h = CryptoJS.SHA256(line).toString();
                    } else if (params.algorithm === 'sha384') {
                        h = CryptoJS.SHA384(line).toString();
                    } else if (params.algorithm === 'sha512') {
                        h = CryptoJS.SHA512(line).toString();
                    } else if (params.algorithm === 'sha3') {
                        h = CryptoJS.SHA3(line).toString();
                    } else if (params.algorithm === 'ripemd160') {
                        h = CryptoJS.RIPEMD160(line).toString();
                    }
                } catch (e) {
                    errors++;
                    return `[${i18n.t('tool_encode_error')}${e.message}]`;
                }
                return h;
            });
            return { result: res, stats: errors > 0 ? { errors } : {} };
        }
    },
    {
        id: 'debug_view',
        title: 'tool_debug_title',
        icon: 'fas fa-bug',
        description: 'tool_debug_desc',
        params: [
            { id: 'showSpaces', type: 'checkbox', label: 'tool_debug_spaces', value: true },
            { id: 'showTabs', type: 'checkbox', label: 'tool_debug_tabs', value: true },
            { id: 'showLineNumbers', type: 'checkbox', label: 'tool_debug_numbers', value: false }
        ],
        process: (lines, params) => {
            let spaces = 0;
            let tabs = 0;

            lines.forEach(line => {
                spaces += (line.match(/ /g) || []).length;
                tabs += (line.match(/\t/g) || []).length;
            });

            const maxDigits = lines.length.toString().length;
            const visualized = lines.slice(0, 50).map((line, idx) => {
                let s = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                if (params.showSpaces) s = s.replace(/ /g, '<span class="debug-char space">·</span>');
                if (params.showTabs) s = s.replace(/\t/g, '<span class="debug-char tab">→</span>\t');

                s = s.replace(/\r/g, '<span class="debug-char break">\\r</span>');
                s = s.replace(/\n/g, '<span class="debug-char break">\\n</span>\n');

                if (params.showLineNumbers) {
                    const num = (idx + 1).toString().padStart(maxDigits, ' ');
                    return `<div class="debug-line"><span class="debug-line-num">${num}</span><span class="debug-line-text">${s}</span></div>`;
                }
                return `<div class="debug-line"><span class="debug-line-text">${s}</span></div>`;
            });

            return {
                result: lines,
                stats: {
                    '_html': visualized.join('') + (lines.length > 50 ? '<div class="debug-line"><span class="debug-line-text">...</span></div>' : '')
                }
            };
        }
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TOOLS;
}
