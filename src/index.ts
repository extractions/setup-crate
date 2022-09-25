import * as core from "@actions/core";
import * as setup from "@extractions/setup-crate";

async function main() {
  try {
    const owner = core.getInput("owner", { required: true });
    const name = core.getInput("name", { required: true });
    const versionSpec = core.getInput("version");
    const tool = await setup.checkOrInstallTool({
      owner,
      name,
      versionSpec,
    });
    core.addPath(tool.dir);
    core.info(`Successfully setup ${tool.name} v${tool.version}`);
  } catch (err) {
    if (err instanceof Error) {
      core.setFailed(err.message);
    }
  }
}

main();
