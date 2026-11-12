import { runExtract } from "./extractCli.js";

process.exitCode = await runExtract(process.argv.slice(2));
