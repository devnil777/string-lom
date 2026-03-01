import pytest
from playwright.sync_api import Page, expect
import re

# Since we introduced i18n, we need to adapt tests to the current locale.
# The tests will run with 'en' locale by default because of the system language detection fallback.

def add_tool(page: Page, tool_id: str):
    if page.locator(".add-btn-empty").is_visible():
        page.locator(".add-btn-empty").click()
    else:
        # Using data-i18n-title for independence from locale
        page.locator("[data-i18n-title='add_block_below']").last.click()

    # In the modal, we can find the tool by its description or title if we know the translation,
    # but the easiest way is to use the tool list and find the one that corresponds to our tool.
    # However, the modal doesn't have IDs on items. Let's use the translated title from i18n.js.

    # Simple helper to get translation from the page context
    tool_title = page.evaluate(f"i18n.t(TOOLS.find(t => t.id === '{tool_id}').title)")
    page.locator("#tool-modal").get_by_text(tool_title, exact=True).click()

def test_tool_regex(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()

    # Force English for predictable tests
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("Hello 123 World")
    add_tool(page, "regex")

    # Use data-i18n attributes or translated text
    label_text = page.evaluate("i18n.t('tool_regex_replacement')")
    page.locator(".process-block").locator(f"label:has-text('{label_text}') + input").fill("NUM")

    expect(page.locator("#final-output-box")).to_have_text("Hello NUM World")

def test_tool_deduplicate(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("A\nB\nA\nC")
    add_tool(page, "deduplicate")

    expect(page.locator("#final-output-box")).to_have_text("A\nB\nC")

def test_tool_sort(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("C\nA\nB")
    add_tool(page, "sort")

    # The select options are now translated keys. 'asc' is the value, so it should still work if we use value.
    # mode is first select, direction is second select.
    page.locator(".process-block select").nth(1).select_option("asc")
    expect(page.locator("#final-output-box")).to_have_text("A\nB\nC")

    page.locator(".process-block select").nth(1).select_option("desc")
    expect(page.locator("#final-output-box")).to_have_text("C\nB\nA")

def test_tool_filter(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("Apple\nBanana\nCherry")
    add_tool(page, "filter")

    label_text = page.evaluate("i18n.t('tool_filter_query')")
    page.locator(".process-block label").filter(has_text=label_text).locator("xpath=../input").fill("an")
    expect(page.locator("#final-output-box")).to_have_text("Banana")

def test_tool_case(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("hello")
    add_tool(page, "case")

    page.locator(".process-block select").select_option("upper")
    expect(page.locator("#final-output-box")).to_have_text("HELLO")

def test_tool_trim(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("  text  ")
    add_tool(page, "trim")

    expect(page.locator("#final-output-box")).to_have_text("text")

def test_tool_jsonpath(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill('{"name": "John", "age": 30}')
    add_tool(page, "json_path")

    label_text = page.evaluate("i18n.t('tool_json_path_query')")
    page.locator(".process-block label").filter(has_text=label_text).locator("xpath=../input").fill("$.name")
    expect(page.locator("#final-output-box")).to_have_text("John")

def test_tool_join(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("A\nB")
    add_tool(page, "join")

    # primary delimiter
    label_delim = page.evaluate("i18n.t('tool_compare_delimiter')")
    primary = page.locator(".process-block label").filter(has_text=label_delim).first
    primary.locator("..").locator("select").select_option("custom")
    primary.locator("..").locator("input").fill("-")

    # last delimiter
    label_last = page.evaluate("i18n.t('tool_join_last_delimiter')")
    last = page.locator(".process-block label").filter(has_text=label_last)
    last.locator("..").locator("select").select_option("custom")
    last.locator("..").locator("input").fill("&")

    expect(page.locator("#final-output-box")).to_have_text("A&B")

def test_tool_compare_delimiter(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("A\nB\nC")
    add_tool(page, "compare")

    # fill list2 text
    page.locator(".process-block textarea").fill("A,B")

    # choose comma delimiter via select
    label_delim = page.evaluate("i18n.t('tool_compare_delimiter')")
    delim_label = page.locator(".process-block label").filter(has_text=label_delim)
    delim_label.locator("..").locator("select").select_option(",")

    # ensure operation set to common
    label_show = page.evaluate("i18n.t('tool_compare_show')")
    op_label = page.locator(".process-block label").filter(has_text=label_show)
    op_label.locator("..").locator("select").select_option("common")

    expect(page.locator("#final-output-box")).to_have_text("A\nB")


def test_tool_js_function(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("5")
    add_tool(page, "js_function")

    page.locator(".process-block textarea").fill("return line * 2")

    expect(page.locator("#final-output-box")).to_have_text("10")
