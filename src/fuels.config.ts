import { createConfig } from "fuels";

import dotenv from "dotenv";

dotenv.config();

const { PRIVATE_KEY: privateKey, PROVIDER_URL: providerUrl } = process.env;

export default createConfig({
  privateKey,
  providerUrl,
  predicates: ["./predicate"],
  forcBuildFlags: ["--release"],
  output: "./out",
});
