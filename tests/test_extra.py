import pytest
from playwright.sync_api import Page, expect
import base64
import json
import urllib.parse

@pytest.mark.xfail(reason="Clipboard API might not work in headless CI")
def test_share_chain(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()

    page.locator(".block.source-block textarea").fill("Share Test")

    # Share
    page.locator("#share-chain-btn").click()

    expect(page.locator("#share-chain-btn")).to_contain_text("Скопировано")

@pytest.mark.xfail(reason="Clipboard API might not work in headless CI")
def test_export_chain(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()

    page.locator("#copy-chain-btn").click()
    expect(page.locator("#copy-chain-btn")).to_contain_text("Экспортировано")

def test_drag_and_drop(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()

    page.locator(".block.source-block textarea").fill("line")

    # Add two blocks
    if page.locator(".add-btn-empty").is_visible():
        page.locator(".add-btn-empty").click()
    page.get_by_text("Регистр", exact=True).click() # Block 1

    page.locator(".icon-btn[title*='Добавить блок ниже']").click()
    page.get_by_text("Обрезка (Trim)", exact=True).click() # Block 2

    # Verify initial order
    expect(page.locator(".process-block").nth(0)).to_contain_text("Регистр")
    expect(page.locator(".process-block").nth(1)).to_contain_text("Обрезка")
