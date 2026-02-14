FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better Docker layer caching)
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy source code
COPY . .

EXPOSE 3000

CMD ["npm", "start"]