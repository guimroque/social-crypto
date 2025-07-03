// import { BakoProvider, Vault } from "bakosafe";
// import { Provider } from "fuels";

import {
  validateEncryptKey,
  validateKeyPair,
  validateSocialWallet,
} from "./mpc-validations";

// export interface SocialWallet {
//   vault: Vault | null;
//   key: CryptoKey | null;
//   publicKeyHex: string | null;
//   provider: BakoProvider | Provider;

//   loadFromStore(pin: string): Promise<void>;
//   signMessage(message: string): Promise<string>;
// }

const main = async () => {
  await validateKeyPair();
  await validateEncryptKey();
  await validateSocialWallet();
};

main();
