# Use Node.js LTS (v22) with Python as base image
FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# Install Python 3.11 and system dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    libpq-dev \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Copy package files for dependency installation
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy the rest of the project files
COPY . .

# Expose Vite dev server port and FastAPI port
EXPOSE 5173 8000

# Default command (can be overridden in devcontainer.json)
CMD ["sleep", "infinity"]