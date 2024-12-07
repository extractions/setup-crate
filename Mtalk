# setup-crate

[![Build Status](https://img.shields.io/github/actions/workflow/status/extractions/setup-crate/build.yaml?branch=trunk)](https://github.com/extractions/setup-crate/actions/workflows/build.yaml)

This GitHub Action will install a release of a Rust crate for you.

## Introduction

This action will work for any project that satisfies the following conditions:
- The project is a public GitHub project.
- The project uses GitHub releases with semver tag names.
- The project attaches assets to the GitHub release that contain a Rust target.
  The following targets are looked for:

  | Arch    | Node Platform | Targets                                                     |
  | ------- | ------------- | ----------------------------------------------------------- |
  | `x64`   | `linux`       | `x86_64-unknown-linux-musl` or `x86_64-unknown-linux-gnu`   |
  | `x64`   | `darwin`      | `x86_64-apple-darwin`                                       |
  | `x64`   | `win32`       | `x86_64-pc-windows-msvc`                                    |
  | `arm64` | `linux`       | `aarch64-unknown-linux-musl` or `aarch64-unknown-linux-gnu` |
  | `arm64` | `darwin`      | `aarch64-apple-darwin`                                      |

- The asset is a `.tar.gz` or `.zip` archive that contains a binary with the
  project name.

## Usage

### Examples

In most cases all you will need is to specify `repo` and the `owner/name` of the
project in your workflow. For example the following installs the latest version
of [mdBook](https://github.com/rust-lang/mdBook).

```yaml
- uses: extractions/setup-crate@v1
  with:
    repo: rust-lang/mdBook
```

If you want a specific version you can specify this by suffixing version to the
input. For example the following installs the latest `0.10.x` version of
[just](https://github.com/casey/just).

```yaml
- uses: extractions/setup-crate@v1
  with:
    repo: casey/just@0.10
```

### Inputs

| Name           | Required | Description                                                         | Type   | Default                     |
| -------------- | -------- | ------------------------------------------------------------------- | ------ | --------------------------- |
| `repo`         | no       | The GitHub repository name and valid NPM-style semver specification | string |                             |
| `github-token` | no       | The GitHub token for making API requests                            | string | ${{ secrets.GITHUB_TOKEN }} |

The semver specification is passed directly to NPM's [semver
package](https://www.npmjs.com/package/semver). This GitHub Action will install
the latest matching release. Examples include

- `version: '*'` latest version (default).
- `version: '0.1'` equivalent to `>=0.1.0 <0.2.0`.
- `version: '0.1.x'` equivalent to `>=0.1.0 <0.2.0`.
- `version: '0.1.0'` equivalent to `=0.1.0`.
- `version: '^0.1.0'` equivalent to `>=0.1.0 <0.2.0`.

### Deprecated inputs

The following inputs are still supported for now but will be removed in a future
release.

| Name      | Required | Description                            | Type   | Default |
| --------- | -------- | -------------------------------------- | ------ | ------- |
| `owner`   | no       | The GitHub user or organization name   | string |         |
| `name`    | no       | The GitHub repository name             | string |         |
| `version` | no       | A valid NPM-style semver specification | string | *       |

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or
   http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
