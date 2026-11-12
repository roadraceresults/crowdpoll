import { runExtractYesNo } from "./extractAllCli.js";

process.exitCode = await runExtractYesNo(process.argv.slice(2));
