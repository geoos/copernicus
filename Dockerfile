# docker build -t docker.homejota.net/geoos/copernicus:latest -t docker.homejota.net/geoos/copernicus:0.82 .
# docker push docker.homejota.net/geoos/copernicus:latest

FROM docker.homejota.net/geoos/node14-python3
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production

COPY . .
CMD ["node", "index"]