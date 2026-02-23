# StringLOM Test Cases

This document outlines the test cases for the StringLOM application, categorized into UI/Functional tests and Tool-specific verification.

## 1. UI and General Functionality

| ID | Title | Description | Expected Result |
|---|---|---|---|
| TC-UI-01 | App Initialization | Load the application for the first time. | App loads, Source block is present, branding is visible. |
| TC-UI-02 | Create New Chain | Click "Create" in the sidebar with an existing chain. | Confirmation prompt appears; chain is reset to empty Source block. |
| TC-UI-03 | Save Chain | Click "Save" and provide a name. | Prompt appears; chain is stored in localStorage and appears in the sidebar list. |
| TC-UI-04 | Load Saved Chain | Click on a saved chain in the sidebar. | The workspace restores the saved blocks and their parameters. |
| TC-UI-05 | Delete Saved Chain | Click delete icon on a saved item. | Confirmation prompt appears; item is removed from the sidebar. |
| TC-UI-06 | Rename Chain | Click on the workspace title to edit. | Title becomes an input; changing it updates the sidebar and storage. |
| TC-UI-07 | Import Chain | Use the "Import" button with a valid JSON. | The application loads the configuration from the provided JSON. |
| TC-UI-08 | Export Chain | Use the "Export" button in the toolbar. | JSON configuration is copied to the clipboard. |
| TC-UI-09 | Share Chain | Use the "Share" button in the toolbar. | A URL with a Base64-encoded chain is copied to the clipboard. |
| TC-UI-10 | Add Block | Add a block between existing blocks or at the end. | Tool modal opens; selecting a tool inserts it at the correct position. |
| TC-UI-11 | Remove Block | Delete a processing block from the chain. | Block is removed; the data pipeline updates immediately. |
| TC-UI-12 | Reorder Blocks | Drag and drop blocks to change order. | The sequence of operations changes, updating the final result. |
| TC-UI-13 | Keyboard Shortcuts | Test Alt+N, Alt+S, Alt+A, Alt+B. | Each shortcut performs its designated action correctly. |
| TC-UI-14 | File Drag & Drop | Drag a text file into the Source block. | File content is successfully loaded into the Source textarea. |
| TC-UI-15 | Final Result Copy | Click copy on the Final Result block. | The processed text is copied to the clipboard. |

## 2. Tool-Specific Verification (Minimal)

| ID | Tool | Scenario | Input | Parameters | Expected Output |
|---|---|---|---|---|---|
| TC-TOOL-01 | Regex | Basic Search & Replace | `Hello 123` | Pattern: `\d+`, Replace: `NUM` | `Hello NUM` |
| TC-TOOL-02 | Deduplicate | Unique strings | `A, B, A` | Trim: Yes | `A, B` |
| TC-TOOL-03 | Sort | Alphabetical | `C, A, B` | Order: A-Z | `A, B, C` |
| TC-TOOL-04 | Filter | String contains | `Apple, Bee` | Query: `ee`, Mode: Contains | `Bee` |
| TC-TOOL-05 | Case | Uppercase | `low` | Mode: UPPERCASE | `LOW` |
| TC-TOOL-06 | Trim | Remove spaces | `  sp  ` | Mode: Both | `sp` |
| TC-TOOL-07 | JSONPath | Extract values | `{"x": 1}` | Query: `$.x` | `1` |
| TC-TOOL-08 | Join | Combine list | `A, B` | Delim: `-`, Last: `&` | `A&B` (if 2 lines) |
| TC-TOOL-09 | JS Function | Custom logic | `10` | Code: `return line * 2` | `20` |
| TC-TOOL-10 | CSV Parser | Basic columns | `a;b` | Template: `$1 then $2` | `a then b` |
| TC-TOOL-11 | Nunjucks | Template loop | `X` | Tpl: `{{line}}!` | `X!` |
