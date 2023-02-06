# setup-crate

[![Build Status](https://img.shields.io/github/actions/workflow/status/extractions/setup-crate/build.yaml?branch=trunk)](https://github.com/extractions/setup-crate/actions/workflows/build.yaml)

This GitHub Action will install a release of a Rust crate for you.

## Introduction

This action will work for any project that satisfies the following conditions:
- The project is a public GitHub project.
- The project uses GitHub releases with semver tag names.
- The project attaches assets to the GitHub release that contain a Rust target.
  The following targets are looked for:

  | Node Platform | Targets                                                   |
  | ------------- | --------------------------------------------------------- |
  | `linux`       | `x86_64-unknown-linux-musl` or `x86_64-unknown-linux-gnu` |
  | `darwin`      | `x86_64-apple-darwin`                                     |
  | `win32`       | `x86_64-pc-windows-msvc`                                  |
- The asset is a `.tar.gz` or `.zip` archive that contains a binary with the
  project name.

## Usage

### Examples

In most cases all you will need is to specify the `owner` and the `name` of the
project in your workflow. For example the following installs the latest version
of [mdBook](https://github.com/rust-lang/mdBook).

```yaml
- uses: extractions/setup-crate@v1
  with:
    owner: rust-lang
    name: mdBook
```

If you want a specific version you can specify this by passing the `version`
input. For example the following installs the latest `0.10.x` version of
[just](https://github.com/casey/just).

```yaml
- uses: extractions/setup-crate@v1
  with:
    owner: casey
    name: just
    version: 0.10
```

### Inputs

| Name           | Required | Description                              | Type   | Default                     |
| -------------- | -------- | ---------------------------------------- | ------ | --------------------------- |
| `owner`        | yes      | The GitHub user or organization name     | string |                             |
| `name`         | yes      | The GitHub repository name               | string |                             |
| `version`      | no       | A valid NPM-style semver specification   | string | *                           |
| `github-token` | no       | The GitHub token for making API requests | string | ${{ secrets.GITHUB_TOKEN }} |

The semver specification is passed directly to NPM's [semver
package](https://www.npmjs.com/package/semver). This GitHub Action will install
the latest matching release. Examples include

- `version: '*'` latest version (default).
- `version: '0.1'` equivalent to `>=0.1.0 <0.2.0`.
- `version: '0.1.x'` equivalent to `>=0.1.0 <0.2.0`.
- `version: '0.1.0'` equivalent to `=0.1.0`.
- `version: '^0.1.0'` equivalent to `>=0.1.0 <0.2.0`.

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or
   http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
