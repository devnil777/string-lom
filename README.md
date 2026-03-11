# 🔗 StringLOM — String Constructor

**Visual Pipeline Text Editor** — a powerful browser-based tool for processing, transforming, and analyzing text data. Works completely locally, without sending data to a server.

---

## 📖 Description

**StringLOM** is a Single Page Application (SPA) that allows you to build text processing chains from ready-made tool blocks. You provide the source text, add the necessary processing blocks, and get the final result in real-time.

### ✨ Key Features

- **Real-time Processing** — the result updates instantly as parameters or input data change.
- **Block Architecture** — a chain of sequential tool blocks, where the output of one block becomes the input of the next.
- **Chain Management** — save chains to `localStorage`, pin a unique link (ID) to the chain in the URL for quick access, and track unsaved parameters (warnings).
- **Share via Link** — generate a link containing the entire chain configuration (via base64 in the URL).
- **Drag & Drop Files and Blocks** — support for uploading text files by direct dragging. Change the order of blocks by dragging with a clear visual position indicator.
- **Block Trash** — safely delete blocks with the ability for instant restoration (via the "Restore Block" panel within 5 seconds).
- **Premium UI/UX** — modern design (Glassmorphism), instant dark/light theme switching without delays, convenient toggles (switches) instead of checkboxes, and smooth animations.
- **Complete Privacy** — all calculations are performed in the browser, data is never sent anywhere.

---

## 🚀 Quick Start

### Option 1: No Installation (SPA)
1. Open the `src/index.html` file (or `web/index.html` from the release) in any modern browser.
2. Enter text in the **Data Input** block.
3. Click **+ Add Block** (or Alt + A) and select the desired tool.
4. The result will be displayed in the **Final Result** block at the bottom of the page.

> No installation, server, or internet (after the initial load) is required.

### Option 2: Local Run with Proxy (Python)
This option allows you to use a local proxy server for LLM integration.
1. Clone the repository:
   ```bash
   git clone https://github.com/devnil777/string-lom.git
   cd string-lom
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the proxy server:
   ```bash
   python proxy.py
   ```
4. The application will be available at `http://127.0.0.1:20000` (the port may vary, check the console output).

### Option 3: Docker
The easiest way to run everything together in an isolated container.
1. Run the container from Docker Hub:
   ```bash
   docker run -p 8000:8000 devnil777/string-lo
   ```
2. Open `http://localhost:8000` in your browser.

---

## 🏗️ Architecture

The application is built on the **pipeline** principle:

```
Source Text --> Block #1 (Regex) --> Block #2 (Sort) --> Final Result
```

- **Source Block** — the entry point: text (manual input, button upload, or **File Drag & Drop** into the text area) + choice of line delimiter.
- **Processing Blocks** — an arbitrary number of sequential blocks; each takes an array of strings, processes it, and passes it forward. **The order of blocks can be changed by simple dragging.**
- **Final Result** — display of the resulting text with the ability to copy, download, and configure the output delimiter.

---

## 🛠️ Available Tools

Tools are divided into logical categories for easy searching:

### 🔍 Search and Clean
- **Search and Replace (Regex)** — replace text using a regular expression. Supports "case insensitive" mode and "only matched" output. Flags (`g`, `m`) are applied automatically.
- **AI Cleaner** — automatic typography cleanup: replace long dashes with hyphens, replace "curly" quotes with "straight" ones, remove or replace non-standard Unicode characters.

### ✂️ Remove and Filter
- **Remove Duplicates** — keeps only unique lines. Trim option to ignore leading/trailing spaces.
- **Find Duplicates** — shows only repeating lines with an optional repeat counter.
- **Line Filter** — filtering by condition: contains, does not contain, starts with, ends with.

### 🔢 Order and Compare
- **Sort** — text sorting (with case ignore option) and "smart" numeric sorting (numbers are always brought to the beginning of the list considering their values).
- **Reverse** — reverses the list of lines in backward order (bottom to top).
- **Random Shuffle** — shuffles lines. Supports a `Seed` parameter for generating reproducible random orders.
- **Compare (Diff)** — compare the incoming list with a second list (List B). Modes: only common, only differences (A-B), all with marks (+, -, =).

### 📝 Text Transformation
- **Case** — CASE CONVERSION: ALL UPPERCASE, all lowercase, Sentence Case, Each Word.
- **Trim** — remove spaces from the edges of lines (left, right, or both sides).
- **Wrapper (Prefix/Suffix)** — add arbitrary text to the beginning and/or end of each line.

### 📦 Work with Formats
- **CSV Parser** — parse CSV data by template ($1, $2...). Configurable delimiter and skip header option.
- **JSON Formatting** — pretty JSON formatting: indent 2/4 spaces, tabulation, minification.
- **Extraction (JSONPath)** — extract data from JSON using queries (e.g., `$.items[*].id`). Modes: single JSON or line-by-line.
- **Split String** — split lines by an arbitrary delimiter.
- **Encoding (Base64/URL)** — encode and decode into Base64 or URL Encode standards.
- **Hashing** — generate hashes (CRC32, MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA-3, RIPEMD-160) with results in lowercase.
- **To HEX** — convert text to hexadecimal code. Variety of encodings (UTF-8, UTF-16LE, UTF-16BE, Windows-1251, KOI8-R, CP866) and output formats (with spaces, plain, dump with ASCII).
- **From HEX** — reverse conversion of bytes (HEX) to text with support for choosing the required byte encoding.

### 🔧 Assembly and Templates
- **Join Lines** — assembling a list of lines into one with configurable delimiter, prefix, suffix, and "last delimiter" (e.g., ", " and " and ").
- **Add Line** — inserting an arbitrary line at the beginning, end of the list, or between lines.
- **Templatizer (Nunjucks)** — text generation based on a Nunjucks template. `body` (entire text) and `lines` (array of strings) objects are available.
- **Function (JS)** — executing arbitrary JavaScript code for programmatic processing of each line.
- **Debug View** — visualization of invisible characters (spaces: `·`, tabs: `→`, breaks) and display of exact line numbers for easy debugging.

---

## ⚙️ Input and Output Settings

### 📥 Source Text Delimiter (Split)
Determines how the source text is broken into individual elements (lines) before processing:
- **New Line** (`\n`) — standard line-by-line processing mode.
- **Comma, semicolon, space** — for working with single-line lists.
- **Custom delimiter** — support for any user-defined character sequences.

### 📤 Final Result Delimiter (Join)
Determines how processed elements are reassembled into a single text block:
- **New Line** — for classic lists.
- **Minification or custom text** — for code generation (e.g., CSS or SQL).

---

## 💡 Usage Examples

### 📧 Cleaning an Email List
1. Paste the list into the **Data Input** block.
2. Add **Trim** — remove extra spaces.
3. Add **Case** → all lowercase.
4. Add **Remove Duplicates**.
5. Add **Sort** → A-Z.

### 📊 Extracting Data from JSON API
1. Paste the JSON response.
2. Add **Extraction (JSONPath)** → query `$.data[*].email`.
3. Add **Sort**.
4. Add **Remove Duplicates**.

### 🛠️ Generating SQL VALUES from CSV
1. Paste CSV data.
2. Add **CSV Parser** → template `('$1', '$2', '$3')`.
3. Add **Join Lines** → delimiter `, `.
4. Add **Wrapper** → prefix `INSERT INTO table VALUES ` and suffix `;`.

### 🔍 Comparing Two Lists
1. Paste the first list.
2. Add **Compare (Diff)** → paste the second list into the "List for comparison" field.
3. Choose mode: common elements, only differences, or all with marks.

---

## ⌨️ Hotkeys

Using hotkeys significantly speeds up the workflow:

| Combination | Action |
|---|---|
| **Alt + N** | Create a new chain (reset) |
| **Alt + S** (or Ctrl+S) | Save the current chain |
| **Alt + I** | Import chain (JSON) |
| **Alt + E** | Export chain (JSON) |
| **Alt + R** | Rename current chain |
| **Alt + A** | Add new block after current |
| **Alt + B** | Add new block before current |
| **Alt + Delete** | Delete current block |
| **Esc** | Close modal window |

---

## 📁 Project Structure

```
string-lom/
├── src/
│   ├── index.html       # Main application file
│   └── favicon.svg      # Logo and icon
├── .github/workflows/   # Automation (GitHub Actions / Pages)
├── analytics-*.html     # Analytics files
└── README.md            # This documentation
└── README_ru.md         # Russian documentation
```

---

## 🛠 Technologies

StringLOM is built on modern web technologies without using heavy frameworks:
- **Vanilla JS (ES6+)** — application logic and state management.
- **HTML5 & CSS3** — semantic layout and modern UI with Glassmorphism effects.
- **Font Awesome 6** — interface icons.
- **JSONPath-Plus** — library for parsing JSON data.
- **Nunjucks** — powerful templating engine for text generation.

---

## 🔒 Privacy

The application works on a **Client-Side Only** principle. All your data, entered text, and chain configurations are processed exclusively in your browser. Data is not transmitted to third-party servers, which guarantees the complete security of confidential information.
