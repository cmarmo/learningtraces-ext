# learning_traces_extension

A jupyter extension that save learning traces when executing a notebook.

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install git+https://github.com/cmarmo/learningtraces-ext.git
```

<!--pip install learning_traces_extension-->

## Uninstall

To remove the extension, execute:

```bash
pip uninstall learning_traces_extension
```

## Settings

Settings are described in the the [plugin schema](schema/plugin.json).
They can be programmatically set using `default_setting_overrides.json`,
or in local configuration files which should be called `learningtrace_config.yml`
and placed at any level of the notebook directory tree.

- _local_ : whether the configuration file should be looked for locally,
  the local configuration file should be called `learningtrace_config.yml`
- _learningtag_ : the tag used in cell metadata to identify learning cells
  which output should be recorded;
- _learningtrace_ : the name of the file containing the learning traces;
- _learningpath_ : the path of the learning traces;
- _trackedtags_ : the list of additional informations stored in the learning trace.
- _trackedoutputs_ : The list of output types stored in the learning trace.

Please note that by default the learning trace is a hidden file, unless a non-hidden
name has been set in the settings, Jupyter Lab should be launched with

```bash
jupyter lab --ContentsManager.allow_hidden=True
```

See the server [documentation](https://jupyterlab.readthedocs.io/en/stable/user/files.html#displaying-hidden-files) for more details.

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the learning_traces_extension directory
# Install package in development mode
pip install -e "."
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
pip uninstall learning_traces_extension
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `learning-traces-extension` within that folder.

### Testing the extension

#### Frontend tests

This extension is using [Jest](https://jestjs.io/) for JavaScript code testing.

To execute them, execute:

```sh
jlpm
jlpm test
```

#### Integration tests

This extension uses [Playwright](https://playwright.dev/docs/intro) for the integration tests (aka user level tests).
More precisely, the JupyterLab helper [Galata](https://github.com/jupyterlab/jupyterlab/tree/master/galata) is used to handle testing the extension in JupyterLab.

More information are provided within the [ui-tests](./ui-tests/README.md) README.

### Packaging the extension

See [RELEASE](RELEASE.md)
