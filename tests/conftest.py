import pytest
import os

@pytest.fixture
def app_url():
    return f"file://{os.getcwd()}/src/index.html"
