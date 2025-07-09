# Dockerfile para rodar o JSON-RPC Server
FROM node:20-alpine

# Diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instala pnpm globalmente e dependências do projeto
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copia o restante do código
COPY . .

# Porta padrão do Redis (caso queira expor para debug, não obrigatório)
EXPOSE 6379

# Comando para rodar o servidor JSON-RPC (ajuste conforme seu entrypoint real)
CMD ["pnpm", "exec", "tsx", "src/comms/jsonrpc-server.ts"] 