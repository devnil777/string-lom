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
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("Share Test")

    # Share
    page.locator("#share-chain-btn").click()

    copied_text = page.evaluate("i18n.t('copied')")
    expect(page.locator("#share-chain-btn")).to_contain_text(copied_text)

@pytest.mark.xfail(reason="Clipboard API might not work in headless CI")
def test_export_chain(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator("#copy-chain-btn").click()
    exported_text = page.evaluate("i18n.t('exported')")
    expect(page.locator("#copy-chain-btn")).to_contain_text(exported_text)

def test_drag_and_drop(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("line")

    # Add two blocks
    if page.locator(".add-btn-empty").is_visible():
        page.locator(".add-btn-empty").click()

    # "Case" tool
    tool1_title = page.evaluate("i18n.t(TOOLS.find(t => t.id === 'case').title)")
    page.locator("#tool-modal").get_by_text(tool1_title, exact=True).click() # Block 1

    # Add below
    page.locator("[data-i18n-title='add_block_below']").last.click()

    # "Trim" tool
    tool2_title = page.evaluate("i18n.t(TOOLS.find(t => t.id === 'trim').title)")
    page.locator("#tool-modal").get_by_text(tool2_title, exact=True).click() # Block 2

    # Verify initial order
    expect(page.locator(".process-block").nth(0)).to_contain_text(tool1_title)
    expect(page.locator(".process-block").nth(1)).to_contain_text(tool2_title)
