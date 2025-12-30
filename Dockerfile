FROM node:22-alpine
RUN apk add --no-cache git python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx hardhat compile
CMD ["tail", "-f", "/dev/null"]
