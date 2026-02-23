import pytest
from playwright.sync_api import Page, expect
import re

def add_tool(page: Page, tool_name: str):
    if page.locator(".add-btn-empty").is_visible():
        page.locator(".add-btn-empty").click()
    else:
        page.locator(".icon-btn[title*='Добавить блок ниже']").last.click()

    # Use exact match for tool name in the modal
    page.locator("#tool-modal").get_by_text(tool_name, exact=True).click()

def test_tool_regex(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.locator(".block.source-block textarea").fill("Hello 123 World")
    add_tool(page, "Поиск и замена (Regex)")

    # Regex tool should be added. Let's find the replacement input by its label
    page.locator(".process-block").filter(has_text="Поиск и замена (Regex)").locator("label:has-text('Replacement') + input").fill("NUM")

    expect(page.locator("#final-output-box")).to_have_text("Hello NUM World")

def test_tool_deduplicate(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.locator(".block.source-block textarea").fill("A\nB\nA\nC")
    add_tool(page, "Удаление дубликатов")

    expect(page.locator("#final-output-box")).to_have_text("A\nB\nC")

def test_tool_sort(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.locator(".block.source-block textarea").fill("C\nA\nB")
    add_tool(page, "Сортировка")

    page.locator(".process-block select").select_option("asc")
    expect(page.locator("#final-output-box")).to_have_text("A\nB\nC")

    page.locator(".process-block select").select_option("desc")
    expect(page.locator("#final-output-box")).to_have_text("C\nB\nA")

def test_tool_filter(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.locator(".block.source-block textarea").fill("Apple\nBanana\nCherry")
    add_tool(page, "Фильтр строк")

    page.locator(".process-block label:has-text('Текст поиска') + input").fill("an")
    expect(page.locator("#final-output-box")).to_have_text("Banana")

def test_tool_case(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.locator(".block.source-block textarea").fill("hello")
    add_tool(page, "Регистр")

    page.locator(".process-block select").select_option("upper")
    expect(page.locator("#final-output-box")).to_have_text("HELLO")

def test_tool_trim(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.locator(".block.source-block textarea").fill("  text  ")
    add_tool(page, "Обрезка (Trim)")

    expect(page.locator("#final-output-box")).to_have_text("text")

def test_tool_jsonpath(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.locator(".block.source-block textarea").fill('{"name": "John", "age": 30}')
    add_tool(page, "Извлечение (JSONPath)")

    page.locator(".process-block label:has-text('JSONPath запрос') + input").fill("$.name")
    expect(page.locator("#final-output-box")).to_have_text("John")

def test_tool_join(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.locator(".block.source-block textarea").fill("A\nB")
    add_tool(page, "Объединить строки (Join)")

    # Use exact label match to avoid ambiguity with "Последний разделитель"
    page.locator(".process-block label").filter(has_text=re.compile(r"^Разделитель$")).locator("..").locator("input").fill("-")
    page.locator(".process-block label:has-text('Последний разделитель') + input").fill("&")

    expect(page.locator("#final-output-box")).to_have_text("A&B")

def test_tool_js_function(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.locator(".block.source-block textarea").fill("5")
    add_tool(page, "Функция (JS)")

    page.locator(".process-block textarea").fill("return line * 2")

    expect(page.locator("#final-output-box")).to_have_text("10")
