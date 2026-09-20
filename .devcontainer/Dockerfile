# Use Node.js LTS (v22) as base image
FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# Install additional dependencies if needed
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    curl \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Copy package files for dependency installation
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy the rest of the project files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Default command (can be overridden in devcontainer.json)
CMD ["sleep", "infinity"]
