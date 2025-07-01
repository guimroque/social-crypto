// import { BakoProvider, Vault } from "bakosafe";
// import { Provider } from "fuels";

import { validateEncryptKey, validateKeyPair } from "./mpc-validations";

// export interface SocialWallet {
//   vault: Vault | null;
//   key: CryptoKey | null;
//   publicKeyHex: string | null;
//   provider: BakoProvider | Provider;

//   loadFromStore(pin: string): Promise<void>;
//   signMessage(message: string): Promise<string>;
// }

// export interface Store {
//   db: Record<string, any>;

//   save(key: string, value: any): void;
//   get(key: string): any | null;
// }

const main = async () => {
  await validateKeyPair();
  await validateEncryptKey();
};

main();
