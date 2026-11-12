import { runExtractPolymarket } from "./polymarketCli.js";

process.exitCode = await runExtractPolymarket(process.argv.slice(2));
