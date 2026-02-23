# StringLOM Bug Report

The following bugs and issues were identified during automated testing of the StringLOM application.

## 1. Functional Bugs

### BUG-01: Source Block Not Cleared on "Create New"
- **Description:** Clicking the "Create" button (or using the `Alt+N` shortcut) resets the chain, but the "Source Text" block is re-initialized with the previous content if it was edited by the user.
- **Root Cause:** The `clearChain` method removes all blocks and then calls `addBlock('source')`. The `addBlock` method for the `source` type initializes its value from `localStorage.getItem('strings_last_source')`. Since the application saves to this key on every input, the "new" source block immediately restores the "old" text.
- **Expected Behavior:** A new chain should start with either an empty Source block or the default example text, but not the text from the previous session/chain unless explicitly intended.

### BUG-02: Silent Failure of Clipboard Actions
- **Description:** Features like "Share", "Export", and "Copy Result" rely on `navigator.clipboard.writeText`. In environments where the clipboard API is unavailable or restricted (e.g., non-secure contexts, headless browsers without permissions), these actions fail silently or the UI feedback (e.g., "Copied!") never appears.
- **Root Cause:** The code does not provide a fallback (like a temporary textarea) or an error notification if the Promise from `navigator.clipboard.writeText` is rejected.
- **Expected Behavior:** If copying fails, the user should be notified, or a fallback method should be used.

## 2. Usability / UI Issues

### ISSUE-01: Ambiguous Labels in "Join" Tool
- **Description:** The "Join" tool has two parameters: "Разделитель" (Delimiter) and "Последний разделитель" (Last Delimiter). Both labels contain the word "Разделитель".
- **Impact:** Minor confusion for users and difficulty for automated testing tools that use label-based selectors.
- **Recommendation:** Rename "Разделитель" to something more distinct, like "Основной разделитель".

### ISSUE-02: Missing Input Validation for Regex
- **Description:** Entering an invalid Regular Expression (e.g., an unclosed bracket `[`) in the Regex tool results in the error being displayed in the stats area, but it doesn't prevent the chain from attempting to run.
- **Impact:** While the app handles the error gracefully by showing it, there's no visual "error" state for the block itself beyond the text.
