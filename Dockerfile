FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY proxy.py .
COPY src ./web

# Expose the default port (will be overridden by --port if needed, but 8000 is a good default for Docker)
EXPOSE 8000

# Run the proxy server, binding to 0.0.0.0 to be accessible from outside the container
CMD ["python", "proxy.py", "--host", "0.0.0.0", "--port", "8000"]
