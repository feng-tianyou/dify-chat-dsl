# FROM node:22.5.1 AS build
# RUN mkdir -p /app
# ADD  . /app/dify-chat
# WORKDIR /app/dify-chat
# RUN npm install pnpm -g
# RUN pnpm install && \
#     pnpm build
# FROM nginx:stable AS dist
# RUN mkdir /app
# COPY --from=build /app/dify-chat/packages/react-app/dist /app/dify-chat/
# RUN  chmod -R +r /app/dify-chat/
# RUN apt update && \
#     apt install -y vim
# 选择官方 Node 镜像
FROM node:22

RUN npm install -g pnpm

WORKDIR /app

# 直接拷贝全部代码（包含所有 package.json）
COPY . .

RUN pnpm install

EXPOSE 5200

CMD ["pnpm", "dev"]
