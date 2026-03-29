import { constants as fs_constants, promises as fs } from "fs";
import * as path from "path";
import * as semver from "semver";

import * as io from "@actions/io";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import { Octokit } from "@octokit/rest";

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
  if (arch == "arm64") {
    if (platform == "linux") {
      return ["aarch64-unknown-linux-musl", "aarch64-unknown-linux-gnu"];
    } else if (platform == "darwin") {
      return ["aarch64-apple-darwin"];
    } else if (platform == "win32") {
      return ["aarch64-pc-windows-msvc"];
    }
  }
  throw new Error(
    `failed to determine any valid targets; arch = ${arch}, platform = ${platform}`,
  );
}

/**
 * Options that this package supports.
 */
export interface Options {
  /** Passed to Octokit auth, typically the GITHUB_TOKEN */
  auth: any;
}

/**
 * Represents a tool to install from GitHub.
 */
export interface Tool {
  /** The GitHub owner (username or organization). */
  owner: string;
  /** The GitHub repo name. */
  name: string;
  /** A valid semantic version specifier for the tool. */
  versionSpec?: string;
  /** The name of the tool binary (defaults to the repo name) */
  bin?: string;
}

/**
 * Represents an installed tool.
 */
export interface InstalledTool {
  /** The GitHub owner (username or organization). */
  owner: string;
  /** The GitHub repo name. */
  name: string;
  /** The version of the tool. */
  version: string;
  /** The directory containing the tool binary. */
  dir: string;
  /** The name of the tool binary (defaults to the repo name) */
  bin?: string;
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
async function getRelease(tool: Tool, options?: Options): Promise<Release> {
  const targets = getTargets();
  const { owner, name, versionSpec } = tool;
  const octokit = new Octokit(options);
  return octokit
    .paginate(
      "GET /repos/{owner}/{repo}/releases",
      { owner, repo: name },
      (response, done) => {
        const releases = response.data
          .map((rel): Release | undefined => {
            const asset = rel.assets.find((ass) =>
              targets.some((target) => ass.name.includes(target)),
            );
            if (asset) {
              return {
                version: rel.tag_name.replace(/^v/, ""),
                downloadUrl: asset.browser_download_url,
              };
            }
          })
          .filter((rel) => Boolean(rel))
          .filter((rel) =>
            rel && versionSpec
              ? semver.satisfies(rel.version, versionSpec)
              : true,
          );
        if (releases.length > 0) {
          done();
        }
        return releases;
      },
    )
    .then((releases) => {
      const release = releases.find((release) => release != null);
      if (release === undefined) {
        throw new Error(
          `no release for ${name} matching version specifier ${versionSpec}`,
        );
      }
      return release;
    });
}

async function handleBadBinaryPermissions(
  tool: Tool,
  dir: string,
): Promise<void> {
  const { name, bin } = tool;
  if (process.platform !== "win32") {
    const findBin = async () => {
      const files = await fs.readdir(dir);
      for await (const file of files) {
        if (file.toLowerCase() == name.toLowerCase()) {
          return file;
        }
      }
      return name;
    };
    const binary = path.join(dir, bin ? bin : await findBin());
    try {
      await fs.access(binary, fs_constants.X_OK);
    } catch {
      await fs.chmod(binary, "755");
      core.debug(`Fixed file permissions (-> 0o755) for ${binary}`);
    }
  }
}

/**
 * Checks the tool cache for the tool, and if it is missing fetches it from
 * GitHub releases.
 *
 * @param tool the tool to check or install.
 *
 * @returns the directory containing the tool binary.
 */
export async function checkOrInstallTool(
  tool: Tool,
  options?: Options,
): Promise<InstalledTool> {
  const { name, versionSpec } = tool;

  // first check if we have previously downloaded the tool
  let dir = tc.find(name, versionSpec || "*");

  if (!dir) {
    // find the latest release by querying GitHub API
    const { version, downloadUrl } = await getRelease(tool, options);

    // download, extract, and cache the tool
    const artifact = await tc.downloadTool(downloadUrl);
    core.debug(`Successfully downloaded ${name} v${version}`);

    let extractDir;
    if (downloadUrl.endsWith(".zip")) {
      extractDir = await tc.extractZip(artifact);
      core.debug(`Successfully extracted zip archive for ${name} v${version}`);

      // handle the case where there is a single directory extracted
      const files = await fs.readdir(extractDir);
      if (files.length == 1) {
        const maybeDir = path.join(extractDir, files[0]);
        if ((await fs.lstat(maybeDir)).isDirectory()) {
          extractDir = maybeDir;
        }
      }
    } else if (
      downloadUrl.endsWith(".tar.gz") ||
      downloadUrl.endsWith(".tgz") ||
      downloadUrl.endsWith(".tar.bz2") ||
      downloadUrl.endsWith(".tar.xz") ||
      downloadUrl.endsWith(".tar.zst")
    ) {
      extractDir = await tc.extractTar(artifact);
      core.debug(`Successfully extracted tar archive for ${name} v${version}`);

      // handle the case where there is a single directory extracted
      const files = await fs.readdir(extractDir);
      if (files.length == 1) {
        const maybeDir = path.join(extractDir, files[0]);
        if ((await fs.lstat(maybeDir)).isDirectory()) {
          extractDir = maybeDir;
        }
      }
    } else {
      const binName =
        process.platform === "win32"
          ? `${tool.bin || name}.exe`
          : tool.bin || name;
      const runnerTemp = process.env["RUNNER_TEMP"];
      if (!runnerTemp) {
        throw new Error("Expected RUNNER_TEMP to be defined");
      }
      extractDir = path.join(runnerTemp, crypto.randomUUID());
      io.mkdirP(extractDir);
      io.mv(artifact, path.join(extractDir, binName));
      core.debug(`Successfully staged binary for ${name} v${version}`);
    }

    dir = await tc.cacheDir(extractDir, name, version);

    // handle bad binary permissions, the binary needs to be executable!
    await handleBadBinaryPermissions(tool, dir);
  }

  // FIXME: is there a better way to get the version?
  const version = path.basename(path.dirname(dir));

  return { version, dir, ...tool };
}
