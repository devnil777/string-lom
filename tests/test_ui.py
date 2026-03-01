import pytest
from playwright.sync_api import Page, expect

def test_app_loads(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")
    expect(page.get_by_text("StringLOM", exact=True)).to_be_visible()
    expect(page.locator(".block.source-block")).to_be_visible()
    expect(page.locator("#final-output-box")).to_be_visible()

def test_source_input_updates_result(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")
    textarea = page.locator(".block.source-block textarea")
    textarea.fill("Hello World")

    expect(page.locator("#final-output-box")).to_have_text("Hello World")

def test_add_remove_block(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")
    page.locator(".block.source-block textarea").fill("test")

    # Add block
    page.locator("[data-i18n='add_block']").click()

    # Select "Case" tool
    tool_title = page.evaluate("i18n.t(TOOLS.find(t => t.id === 'case').title)")
    page.locator("#tool-modal").get_by_text(tool_title, exact=True).click()

    page.locator(".process-block select").select_option("upper")
    expect(page.locator("#final-output-box")).to_have_text("TEST")

    page.locator(".icon-btn.delete").click()
    expect(page.locator("#final-output-box")).to_have_text("test")

@pytest.mark.xfail(reason="BUG-01: Create New does not clear Source block")
def test_save_and_load_chain(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")
    page.locator(".block.source-block textarea").fill("Save Me")

    page.locator("#save-chain-btn").click()
    page.locator("#dialog-body input").fill("My Test Chain")

    ok_text = page.evaluate("i18n.t('ok')")
    page.get_by_role("button", name=ok_text, exact=True).click()

    expect(page.locator("#saved-list")).to_contain_text("My Test Chain")

    page.locator("#reset-btn-sidebar").click()

    confirm_text = page.evaluate("i18n.t('confirm')")
    page.get_by_role("button", name=confirm_text, exact=True).click()

    expect(page.locator(".block.source-block textarea")).to_have_value("")

    page.locator(".saved-item", has_text="My Test Chain").click()
    expect(page.locator(".block.source-block textarea")).to_have_value("Save Me")

def test_rename_chain(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator("#save-chain-btn").click()
    page.locator("#dialog-body input").fill("Original")

    ok_text = page.evaluate("i18n.t('ok')")
    page.get_by_role("button", name=ok_text, exact=True).click()

    page.locator("#workspace-title-display").click()
    page.locator("#workspace-title-input").fill("Renamed")
    page.locator("#confirm-title-btn").click()

    expect(page.locator("#workspace-title-text")).to_have_text("Renamed")
    expect(page.locator("#saved-list")).to_contain_text("Renamed")

@pytest.mark.xfail(reason="BUG-01: Create New does not clear Source block")
def test_shortcuts(page: Page, app_url: str):
    page.goto(app_url)
    page.evaluate("localStorage.clear()")
    page.reload()
    page.evaluate("i18n.setLocale('en')")

    page.locator(".block.source-block textarea").fill("some text")
    page.keyboard.press("Alt+KeyN")

    confirm_text = page.evaluate("i18n.t('confirm')")
    page.get_by_role("button", name=confirm_text, exact=True).click()

    expect(page.locator(".block.source-block textarea")).to_have_value("")
