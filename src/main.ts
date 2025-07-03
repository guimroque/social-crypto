import {
  validateEncryptionFlow,
  validateKeyPair,
  validateSignatureRecovery,
  validateWalletFlow,
} from "./mpc-validations.js";

const main = async () => {
  validateKeyPair();
  await validateEncryptionFlow();
  await validateSignatureRecovery();
  await validateWalletFlow();
};

main();
