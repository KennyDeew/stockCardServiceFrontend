# ------------ BUILD STAGE ---------------------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


# ------------ PRODUCTION STAGE ----------------
FROM nginx:stable-alpine

# копируем билд в nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# конфиг для React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]