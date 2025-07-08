import "./load-env";
import { validateSignature, validateWallet } from "./validations";

const main = async () => {
  await validateSignature();
  await validateWallet();
};

main();
