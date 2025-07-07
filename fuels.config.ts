import { createConfig } from "fuels";

export default createConfig({
  scripts: ["./script"],
  forcBuildFlags: ["--release"],
  output: "./src/airfacts",
});
