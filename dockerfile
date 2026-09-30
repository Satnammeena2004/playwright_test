FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 9323

CMD ["npx", "playwright", "test", "--project=chromium"]