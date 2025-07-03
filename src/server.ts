import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

export interface Store {
  save(key: string, value: any): void;
  get(key: string): any | null;
}

export class JsonStore implements Store {
  private filePath: string;
  private db: Record<string, any>;

  constructor(fileName = "store.json") {
    this.filePath = resolve(__dirname, fileName);

    if (existsSync(this.filePath)) {
      const content = readFileSync(this.filePath, "utf-8");
      try {
        this.db = JSON.parse(content);
      } catch {
        this.db = {};
      }
    } else {
      this.db = {};
      this.saveToFile();
    }
  }

  save(key: string, value: any): void {
    this.db[key] = value;
    this.saveToFile();
  }

  get(key: string): any | null {
    return this.db[key] || null;
  }

  private saveToFile(): void {
    writeFileSync(this.filePath, JSON.stringify(this.db, null, 2), "utf-8");
  }
}
