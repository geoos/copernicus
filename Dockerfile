# docker build -t geoos/copernicus:latest -t geoos/copernicus:0.82 .
# docker push geoos/copernicus:latest

FROM geoos/node14-python3
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production

COPY . .
CMD ["node", "index"]