import { ContentsManager } from '@jupyterlab/services';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { NotebookActions } from '@jupyterlab/notebook';
import { CodeCellModel } from '@jupyterlab/cells';
const PLUGIN_ID = 'learning-traces-extension:plugin';
const d = new Date();
const LEARNING_TRACE_FILE =
  '.learningtrace_' + d.getTime().toString() + '.jsonl';

const contents = new ContentsManager();
let learningContent = '';
const model = await contents.newUntitled({
  path: '',
  type: 'file',
  ext: 'jsonl'
});
contents.rename(model.path, LEARNING_TRACE_FILE);

async function writelt(content: string) {
  try {
    learningContent += content;
    contents.save(LEARNING_TRACE_FILE, {
      content: learningContent,
      format: 'text',
      type: 'file'
    });
  } catch (err) {
    console.log(err);
  }
}

/**
 * Initialization data for the jupyterlab learning traces extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description:
    'A jupyter extension that save learning traces when executing a notebook.',
  autoStart: true,
  requires: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, settings: ISettingRegistry) => {
    console.log('JupyterLab extension learning_traces_extension is activated!');

    let learningtag = '';

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
          learningtag === '' ||
          (learningtag !== '' && cell.model.getMetadata(learningtag))
        ) {
          const myCellModel = cell.model as CodeCellModel;
          const learnedCell = myCellModel.outputs.toJSON();
          const jsonStringOutput =
            '{ "outputs" : ' +
            JSON.stringify(learnedCell) +
            ', "success" : ' +
            success +
            ', "notebook" : "' +
            notebook.node.baseURI +
            '" }';
          const jsonCellOutput = JSON.parse(jsonStringOutput);
          writelt(JSON.stringify(jsonCellOutput, undefined, 4));
        }
      }
    });
  }
};

export default plugin;
