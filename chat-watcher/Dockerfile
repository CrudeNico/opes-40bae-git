FROM node:20-slim

# Install Playwright deps + xvfb (virtual display for better rendering in cloud)
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 \
    fonts-liberation libappindicator3-1 xdg-utils wget xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Install Chromium for Playwright
RUN npx playwright install chromium

COPY index.mjs ./

# Use xvfb so Chromium can run with a virtual display (improves DOM rendering)
ENV DISPLAY=:99
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x720x24 & sleep 2 && node index.mjs"]
