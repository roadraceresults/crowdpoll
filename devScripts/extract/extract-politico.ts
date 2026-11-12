import { runExtractPolitico } from "./politicoCli.js";

process.exitCode = await runExtractPolitico(process.argv.slice(2));
