# BricsCoin Node - Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install httpx aiohttp

# Copy backend code
COPY backend/ .

# Environment variables (override at runtime)
ENV MONGO_URL=mongodb://mongo:27017
ENV DB_NAME=bricscoin
ENV NODE_ID=""
ENV NODE_URL=""
ENV SEED_NODES=""
ENV CORS_ORIGINS="*"

EXPOSE 8001 3333

CMD ["bash", "start.sh"]
