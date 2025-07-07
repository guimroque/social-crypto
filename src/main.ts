import {
  validateEncryptionFlow,
  validateKeyPair,
  validateSignatureRecovery,
  validateWalletFlow,
  validateScript,
} from "./validations";

const main = async () => {
  validateKeyPair();
  await validateEncryptionFlow();
  await validateSignatureRecovery();
  await validateWalletFlow();
  await validateScript();
};

main();
