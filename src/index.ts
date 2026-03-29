import * as core from "@actions/core";
import * as setup from "@extractions/setup-crate";

async function main() {
  try {
    const repoSpec = core.getInput("repo");
    let owner = core.getInput("owner");
    let name = core.getInput("name");
    const githubToken = core.getInput("github-token");
    let versionSpec = core.getInput("version");

    // Repo and owner+name are mutually exclusive
    if (repoSpec) {
      if (owner || name) {
        core.setFailed(
          "When 'repo' is supplied, 'owner' and 'name' must not be provided",
        );
        return;
      }
    } else {
      if (!owner || !name) {
        core.setFailed(
          "Both 'owner' and 'name' must be supplied when 'repo' is not provided",
        );
        return;
      }
    }

    // Parse the repo spec if it was provided
    if (repoSpec) {
      const [repo, version] = repoSpec.split("@", 2);
      if (version && versionSpec) {
        core.setFailed(
          "Both 'version' and 'repo' have a version specified, only one is allowed",
        );
        return;
      }
      versionSpec = version || versionSpec;
      [owner, name] = repo.split("/", 2);
    }

    const tool = await setup.checkOrInstallTool(
      { owner, name, versionSpec },
      { auth: githubToken },
    );
    core.addPath(tool.dir);
    core.info(`Successfully setup ${tool.name} v${tool.version}`);
  } catch (err) {
    if (err instanceof Error) {
      core.setFailed(err.message);
    }
  }
}

main();
