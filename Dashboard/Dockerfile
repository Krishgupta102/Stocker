FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=3001
EXPOSE 3001

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3001"]