# Use an official Node runtime as parent image
FROM node:20-slim

# Install system dependencies for Puppeteer (Chromium) to run headless inside Docker
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Environment variables for Puppeteer to locate Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set the working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (production only for a lighter image)
RUN npm ci --omit=dev

# Copy the rest of the application files
COPY . .

# Build the main process files (assuming TypeScript is installed in dependencies or global)
# If local compile is preferred, we copy the 'dist/' folder after compiling on host.
# For simplicity, since we have typescript in devDependencies, we can build it:
RUN npm install typescript -g && tsc -p src/main

# Expose port for REST API and WebSockets (if using Home Assistant / Remote Dashboard integration)
EXPOSE 3000

# Start the headless service
CMD ["npm", "run", "start:service"]
