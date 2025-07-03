set -e
set -u

ENV_FILE=".env"
PREDICATE_PATH="./predicate"
OUTPUT_BIN="$PREDICATE_PATH/out/predicate.bin"

# Verifica se o arquivo .env existe
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Arquivo .env não encontrado."
  exit 1
fi

# Carrega as variáveis do .env
export $(grep -v '^#' "$ENV_FILE" | xargs)


echo "PRIVATE_KEY: $PRIVATE_KEY"
echo "NODE_URL: $NODE_URL"
echo "DEPLOYER_WALLET: $DEPLOYER_WALLET"

# Checagem básica
if [ -z "$PRIVATE_KEY" ] || [ -z "$NODE_URL" ] || [ -z "$DEPLOYER_WALLET" ]; then
  echo "❌ Variáveis obrigatórias (PRIVATE_KEY, NODE_URL, DEPLOYER_WALLET) não definidas no .env."
  exit 1
fi

# Checa fuelup
if ! command -v fuelup &> /dev/null; then
  echo "❌ fuelup não encontrado. Instale com: curl https://install.fuel.network | bash"
  exit 1
fi

fuelup show

echo "🚀 Build do predicate..."
cd "$PREDICATE_PATH"
forc build --locked

echo "📦 Binário gerado em: $OUTPUT_BIN"

echo "🚀 Deploy do predicate..."
forc deploy --node-url "$NODE_URL" --private-key "$PRIVATE_KEY" "$OUTPUT_BIN"

echo "✅ Deploy concluído!"
