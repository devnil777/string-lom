import os
import json
import uuid
import socket
import logging
import asyncio
import hashlib
import base64
import sys
import argparse
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from urllib.parse import urlencode

import uvicorn
import requests
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# --- Arguments & Logging ---
parser = argparse.ArgumentParser()
parser.add_argument("--debug", action="store_true", help="Enable debug logging")
parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind (default: 127.0.0.1)")
parser.add_argument("--port", type=int, default=None, help="Port to bind (default: dynamic 20000-30000)")
args = parser.parse_args()

log_level = logging.DEBUG if args.debug else logging.INFO
logging.basicConfig(level=log_level, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

HOST = args.host
CONFIG_FILE = os.path.expanduser("~/config.json")

def get_free_port():
    for port in range(20000, 30001):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((HOST, port))
                return port
            except socket.error:
                continue
    raise RuntimeError("No free ports in range 20000-30000")

def load_or_create_config():
    if args.port:
        port = args.port
    elif os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                port = config['port']
                api_uuid = config['uuid']
                return port, api_uuid
        except Exception as e:
            logger.error(f"Error loading config: {e}")
        port = get_free_port()
    else:
        port = get_free_port()

    api_uuid = str(uuid.uuid4())
    config = {'port': port, 'uuid': api_uuid}
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=4)
    except Exception as e:
        logger.error(f"Error saving config: {e}")
    return port, api_uuid

PORT, API_UUID = load_or_create_config()
BASE_URL = f"http://{HOST}:{PORT}/{API_UUID}"

# --- Providers (Strategy Pattern) ---
class BaseProvider(ABC):
    @abstractmethod
    def get_name(self) -> str:
        pass

    @abstractmethod
    async def proxy_request(self, target_url: str, method: str, headers: Dict, body: Any) -> JSONResponse:
        pass

class QwenProvider(BaseProvider):
    def get_name(self) -> str:
        return "qwen"

    def __init__(self):
        self.oauth_base = "https://chat.qwen.ai"
        self.device_code_url = f"{self.oauth_base}/api/v1/oauth2/device/code"
        self.token_url = f"{self.oauth_base}/api/v1/oauth2/token"
        self.client_id = "f0304373b74a44d2b584a3fb70ca9e56"
        self.scope = "openid profile email model.completion"
        self.pkce_store = {} # device_code -> verifier

    async def proxy_request(self, target_url: str, method: str, headers: Dict, body: Any) -> JSONResponse:
        logger.debug(f"Proxying {method} to {target_url}")

        filtered_headers = {k: v for k, v in headers.items() if k.lower() not in ['host', 'origin', 'referer', 'content-length', 'cookie', 'connection']}

        from urllib.parse import urlparse
        parsed_url = urlparse(target_url)
        filtered_headers['Host'] = parsed_url.netloc

        if 'user-agent' not in [k.lower() for k in filtered_headers.keys()]:
            filtered_headers['User-Agent'] = 'vscode-qwen-copilot/0.2.0'

        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.request(
                    method=method,
                    url=target_url,
                    headers=filtered_headers,
                    json=body,
                    timeout=60,
                    allow_redirects=True
                )
            )

            resp_headers = dict(response.headers)
            # Remove all potentially conflicting headers
            for h in list(resp_headers.keys()):
                if h.lower() in ['content-encoding', 'transfer-encoding', 'content-length', 'connection', 'access-control-allow-origin', 'access-control-allow-credentials', 'access-control-allow-methods', 'access-control-allow-headers']:
                    resp_headers.pop(h, None)

            try:
                data = response.json()
            except:
                data = response.text
            return JSONResponse(content=data, status_code=response.status_code, headers=resp_headers)
        except Exception as e:
            logger.error(f"Proxy error: {str(e)}")
            return JSONResponse(content={"error": str(e)}, status_code=502)

    async def get_device_code(self, challenge: str, verifier: str):
        payload = {
            "client_id": self.client_id,
            "scope": self.scope,
            "code_challenge": challenge,
            "code_challenge_method": "S256"
        }
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "vscode-qwen-copilot/0.2.0"
        }
        r = requests.post(self.device_code_url, data=urlencode(payload), headers=headers)
        try:
            data = r.json()
            if r.status_code == 200 and 'device_code' in data:
                self.pkce_store[data['device_code']] = verifier
            return JSONResponse(content=data, status_code=r.status_code)
        except:
            return JSONResponse(content={"error": "Invalid response from provider", "text": r.text}, status_code=r.status_code)

    async def poll_token(self, device_code: str, code_verifier: str = None):
        verifier = code_verifier or self.pkce_store.get(device_code, "")
        payload = {
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "client_id": self.client_id,
            "device_code": device_code,
            "code_verifier": verifier
        }
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "vscode-qwen-copilot/0.2.0"
        }
        r = requests.post(self.token_url, data=urlencode(payload), headers=headers)
        try:
            data = r.json()
            if 'access_token' in data:
                self.pkce_store.pop(device_code, None)
            return JSONResponse(content=data, status_code=r.status_code)
        except:
            return JSONResponse(content={"error": "Invalid response from provider", "text": r.text}, status_code=r.status_code)

# --- FastAPI App ---
app = FastAPI()

qwen_provider = QwenProvider()

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if args.debug:
        logger.debug(f"Received request: {request.method} {request.url}")

    # Allow OPTIONS for CORS preflight
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path

    # Allow access to static files and root if they exist
    web_dir = os.path.join(os.path.dirname(__file__), "web")
    is_static_file = False
    if os.path.exists(web_dir):
        # Check if the path corresponds to a file in web directory
        relative_path = path.lstrip("/")
        if not relative_path:
            relative_path = "index.html"
        if os.path.exists(os.path.join(web_dir, relative_path)):
            is_static_file = True

    if is_static_file or path == "/":
        return await call_next(request)

    # Security check for proxy/auth endpoints
    client_host = request.client.host
    # Relax localhost check if bound to 0.0.0.0 (likely Docker)
    if HOST != "0.0.0.0" and client_host not in ["127.0.0.1", "localhost", "::1"]:
        return JSONResponse(content={"error": "Forbidden: Localhost only"}, status_code=403)

    if not path.startswith(f"/{API_UUID}/"):
        return JSONResponse(content={"error": "Unauthorized: Invalid UUID"}, status_code=401)

    return await call_next(request)

# Important: add CORSMiddleware after other middlewares to ensure it's processed properly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    web_index = os.path.join(os.path.dirname(__file__), "web", "index.html")
    if os.path.exists(web_index):
        from fastapi.responses import FileResponse
        return FileResponse(web_index)
    return {"status": "ok", "base_url": BASE_URL}

# Mount static files if 'web' directory exists
web_dir = os.path.join(os.path.dirname(__file__), "web")
if os.path.exists(web_dir):
    app.mount("/", StaticFiles(directory=web_dir), name="static")

@app.post(f"/{API_UUID}/auth/device_code")
async def device_code(body: Dict):
    challenge = body.get("challenge")
    verifier = body.get("verifier")
    return await qwen_provider.get_device_code(challenge, verifier)

@app.post(f"/{API_UUID}/auth/poll")
async def poll(body: Dict):
    return await qwen_provider.poll_token(body.get("device_code"), body.get("code_verifier"))

@app.api_route(f"/{API_UUID}/proxy", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy(request: Request):
    target_url = request.query_params.get("url")
    if not target_url: raise HTTPException(status_code=400, detail="Missing url parameter")
    method = request.method
    headers = dict(request.headers)
    body = await request.json() if method in ["POST", "PUT"] else None
    return await qwen_provider.proxy_request(target_url, method, headers, body)

if __name__ == "__main__":
    print(f"\n🚀 StringLOM Proxy started!")
    print(f"🔗 Base URL: {BASE_URL}\n")
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
