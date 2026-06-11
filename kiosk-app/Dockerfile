FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm i
COPY . .
RUN npm run build

FROM alpine:3.20
WORKDIR /out
COPY --from=build /app/dist /out
CMD ["sh", "-c", "cp -r /out/* /kiosk_dist && tail -f /dev/null"]
