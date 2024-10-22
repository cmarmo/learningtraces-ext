//import { writeFile } from 'node:fs/promises';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { NotebookActions } from '@jupyterlab/notebook';
import { CodeCellModel } from '@jupyterlab/cells'

const PLUGIN_ID = 'learning-traces-extension:plugin';
const LEARNING_TRACE_FILE = '.learningtrace.json';

const root = await navigator.storage.getDirectory();
// Create a new file handle
const fileHandle = await root.getFileHandle(LEARNING_TRACE_FILE, { create: true });

async function writelt(filehandle: FileSystemFileHandle, content: string) {
  try {
    //await writeFile('./learningtrace.json', content);
    const writable = await filehandle.createWritable();
    await writable.write(content);
    await writable.close();
    console.log(content);
  } catch (err) {
    console.log(err);
  }
}

/**
 * Initialization data for the jupyterlab learning traces extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'A jupyter extension that save learning traces when executing a notebook.',
  autoStart: true,
  requires: [ ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    settings: ISettingRegistry
  ) => {
    console.log('JupyterLab extension learning_traces_extension is activated!');

    let learningtag = "";

    /**
     * Load the settings for this extension
     *
     * @param settings Extension settings
     */
    function loadSetting(setting: ISettingRegistry.ISettings): void {
      // Read the settings and convert to the correct type
      learningtag = setting.get('learningtag').composite as string;
      console.log(
        `Learning Traces Extension Settings: learningtag is set to '${learningtag}'`
      );
    }

    // Wait for the application to be restored and
    // for the settings for this plugin to be loaded
    Promise.all([app.restored, settings.load(PLUGIN_ID)])
      .then(([, setting]) => {
        // Read the settings
        loadSetting(setting);

        // Listen for your plugin setting changes using Signal
        setting.changed.connect(loadSetting);
      })
      .catch(reason => {
        console.error(
          `Something went wrong when reading the settings.\n${reason}`
        );
      });

    NotebookActions.executed.connect((_, args) => {
      const { cell, notebook, success } = args;
      if (cell.model.type === 'code') {
        if (
          learningtag === "" ||
          (learningtag !== "" && cell.model.getMetadata(learningtag))
        ) {
          const myCellModel = cell.model as CodeCellModel;
          const learnedCell = myCellModel.outputs.toJSON();
          let jsonCellOutput = JSON.parse(JSON.stringify(learnedCell))
          jsonCellOutput.push({"success": success});
          writelt(fileHandle, JSON.stringify(jsonCellOutput, undefined, 4));
          console.log(notebook);
        }
      }
    });
  }
};

export default plugin;