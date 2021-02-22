import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import { Octokit } from "@octokit/rest";
import * as path from "path";
import * as semver from "semver";

/**
 * @returns {string[]} possible Rust target specifiers for the current platform.
 */
function getTargets(): string[] {
  const { arch, platform } = process;
  if (arch == "x64") {
    if (platform == "linux") {
      return ["x86_64-unknown-linux-musl", "x86_64-unknown-linux-gnu"];
    } else if (platform == "darwin") {
      return ["x86_64-apple-darwin"];
    } else if (platform == "win32") {
      return ["x86_64-pc-windows-msvc"];
    }
  }
  throw new Error(
    `failed to determine any valid targets; arch = ${arch}, platform = ${platform}`
  );
}

/**
 * Represents a tool to install from GitHub.
 */
export interface Tool {
  /** The GitHub owner (username or organization). */
  owner: string;
  /** The name of the tool and the GitHub repo name. */
  name: string;
  /** A valid semantic version specifier for the tool. */
  versionSpec?: string;
}

/**
 * Represents an installed tool.
 */
export interface InstalledTool {
  /** The GitHub owner (username or organization). */
  owner: string;
  /** The name of the tool and the GitHub repo name. */
  name: string;
  /** The version of the tool. */
  version: string;
  /** The directory containing the tool binary. */
  dir: string;
}

/**
 * Represents a single release for a {@link Tool}.
 */
interface Release {
  /** The exact release tag. */
  version: string;
  /** The asset download URL. */
  downloadUrl: string;
}

/**
 * Fetch the latest matching release for the given tool.
 *
 * @param tool the tool to fetch a release for.
 *
 * @returns {Promise<Release>} a single GitHub release.
 */
async function getRelease(tool: Tool): Promise<Release> {
  const targets = getTargets();
  const { owner, name, versionSpec } = tool;
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  return octokit
    .paginate(
      octokit.repos.listReleases,
      { owner, repo: name },
      (response, done) => {
        const releases = response.data
          .map((rel) => {
            const asset = rel.assets.find((ass) =>
              targets.some((target) => ass.name.includes(target))
            );
            if (asset) {
              return {
                version: rel.tag_name.replace(/^v/, ""),
                downloadUrl: asset.browser_download_url,
              };
            }
          })
          .filter((rel) =>
            rel && versionSpec
              ? semver.satisfies(rel.version, versionSpec)
              : true
          );
        if (releases && done) {
          done();
        }
        return releases;
      }
    )
    .then((releases) => {
      const release = releases.find((release) => release != null);
      if (release === undefined) {
        throw new Error(
          `no release for ${name} matching version specifier ${versionSpec}`
        );
      }
      return release;
    });
}

/**
 * Checks the tool cache for the tool, and if it is missing fetches it from
 * GitHub releases.
 *
 * @param tool the tool to check or install.
 *
 * @returns the directory containing the tool binary.
 */
export async function checkOrInstallTool(tool: Tool): Promise<InstalledTool> {
  const { name, versionSpec } = tool;

  // first check if we have previously downloaded the tool
  let dir = tc.find(name, versionSpec || "*");

  if (!dir) {
    // find the latest release by querying GitHub API
    const { version, downloadUrl } = await getRelease(tool);

    // download, extract, and cache the tool
    const artifact = await tc.downloadTool(downloadUrl);
    core.debug(`Successfully downloaded ${name} v${version}`);

    let extractDir;
    if (downloadUrl.endsWith(".zip")) {
      extractDir = await tc.extractZip(artifact);
    } else {
      extractDir = await tc.extractTar(artifact);
    }
    core.debug(`Successfully extracted archive for ${name} v${version}`);

    dir = await tc.cacheDir(extractDir, name, version);
  }

  // FIXME: is there a better way to get the version?
  const version = path.basename(path.dirname(dir));

  return { version, dir, ...tool };
}
