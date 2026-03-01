const TRANSLATIONS = {
    en: {
        app_description: "StringLOM — visual text pipeline. Block chains: Regex, JSON, CSV, sorting. Instant results, 100% in-browser, no server. Drag & drop, private, no installation.",
        menu_title: "Menu",
        home_page: "Home Page",
        download_latest: "Download Latest Release",
        theme_dark: "Dark Theme",
        theme_light: "Light Theme",
        version: "Version:",
        create: "Create",
        create_title: "Create new chain (Alt + N)",
        import: "Import",
        import_title: "Import chain (Alt + I)",
        saved_chains: "Saved Chains",
        toggle_saved: "Collapse/Expand",
        new_chain: "New Chain",
        save: "Save",
        save_title: "Save current chain (Alt + S)",
        share: "Share",
        share_title: "Share chain",
        export: "Export",
        export_title: "Export chain settings (Alt + E)",
        final_result: "Final Result",
        download_final: "Download result",
        copy_final: "Copy result",
        output_delimiter: "Output Delimiter",
        newline: "New Line",
        comma: "Comma",
        semicolon: "Semicolon",
        space: "Space",
        custom: "Custom...",
        custom_placeholder: "Text...",
        select_tool: "Select Tool",
        search_tools: "Search tools (2+ characters)...",
        confirmation: "Confirmation",
        cancel: "Cancel",
        confirm: "Confirm",
        input_data: "Data Input",
        enter_value: "Enter value...",
        ok: "OK",
        attention: "Attention",
        close: "Close",
        delete_chain_confirm: "Are you sure you want to delete the saved chain?",
        switch_chain_confirm: "Switch to another chain? All unsaved changes to the current one will be lost.",
        new_chain_confirm: "Create a new chain? All unsaved changes to the current one will be lost.",
        no_saved_chains: "No saved chains",
        delete: "Delete",
        default_source_text: "Example line\nSecond line\n123",
        block_removed: "Block removed",
        restore_block: "Restore block",
        add_block: "Add block",
        expand_blocks: "Expand blocks",
        collapse_blocks: "Collapse blocks",
        drag_to_move: "Drag to move",
        load_from_file: "Load from file",
        help: "Help",
        add_block_above: "Add block above (Alt + B)",
        add_block_below: "Add block below (Alt + A)",
        remove_block_alt: "Remove block (Alt + Delete)",
        source_placeholder: "Enter text here (or drag file here)...",
        line_delimiter: "Line Delimiter",
        lines_count: "Lines:",
        add_without_closing: "Add without closing",
        created: "Created",
        saved: "Saved",
        exported: "Exported",
        copied: "Copied",
        share_error: "Error creating link",
        copy_clipboard_error: "Failed to copy to clipboard. Use export to file or copy manually.",
        import_prompt: "Paste previously copied chain code (JSON):",
        invalid_chain_format: "Invalid chain format",
        import_error: "Import error: Invalid data format",
        enter_chain_name: "Enter a name for this chain:",
        rename_title: "Click to rename (Alt + R)",
        chain_name_placeholder: "Chain name...",

        // Categories
        cat_search_clean: "Search and Clean",
        cat_remove_filter: "Remove and Filter",
        cat_order_compare: "Order and Compare",
        cat_text_transform: "Text Transformation",
        cat_formats: "Work with Formats",
        cat_assembly_templates: "Assembly and Templates",

        // Tools
        tool_regex_title: "Search and Replace (Regex)",
        tool_regex_desc: "Replace using regular expression",
        tool_regex_pattern: "Regular Expression",
        tool_regex_replacement: "Replace with ($1, $2...)",
        tool_regex_case: "Case insensitive",
        tool_regex_only_matched: "Only matched",
        tool_regex_empty: "Empty pattern",

        tool_dedup_title: "Remove Duplicates",
        tool_dedup_desc: "Keeps only unique lines",
        tool_dedup_trim: "Trim spaces",

        tool_sort_title: "Sort",
        tool_sort_desc: "Sorts the list",
        tool_sort_mode: "Mode",
        tool_sort_text: "Text",
        tool_sort_numeric: "Numeric",
        tool_sort_smart: "Smart (Numbers inside)",
        tool_sort_direction: "Direction",
        tool_sort_asc: "Ascending (A-Z)",
        tool_sort_desc: "Descending (Z-A)",
        tool_sort_case: "Ignore case",

        tool_reverse_title: "Reverse",
        tool_reverse_desc: "Reverses the list of lines",

        tool_compare_title: "Compare (Diff)",
        tool_compare_desc: "Compare incoming text with a second list",
        tool_compare_list2: "List for comparison",
        tool_compare_placeholder: "Lines for comparison...",
        tool_compare_delimiter: "List delimiter",
        tool_compare_show: "Show",
        tool_compare_common: "Only common",
        tool_compare_diff: "Only differences (A-B)",
        tool_compare_all: "All with marks",

        tool_duplicates_title: "Find Duplicates",
        tool_duplicates_desc: "Shows only repeating lines",
        tool_duplicates_show_counts: "Show counts",
        tool_duplicates_none: "(No duplicates)",

        tool_filter_title: "Line Filter",
        tool_filter_desc: "Keep/Remove lines by condition",
        tool_filter_query: "Search text",
        tool_filter_contains: "Contains",
        tool_filter_not_contains: "Does not contain",
        tool_filter_starts: "Starts with",
        tool_filter_ends: "Ends with",

        tool_csv_title: "CSV Parser",
        tool_csv_desc: "Convert CSV to text by template",
        tool_csv_delimiter: "CSV Delimiter (; or ,)",
        tool_csv_template: "Template ($1, $2...)",
        tool_csv_skip_header: "Skip header",

        tool_case_title: "Case",
        tool_case_desc: "UPPERCASE, lowercase, Capitalize",
        tool_case_upper: "UPPERCASE",
        tool_case_lower: "lowercase",
        tool_case_cap: "Sentence Case",
        tool_case_word: "Each Word",

        tool_wrapper_title: "Wrapper (Prefix/Suffix)",
        tool_wrapper_desc: "Add text to the beginning/end of each line",
        tool_wrapper_prefix: "Prefix",
        tool_wrapper_suffix: "Suffix",

        tool_trim_title: "Trim",
        tool_trim_desc: "Removes spaces from the edges of each line",
        tool_trim_both: "Both sides",
        tool_trim_left: "Left side",
        tool_trim_right: "Right side",

        tool_ai_cleaner_title: "AI Cleaner",
        tool_ai_cleaner_desc: "Cleanup typography and special characters",
        tool_ai_cleaner_replace: "Replace junk with",

        tool_json_format_title: "JSON Formatting",
        tool_json_format_desc: "Turns text into pretty JSON",
        tool_json_format_indent: "Indent",
        tool_json_format_2spaces: "2 spaces",
        tool_json_format_4spaces: "4 spaces",
        tool_json_format_tab: "Tabulation",
        tool_json_format_minify: "Minify",
        tool_json_format_join: "Join delimiter",
        tool_json_format_empty: "Empty input",

        tool_json_path_title: "Extraction (JSONPath)",
        tool_json_path_desc: "Extracts elements from JSON text (e.g. $.users[*].name)",
        tool_json_path_query: "JSONPath query",
        tool_json_path_input_mode: "Input data",
        tool_json_path_combined: "All lines as one JSON",
        tool_json_path_lines: "Each line as separate JSON",
        tool_json_path_stringify: "Wrap objects in JSON",
        tool_json_path_lib_error: "JSONPath library not loaded! Check internet connection.",
        tool_json_path_parse_error: "JSON parse error: ",
        tool_json_path_error: "JSONPath error: ",

        tool_join_title: "Join Lines",
        tool_join_desc: "Assembles list into a single string",
        tool_join_prefix: "First characters",
        tool_join_last_delimiter: "Last delimiter",
        tool_join_suffix: "Last characters",
        tool_join_and: " and ",

        tool_split_title: "Split String",
        tool_split_desc: "Splits lines by delimiter",

        tool_add_line_title: "Add Line",
        tool_add_line_desc: "Adds lines to the beginning, end of the list and/or between lines",
        tool_add_line_start: "First line",
        tool_add_line_between: "Between lines",
        tool_add_line_end: "Last line",

        tool_template_title: "Templatizer (Nunjucks)",
        tool_template_desc: "Generation by template (body and lines available)",
        tool_template_tpl: "Nunjucks template (body and lines available)",

        tool_js_function_title: "Function (JS)",
        tool_js_function_desc: "Custom JS code for each line processing",
        tool_js_function_code: "Function code (argument 'line')",
        tool_js_function_compilation_error: "Compilation error: ",

        tool_shuffle_title: "Random Shuffle",
        tool_shuffle_desc: "Shuffles lines in random order",
        tool_shuffle_seed: "Seed (number)",

        tool_to_hex_title: "To HEX",
        tool_to_hex_desc: "Convert text to hexadecimal code",
        tool_to_hex_encoding: "Encoding",
        tool_to_hex_format: "Format",
        tool_to_hex_plain: "Plain string (xxyyzz)",
        tool_to_hex_spaced: "With spaces (xx yy zz)",
        tool_to_hex_dump: "Dump (offset + 16 bytes)",
        tool_to_hex_dump_ascii: "Dump + ASCII",
        tool_to_hex_uppercase: "Uppercase letters (A-F)",
        tool_to_hex_error: "Encoding error: ",

        tool_from_hex_title: "From HEX",
        tool_from_hex_desc: "Convert hexadecimal code back to text",
        tool_from_hex_encoding: "Byte encoding",
        tool_from_hex_invalid_chars: "Invalid characters detected in HEX data on line",
        tool_from_hex_incomplete: "Incomplete byte (odd number of characters) on line",
        tool_from_hex_not_found: "HEX data not found. Supported formats: \"xx yy zz\", \"xxyyzz\" or dump \"0000: xx yy zz |ascii|\"",
        tool_from_hex_error: "Decoding error: ",

        tool_encode_title: "Encoding (Base64/URL)",
        tool_encode_desc: "Encoding and decoding (Base64, URL)",
        tool_encode_mode: "Action",
        tool_encode_error: "Error: ",

        tool_hash_title: "Hashing",
        tool_hash_desc: "Calculates CRC32, MD5, SHA-1, SHA-256, SHA-384, SHA-512",
        tool_hash_algorithm: "Algorithm",
        tool_hash_lib_error: "CryptoJS library not loaded! Check internet connection.",

        tool_debug_title: "Debug View",
        tool_debug_desc: "Visualizes invisible characters (spaces, tabs, breaks)",
        tool_debug_spaces: "Show spaces (·)",
        tool_debug_tabs: "Show tabs (→)",
        tool_debug_numbers: "Line numbers"
    },
    ru: {
        app_description: "StringLOM — визуальный конвейер для текста. Цепочки блоков: Regex, JSON, CSV, sorting. Результат мгновенно, 100% в браузере, без сервера. drag&drop, приватно, без установки.",
        menu_title: "Меню",
        home_page: "Домашняя страница",
        download_latest: "Скачать последний релиз",
        theme_dark: "Темная тема",
        theme_light: "Светлая тема",
        version: "Версия:",
        create: "Создать",
        create_title: "Создать новую цепочку (Alt + N)",
        import: "Импортировать",
        import_title: "Импортировать цепочку (Alt + I)",
        saved_chains: "Сохраненные цепочки",
        toggle_saved: "Свернуть/Развернуть",
        new_chain: "Новая цепочка",
        save: "Сохранить",
        save_title: "Сохранить текущую цепочку (Alt + S)",
        share: "Поделиться",
        share_title: "Поделиться цепочкой",
        export: "Экспортировать",
        export_title: "Экспортировать настройки цепочки (Alt + E)",
        final_result: "Финальный результат",
        download_final: "Скачать результат",
        copy_final: "Копировать результат",
        output_delimiter: "Разделитель при выводе",
        newline: "Новая строка",
        comma: "Запятая",
        semicolon: "Точка с запятой",
        space: "Пробел",
        custom: "Свой...",
        custom_placeholder: "Текст...",
        select_tool: "Выберите инструмент",
        search_tools: "Поиск инструментов (от 2-х символов)...",
        confirmation: "Подтверждение",
        cancel: "Отмена",
        confirm: "Подтвердить",
        input_data: "Ввод данных",
        enter_value: "Введите значение...",
        ok: "ОК",
        attention: "Внимание",
        close: "Закрыть",
        delete_chain_confirm: "Точно удалить сохраненную цепочку?",
        switch_chain_confirm: "Переключиться на другую цепочку? Все несохраненные изменения текущей будут утеряны.",
        new_chain_confirm: "Создать новую цепочку? Все несохраненные изменения текущей будут утеряны.",
        no_saved_chains: "Нет сохраненных",
        delete: "Удалить",
        default_source_text: "Пример строки\nВторая строка\n123",
        block_removed: "Блок удален",
        restore_block: "Восстановить блок",
        add_block: "Добавить блок",
        expand_blocks: "Развернуть блоки",
        collapse_blocks: "Свернуть блоки",
        drag_to_move: "Потяните, чтобы переместить",
        load_from_file: "Загрузить из файла",
        help: "Справка",
        add_block_above: "Добавить блок выше (Alt + B)",
        add_block_below: "Добавить блок ниже (Alt + A)",
        remove_block_alt: "Удалить блок (Alt + Delete)",
        source_placeholder: "Введите текст здесь (или перетащите файл сюда)...",
        line_delimiter: "Разделитель строк",
        lines_count: "Строк:",
        add_without_closing: "Добавить без закрытия",
        created: "Создано",
        saved: "Сохранено",
        exported: "Экспортировано",
        copied: "Скопировано",
        share_error: "Ошибка при создании ссылки",
        copy_clipboard_error: "Не удалось скопировать в буфер обмена. Используйте экспорт в файл или скопируйте вручную.",
        import_prompt: "Вставьте ранее скопированный код цепочки (JSON):",
        invalid_chain_format: "Некорректный формат цепочки",
        import_error: "Ошибка импорта: Неверный формат данных",
        enter_chain_name: "Введите название для этой цепочки:",
        rename_title: "Нажмите, чтобы переименовать (Alt + R)",
        chain_name_placeholder: "Название цепочки...",

        // Categories
        cat_search_clean: "Поиск и очистка",
        cat_remove_filter: "Удаление и фильтрация",
        cat_order_compare: "Порядок и сравнение",
        cat_text_transform: "Трансформация текста",
        cat_formats: "Работа с форматами",
        cat_assembly_templates: "Сборка и шаблоны",

        // Tools
        tool_regex_title: "Поиск и замена (Regex)",
        tool_regex_desc: "Замена по регулярному выражению",
        tool_regex_pattern: "Регулярное выражение",
        tool_regex_replacement: "Заменить на ($1, $2...)",
        tool_regex_case: "Без учета регистра",
        tool_regex_only_matched: "Оставить только совпадения",
        tool_regex_empty: "Пустой паттерн",

        tool_dedup_title: "Удаление дубликатов",
        tool_dedup_desc: "Оставляет только уникальные строки",
        tool_dedup_trim: "Trim пробелы",

        tool_sort_title: "Сортировка",
        tool_sort_desc: "Сортирует список",
        tool_sort_mode: "Режим",
        tool_sort_text: "Текст",
        tool_sort_numeric: "Числа",
        tool_sort_smart: "Умная (Числа внутри)",
        tool_sort_direction: "Направление",
        tool_sort_asc: "По возрастанию (A-Z)",
        tool_sort_desc: "По убыванию (Z-A)",
        tool_sort_case: "Игнорировать регистр",

        tool_reverse_title: "Разворот (Reverse)",
        tool_reverse_desc: "Переворачивает список строк в обратном порядке",

        tool_compare_title: "Сравнение (Diff)",
        tool_compare_desc: "Сравнить входящий текст со вторым списком",
        tool_compare_list2: "Список для сравнения",
        tool_compare_placeholder: "Строки для сравнения...",
        tool_compare_delimiter: "Разделитель списка",
        tool_compare_show: "Показать",
        tool_compare_common: "Только общие",
        tool_compare_diff: "Только различия (A-B)",
        tool_compare_all: "Все с пометками",

        tool_duplicates_title: "Найти дубликаты",
        tool_duplicates_desc: "Показывает только повторяющиеся строки",
        tool_duplicates_show_counts: "Показывать количество",
        tool_duplicates_none: "(Нет дубликатов)",

        tool_filter_title: "Фильтр строк",
        tool_filter_desc: "Оставить/Удалить строки по условию",
        tool_filter_query: "Текст поиска",
        tool_filter_contains: "Содержит",
        tool_filter_not_contains: "Не содержит",
        tool_filter_starts: "Начинается с",
        tool_filter_ends: "Заканчивается на",

        tool_csv_title: "CSV Парсер",
        tool_csv_desc: "Преобразование CSV в текст по шаблону",
        tool_csv_delimiter: "Разделитель CSV (; или ,)",
        tool_csv_template: "Шаблон ($1, $2...)",
        tool_csv_skip_header: "Пропустить заголовок",

        tool_case_title: "Регистр",
        tool_case_desc: "UPPERCASE, lowercase, Capitalize",
        tool_case_upper: "ВСЕ ЗАГЛАВНЫЕ",
        tool_case_lower: "все строчные",
        tool_case_cap: "Начало Предложения",
        tool_case_word: "Каждое Слово",

        tool_wrapper_title: "Обертка (Prefix/Suffix)",
        tool_wrapper_desc: "Добавить текст в начало/конец каждой строки",
        tool_wrapper_prefix: "Префикс",
        tool_wrapper_suffix: "Суффикс",

        tool_trim_title: "Обрезка (Trim)",
        tool_trim_desc: "Удаляет пробелы с краев каждой строки",
        tool_trim_both: "С обеих сторон",
        tool_trim_left: "Слева",
        tool_trim_right: "Справа",

        tool_ai_cleaner_title: "AI Cleaner",
        tool_ai_cleaner_desc: "Очистка типографики и спецсимволов",
        tool_ai_cleaner_replace: "Заменять мусор на",

        tool_json_format_title: "Форматирование JSON",
        tool_json_format_desc: "Превращает текст в красивый JSON",
        tool_json_format_indent: "Отступ",
        tool_json_format_2spaces: "2 пробела",
        tool_json_format_4spaces: "4 пробела",
        tool_json_format_tab: "Табуляция",
        tool_json_format_minify: "Минифицировать",
        tool_json_format_join: "Разделитель склейки",
        tool_json_format_empty: "Пустой ввод",

        tool_json_path_title: "Извлечение (JSONPath)",
        tool_json_path_desc: "Извлекает элементы из JSON-текста (напр. $.users[*].name)",
        tool_json_path_query: "JSONPath запрос",
        tool_json_path_input_mode: "Входные данные",
        tool_json_path_combined: "Все строки как один JSON",
        tool_json_path_lines: "Каждая строка - отдельный JSON",
        tool_json_path_stringify: "Оборачивать объекты в JSON",
        tool_json_path_lib_error: "Библиотека jsonpath не загружена! Проверьте интернет-соединение.",
        tool_json_path_parse_error: "Ошибка парсинга JSON: ",
        tool_json_path_error: "Ошибка JSONPath: ",

        tool_join_title: "Объединить строки (Join)",
        tool_join_desc: "Собирает список в одну строку",
        tool_join_prefix: "Первые символы",
        tool_join_last_delimiter: "Последний разделитель",
        tool_join_suffix: "Последние символы",
        tool_join_and: " и ",

        tool_split_title: "Разбить строку (Split)",
        tool_split_desc: "Разбивает строки по разделителю",

        tool_add_line_title: "Добавить строку",
        tool_add_line_desc: "Добавляет строки в начало, конец списка и/или между строк",
        tool_add_line_start: "Первая строка",
        tool_add_line_between: "Между строк",
        tool_add_line_end: "Последняя строка",

        tool_template_title: "Шаблонизатор (Nunjucks)",
        tool_template_desc: "Генерация по шаблону (доступны body и lines)",
        tool_template_tpl: "Шаблон Nunjucks (доступны body и lines)",

        tool_js_function_title: "Функция (JS)",
        tool_js_function_desc: "Свой JS код для обработки каждой строки",
        tool_js_function_code: "Код функции (аргумент line)",
        tool_js_function_compilation_error: "Ошибка компиляции: ",

        tool_shuffle_title: "Случайная сортировка",
        tool_shuffle_desc: "Перемешивает строки в случайном порядке",
        tool_shuffle_seed: "Seed (число)",

        tool_to_hex_title: "В HEX (To Hex)",
        tool_to_hex_desc: "Преобразование текста в шестнадцатеричный код",
        tool_to_hex_encoding: "Кодировка",
        tool_to_hex_format: "Формат",
        tool_to_hex_plain: "Слитная строка (xxyyzz)",
        tool_to_hex_spaced: "Через пробел (xx yy zz)",
        tool_to_hex_dump: "Дамп (смещение + 16 байт)",
        tool_to_hex_dump_ascii: "Дамп + ASCII",
        tool_to_hex_uppercase: "Заглавные буквы (A-F)",
        tool_to_hex_error: "Ошибка кодирования: ",

        tool_from_hex_title: "ИЗ HEX (From Hex)",
        tool_from_hex_desc: "Преобразует шестнадцатеричный код обратно в текст",
        tool_from_hex_encoding: "Кодировка байт",
        tool_from_hex_invalid_chars: "Обнаружены недопустимые символы в HEX данных на строке",
        tool_from_hex_incomplete: "Неполный байт (нечетное количество символов) на строке",
        tool_from_hex_not_found: "HEX данные не найдены. Поддерживаемые форматы: \"xx yy zz\", \"xxyyzz\" или дамп \"0000: xx yy zz |ascii|\"",
        tool_from_hex_error: "Ошибка декодирования: ",

        tool_encode_title: "Кодирование (Base64/URL)",
        tool_encode_desc: "Кодирование и декодирование (Base64, URL)",
        tool_encode_mode: "Действие",
        tool_encode_error: "Ошибка: ",

        tool_hash_title: "Хеширование",
        tool_hash_desc: "Вычисляет CRC32, MD5, SHA-1, SHA-256, SHA-384, SHA-512",
        tool_hash_algorithm: "Алгоритм",
        tool_hash_lib_error: "Библиотека CryptoJS не загружена! Проверьте интернет-соединение.",

        tool_debug_title: "Отладка (Debug View)",
        tool_debug_desc: "Визуализирует невидимые символы (пробелы, табы, переносы)",
        tool_debug_spaces: "Показывать пробелы (·)",
        tool_debug_tabs: "Показывать табы (→)",
        tool_debug_numbers: "Номера строк"
    }
};

class I18n {
    constructor() {
        this.locale = this.detectLocale();
        this.applyLocale();
    }

    detectLocale() {
        const saved = localStorage.getItem('stringlom_lang');
        if (saved && TRANSLATIONS[saved]) return saved;

        const sysLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
        if (TRANSLATIONS[sysLang]) return sysLang;

        return 'en'; // Fallback
    }

    setLocale(locale) {
        if (!TRANSLATIONS[locale]) return;
        this.locale = locale;
        localStorage.setItem('stringlom_lang', locale);
        this.applyLocale();

        // Trigger UI update
        if (window.app) {
            window.app.updateUIStrings();
            window.app.reRenderAll();
        }
    }

    applyLocale() {
        document.documentElement.lang = this.locale;
    }

    t(key) {
        const trans = TRANSLATIONS[this.locale] || TRANSLATIONS['en'];
        return trans[key] || key;
    }

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });
    }
}

const i18n = new I18n();
window.i18n = i18n;
window.TRANSLATIONS = TRANSLATIONS;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { i18n, TRANSLATIONS };
}
