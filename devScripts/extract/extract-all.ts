import { runExtractAll } from "./extractAllCli.js";

process.exitCode = await runExtractAll(process.argv.slice(2));
