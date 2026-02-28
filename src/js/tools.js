const TOOLS = [
    {
        id: 'regex',
        title: 'Поиск и замена (Regex)',
        icon: 'fas fa-search',
        description: 'Замена по регулярному выражению',
        params: [
            { id: 'pattern', type: 'text', label: 'Регулярное выражение', placeholder: '\\d+', value: '\\d+' },
            { id: 'replacement', type: 'text', label: 'Заменить на ($1, $2...)', placeholder: '[$1]', value: '' },
            { id: 'caseInsensitive', type: 'checkbox', label: 'Без учета регистра', value: false },
            { id: 'onlyMatched', type: 'checkbox', label: 'Оставить только совпадения', value: false }
        ],
        help: 'https://ru.wikipedia.org/wiki/Регулярные_выражения',
        process: (lines, params) => {
            if (!params.pattern) return { result: lines, stats: { msg: 'Пустой паттерн' } };
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
                                    // Применяем замену к самому найденному совпадению
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
        title: 'Удаление дубликатов',
        icon: 'fas fa-clone',
        description: 'Оставляет только уникальные строки',
        params: [
            { id: 'trim', type: 'checkbox', label: 'Trim пробелы', value: true }
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
        title: 'Сортировка',
        icon: 'fas fa-sort-alpha-down',
        description: 'Сортирует список',
        params: [
            {
                id: 'mode', type: 'select', label: 'Режим', options: [
                    { v: 'text', l: 'Текст' },
                    { v: 'numeric', l: 'Числа' },
                    { v: 'smart', l: 'Умная (Числа внутри)' }
                ], value: 'text'
            },
            {
                id: 'direction', type: 'select', label: 'Направление', options: [
                    { v: 'asc', l: 'По возрастанию (A-Z)' },
                    { v: 'desc', l: 'По убыванию (Z-A)' }
                ], value: 'asc'
            },
            { id: 'caseInsensitive', type: 'checkbox', label: 'Игнорировать регистр', value: false }
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
                return s1.localeCompare(s2, undefined, collatorOptions);
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
                    if (isANum) return -1; // Числа всегда вначале
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
        title: 'Разворот (Reverse)',
        icon: 'fas fa-arrows-alt-v',
        description: 'Переворачивает список строк в обратном порядке',
        params: [],
        process: (lines) => {
            return { result: [...lines].reverse(), stats: {} };
        }
    },
    {
        id: 'compare',
        title: 'Сравнение (Diff)',
        icon: 'fas fa-exchange-alt',
        description: 'Сравнить входящий текст со вторым списком',
        // Secondary input essentially acts as a parameter here since it's user provided
        params: [
            { id: 'list2', type: 'textarea', label: 'Список для сравнения', placeholder: 'Строки для сравнения...', value: '' },
            { id: 'delimiter', type: 'select', label: 'Разделитель списка', options: [{ v: '\\n', l: 'Новая строка' }], value: '\\n' },
            { id: 'operation', type: 'select', label: 'Показать', options: [{ v: 'common', l: 'Только общие' }, { v: 'diff', l: 'Только различия (A-B)' }, { v: 'all', l: 'Все с пометками' }], value: 'common' }
        ],
        process: (lines, params) => {
            const delim = params.delimiter === '\\n' ? '\n' : params.delimiter;
            const setA = new Set(lines.map(x => x.trim()).filter(x => x));
            const listB = (params.list2 || '').split(delim).map(x => x.trim()).filter(x => x);
            const setB = new Set(listB);

            let resultLines = [];

            if (params.operation === 'common') {
                // Intersection
                resultLines = [...setA].filter(x => setB.has(x));
            } else if (params.operation === 'diff') {
                // A minus B
                resultLines = [...setA].filter(x => !setB.has(x));
            } else {
                // All with marks
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
        title: 'Найти дубликаты',
        icon: 'fas fa-copy',
        description: 'Показывает только повторяющиеся строки',
        params: [
            { id: 'showCounts', type: 'checkbox', label: 'Показывать количество', value: true }
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

            if (resultArr.length === 0) return { result: ['(Нет дубликатов)'], stats: { duplicates: 0 } };

            return { result: resultArr, stats: { duplicates: resultArr.length } };
        }
    },
    {
        id: 'filter',
        title: 'Фильтр строк',
        icon: 'fas fa-filter',
        description: 'Оставить/Удалить строки по условию',
        params: [
            { id: 'query', type: 'text', label: 'Текст поиска', value: '' },
            { id: 'mode', type: 'select', label: 'Режим', options: [{ v: 'contains', l: 'Содержит' }, { v: 'not_contains', l: 'Не содержит' }, { v: 'starts', l: 'Начинается с' }, { v: 'ends', l: 'Заканчивается на' }], value: 'contains' }
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

            return { result: res.length ? res : ['(пусто)'], stats: { matched: res.length, removed: lines.length - res.length } };
        }
    },
    {
        id: 'csv',
        title: 'CSV Парсер',
        icon: 'fas fa-file-csv',
        description: 'Преобразование CSV в текст по шаблону',
        params: [
            { id: 'delimiter', type: 'text', label: 'Разделитель CSV (; или ,)', value: ';' },
            { id: 'template', type: 'text', label: 'Шаблон ($1, $2...)', value: '$1 - $2' },
            { id: 'skipHeader', type: 'checkbox', label: 'Пропустить заголовок', value: false }
        ],
        process: (lines, params) => {
            const delim = params.delimiter || ';';
            const start = params.skipHeader ? 1 : 0;
            const validLines = lines.filter(l => l.trim());

            const res = [];
            for (let i = start; i < validLines.length; i++) {
                // Simple split, doesn't handle quoted delimiters correctly but matches original simple logic mostly
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
        title: 'Регистр',
        icon: 'fas fa-font',
        description: 'UPPERCASE, lowercase, Capitalize',
        params: [
            { id: 'mode', type: 'select', label: 'Режим', options: [{ v: 'upper', l: 'ВСЕ ЗАГЛАВНЫЕ' }, { v: 'lower', l: 'все строчные' }, { v: 'cap', l: 'Начало Предложения' }, { v: 'word', l: 'Каждое Слово' }], value: 'lower' }
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
        title: 'Обертка (Prefix/Suffix)',
        icon: 'fas fa-box',
        description: 'Добавить текст в начало/конец каждой строки',
        params: [
            { id: 'prefix', type: 'text', label: 'Префикс', value: '' },
            { id: 'suffix', type: 'text', label: 'Суффикс', value: '' }
        ],
        process: (lines, params) => {
            const res = lines.map(l => (params.prefix || '') + l + (params.suffix || ''));
            return { result: res, stats: {} };
        }
    },
    {
        id: 'trim',
        title: 'Обрезка (Trim)',
        icon: 'fas fa-cut',
        description: 'Удаляет пробелы с краев каждой строки',
        params: [
            { id: 'mode', type: 'select', label: 'Режим', options: [{ v: 'both', l: 'С обеих сторон' }, { v: 'left', l: 'Слева' }, { v: 'right', l: 'Справа' }], value: 'both' }
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
        title: 'AI Cleaner',
        icon: 'fas fa-magic',
        description: 'Очистка типографики и спецсимволов',
        params: [
            { id: 'replaceStr', type: 'text', label: 'Заменять мусор на', value: '' }
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
        title: 'Форматирование JSON',
        icon: 'fas fa-code',
        description: 'Превращает текст в красивый JSON',
        params: [
            { id: 'indent', type: 'select', label: 'Отступ', options: [{ v: '2', l: '2 пробела' }, { v: '4', l: '4 пробела' }, { v: 'tab', l: 'Табуляция' }, { v: '0', l: 'Минифицировать' }], value: '2' },
            { id: 'joinDelim', type: 'select', label: 'Разделитель склейки', options: [{ v: '\\n', l: 'Новая строка' }, { v: '', l: 'Без разделителя' }, { v: ' ', l: 'Пробел' }], value: '\\n' }
        ],
        process: (lines, params) => {
            const joinD = params.joinDelim === '\\n' ? '\n' : params.joinDelim;
            const combined = lines.join(joinD);

            if (!combined.trim()) return { result: lines, stats: { msg: 'Пустой ввод' } };

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

            // Always split by \n since standard stringify produces newline separated lines if space > 0
            const resLines = formatted.split('\n');


            return { result: resLines, stats: { lines: resLines.length } };
        }
    },
    {
        id: 'json_path',
        title: 'Извлечение (JSONPath)',
        icon: 'fas fa-sitemap',
        description: 'Извлекает элементы из JSON-текста (напр. $.users[*].name)',
        params: [
            { id: 'query', type: 'text', label: 'JSONPath запрос', value: '$.*' },
            { id: 'inputMode', type: 'select', label: 'Входные данные', options: [{ v: 'combined', l: 'Все строки как один JSON' }, { v: 'lines', l: 'Каждая строка - отдельный JSON' }], value: 'combined' },
            { id: 'joinDelim', type: 'select', label: 'Разделитель склейки', options: [{ v: '\\n', l: 'Новая строка' }, { v: '', l: 'Без разделителя' }, { v: ' ', l: 'Пробел' }], value: '\\n' },
            { id: 'stringify', type: 'checkbox', label: 'Оборачивать объекты в JSON', value: true }
        ],
        help: 'https://jsonpath.com/',
        process: (lines, params) => {
            if (typeof jsonpath === 'undefined') {
                return { result: ['Библиотека jsonpath не загружена! Проверьте интернет-соединение.'], error: true };
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

                    if (!combined.trim()) return { result: lines, stats: { msg: 'Пустой ввод' } };

                    let parsed;
                    try {
                        parsed = JSON.parse(combined);
                    } catch (e) {
                        return { result: [`Ошибка парсинга JSON: ${e.message}`], error: true };
                    }

                    const jpResult = jsonpath.query(parsed, params.query || '$.*');
                    resLines = jpResult.map(stringifyItem);
                    return { result: resLines, stats: { items: resLines.length } };
                }
            } catch (e) {
                return { result: [`Ошибка JSONPath: ${e.message}`], error: true };
            }
        }
    },
    {
        id: 'join',
        title: 'Объединить строки (Join)',
        icon: 'fas fa-link',
        description: 'Собирает список в одну строку',
        params: [
            { id: 'prefix', type: 'text', label: 'Первые символы', value: '' },
            { id: 'delimiter', type: 'text', label: 'Разделитель', value: ', ' },
            { id: 'lastDelimiter', type: 'text', label: 'Последний разделитель', value: ' и ' },
            { id: 'suffix', type: 'text', label: 'Последние символы', value: '' }
        ],
        process: (lines, params) => {
            if (lines.length === 0) return { result: [''], stats: { count: 0 } };
            let res = '';
            if (lines.length === 1) {
                res = (params.prefix || '') + lines[0] + (params.suffix || '');
            } else {
                const allButLast = lines.slice(0, -1).join(params.delimiter || '');
                res = (params.prefix || '') + allButLast + (params.lastDelimiter || '') + lines[lines.length - 1] + (params.suffix || '');
            }
            return { result: [res], stats: {} };
        }
    },
    {
        id: 'split',
        title: 'Разбить строку (Split)',
        icon: 'fas fa-columns',
        description: 'Разбивает строки по разделителю',
        params: [
            { id: 'delimiter', type: 'text', label: 'Разделитель', value: ',' }
        ],
        process: (lines, params) => {
            const delim = params.delimiter || ',';
            const res = lines.flatMap(l => l.split(delim));
            return { result: res, stats: { count: res.length } };
        }
    },
    {
        id: 'add_line',
        title: 'Добавить строку',
        icon: 'fas fa-plus-square',
        description: 'Добавляет строки в начало, конец списка и/или между строк',
        params: [
            { id: 'startLine', type: 'text', label: 'Первая строка', value: '' },
            { id: 'betweenLines', type: 'text', label: 'Между строк', value: '' },
            { id: 'endLine', type: 'text', label: 'Последняя строка', value: '' }
        ],
        process: (lines, params) => {
            let res = [];

            // Поддержка старых цепочек для обратной совместимости
            let start = params.startLine || '';
            let between = params.betweenLines || '';
            let end = params.endLine || '';

            if (params.content !== undefined && params.position !== undefined) {
                if (params.position === 'start' && !start) start = params.content;
                if (params.position === 'between' && !between) between = params.content;
                if (params.position === 'end' && !end) end = params.content;
            }

            if (start !== '') res.push(start);

            for (let i = 0; i < lines.length; i++) {
                res.push(lines[i]);
                if (i < lines.length - 1 && between !== '') {
                }
                res.push(between);
            }

            if (end !== '') res.push(end);

            return { result: res, stats: {} };
        }
    },
    {
        id: 'template',
        title: 'Шаблонизатор (Nunjucks)',
        icon: 'fas fa-terminal',
        description: 'Генерация по шаблону (доступны body и lines)',
        params: [
            { id: 'tpl', type: 'textarea', label: 'Шаблон Nunjucks (доступны body и lines)', value: '{% for line in lines %}\n- {{ line }}\n{% endfor %}' }
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
        title: 'Функция (JS)',
        icon: 'fas fa-code',
        description: 'Свой JS код для обработки каждой строки',
        params: [
            { id: 'code', type: 'textarea', label: 'Код функции (аргумент line)', value: 'return line.toUpperCase();' }
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
                return { result: [`Ошибка компиляции: ${e.message}`], error: true };
            }
        }
    },
    {
        id: 'shuffle',
        title: 'Случайная сортировка',
        icon: 'fas fa-random',
        description: 'Перемешивает строки в случайном порядке',
        params: [
            { id: 'seed', type: 'text', label: 'Seed (число)', value: '' }
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
        title: 'В HEX (To Hex)',
        icon: 'fas fa-hashtag',
        description: 'Преобразует текст в шестнадцатеричный код',
        params: [
            {
                id: 'encoding', type: 'select', label: 'Кодировка', options: [
                    { v: 'utf-8', l: 'UTF-8' },
                    { v: 'utf-16le', l: 'UTF-16LE' },
                    { v: 'utf-16be', l: 'UTF-16BE' },
                    { v: 'win1251', l: 'Windows-1251' },
                    { v: 'koi8-r', l: 'KOI8-R' },
                    { v: 'cp866', l: 'CP866' }
                ], value: 'utf-8'
            },
            {
                id: 'format', type: 'select', label: 'Формат', options: [
                    { v: 'plain', l: 'Слитная строка (xxyyzz)' },
                    { v: 'spaced', l: 'Через пробел (xx yy zz)' },
                    { v: 'dump', l: 'Дамп (смещение + 16 байт)' },
                    { v: 'dump_ascii', l: 'Дамп + ASCII' }
                ], value: 'spaced'
            },
            { id: 'uppercase', type: 'checkbox', label: 'Заглавные буквы (A-F)', value: true }
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
                    res.push(`[Ошибка кодирования: ${e.message}]`);
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

                        // Add extra space after 8th byte for readability in dump
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
        title: 'ИЗ HEX (From Hex)',
        icon: 'fas fa-th-list',
        description: 'Преобразует шестнадцатеричный код обратно в текст',
        params: [
            {
                id: 'encoding', type: 'select', label: 'Кодировка байт', options: [
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
                    // Everything after the first colon is the hex part, but before the optional |
                    hPart = parts.slice(1).join(':').split('|')[0];
                }

                // Check for invalid characters in the hex part
                const invalidMatches = hPart.match(/[^a-fA-F0-9\s]/g);
                if (invalidMatches) {
                    const uniqueInvalid = [...new Set(invalidMatches)];
                    return {
                        result: `Обнаружены недопустимые символы в HEX данных на строке ${i + 1}: ${uniqueInvalid.join(' ')}`,
                        error: true
                    };
                }

                const hexOnly = hPart.replace(/\s/g, '');
                if (hexOnly.length && hexOnly.length % 2 !== 0) {
                    return {
                        result: `Неполный байт (нечетное количество символов) на строке ${i + 1}`,
                        error: true
                    };
                }

                for (let j = 0; j < hexOnly.length; j += 2) {
                    allHex.push(parseInt(hexOnly.substr(j, 2), 16));
                }
            }

            if (allHex.length === 0) {
                return {
                    result: 'HEX данные не найдены. Поддерживаемые форматы: "xx yy zz", "xxyyzz" или дамп "0000: xx yy zz |ascii|"',
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
                return { result: [`Ошибка декодирования: ${e.message}`], error: true };
            }

            return { result: decoded.split('\n'), stats: { bytes: bytes.length } };
        }
    },
    {
        id: 'encode',
        title: 'Кодирование (Base64/URL)',
        icon: 'fas fa-link',
        description: 'Кодирование и декодирование (Base64, URL)',
        params: [
            {
                id: 'mode', type: 'select', label: 'Действие', options: [
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
                    return `[Ошибка: ${e.message}]`;
                }
                return line;
            });
            return { result: res, stats: errors > 0 ? { errors } : {} };
        }
    },
    {
        id: 'hash',
        title: 'Хеширование',
        icon: 'fas fa-fingerprint',
        description: 'Вычисляет CRC32, MD5, SHA-1, SHA-256, SHA-384, SHA-512',
        params: [
            {
                id: 'algorithm', type: 'select', label: 'Алгоритм', options: [
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
                return { result: ['Библиотека CryptoJS не загружена! Проверьте интернет-соединение.'], error: true };
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
                    return `[Ошибка: ${e.message}]`;
                }
                return h;
            });
            return { result: res, stats: errors > 0 ? { errors } : {} };
        }
    },
    {
        id: 'debug_view',
        title: 'Отладка (Debug View)',
        icon: 'fas fa-bug',
        description: 'Визуализирует невидимые символы (пробелы, табы, переносы)',
        params: [
            { id: 'showSpaces', type: 'checkbox', label: 'Показывать пробелы (·)', value: true },
            { id: 'showTabs', type: 'checkbox', label: 'Показывать табы (→)', value: true },
            //            { id: 'showLineBreaks', type: 'checkbox', label: 'Показывать переносы (↵)', value: true },
            { id: 'showLineNumbers', type: 'checkbox', label: 'Номера строк', value: false }
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
