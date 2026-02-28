const TOOLS = [
    {
        id: 'regex',
        title: 'Поиск и замена (Regex)',
        icon: 'fas fa-search',
        description: 'Замена по регулярному выражению',
        params: [
            { id: 'pattern', type: 'text', label: 'Regex Pattern', placeholder: '\\d+', value: '\\d+' },
            { id: 'replacement', type: 'text', label: 'Replacement', placeholder: '[$1]', value: '' },
            { id: 'flags', type: 'text', label: 'Flags', placeholder: 'g', value: 'g' }
        ],
        help: 'https://ru.wikipedia.org/wiki/Регулярные_выражения',
        process: (lines, params) => {
            if (!params.pattern) return { result: lines, stats: { msg: 'Pattern empty' } };
            try {
                const regex = new RegExp(params.pattern, params.flags || 'g');
                let count = 0;
                const result = lines.map(line => {
                    const m = line.match(regex);
                    if (m) count += m.length;
                    return line.replace(regex, params.replacement || '');
                });
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
            { id: 'order', type: 'select', label: 'Порядок', options: [{ v: 'asc', l: 'A-Z' }, { v: 'desc', l: 'Z-A' }, { v: 'num-asc', l: '0-9' }, { v: 'num-desc', l: '9-0' }], value: 'asc' }
        ],
        process: (lines, params) => {
            let items = [...lines].filter(x => x.trim());

            if (params.order.includes('num')) {
                items.sort((a, b) => {
                    const na = parseFloat(a);
                    const nb = parseFloat(b);
                    if (isNaN(na)) return 1;
                    if (isNaN(nb)) return -1;
                    return params.order === 'num-asc' ? na - nb : nb - na;
                });
            } else {
                items.sort((a, b) => params.order === 'asc' ? a.localeCompare(b) : b.localeCompare(a));
            }

            return { result: items, stats: { count: items.length } };
        }
    },
    {
        id: 'compare',
        title: 'Сравнение (Diff)',
        icon: 'fas fa-exchange-alt',
        description: 'Сравнить входящий текст со вторым списком',
        // Secondary input essentially acts as a parameter here since it's user provided
        params: [
            { id: 'list2', type: 'textarea', label: 'Список B (для сравнения)', placeholder: 'Строки для сравнения...', value: '' },
            { id: 'operation', type: 'select', label: 'Показать', options: [{ v: 'common', l: 'Только общие' }, { v: 'diff', l: 'Только различия (A-B)' }, { v: 'all', l: 'Все с пометками' }], value: 'common' },
            { id: 'delimiter', type: 'select', label: 'Разделитель списка B', options: [{ v: '\\n', l: 'Новая строка' }], value: '\\n' }
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
            return { result: [res], stats: { original: lines.length } };
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
        description: 'Добавляет строку в начало или конец списка',
        params: [
            { id: 'content', type: 'text', label: 'Текст строки', value: '' },
            { id: 'position', type: 'select', label: 'Позиция', options: [{ v: 'start', l: 'В начало' }, { v: 'end', l: 'В конец' }], value: 'end' }
        ],
        process: (lines, params) => {
            const line = params.content || '';
            const res = params.position === 'start' ? [line, ...lines] : [...lines, line];
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
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TOOLS;
}
