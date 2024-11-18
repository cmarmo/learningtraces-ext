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

async function writelt(
  contentsManager: ContentsManager,
  filename: string,
  content: string
) {
  try {
    contentsManager.save(filename, {
      content: content,
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
  activate: async (app: JupyterFrontEnd, settings: ISettingRegistry) => {
    console.log('JupyterLab extension learning_traces_extension is activated!');

    let learningtag: string | string[] = '';
    let learningpath: string = '';
    let nestedKeys = false;

    /**
     * Load the settings for this extension
     *
     * @param settings Extension settings
     */
    function loadSetting(setting: ISettingRegistry.ISettings): void {
      // Read the settings and convert to the correct type
      learningtag = setting.get('learningtag').composite as string;
      let tags: string[] = [];
      if (learningtag !== '') {
        tags = learningtag.split('.');
        if (tags.length > 1) {
          nestedKeys = true;
          learningtag = tags;
        } else {
          learningtag = tags[0];
        }
      }

      console.log(
        `Learning Traces Extension Settings: learningtag is set to '${learningtag}'`
      );
      learningpath = setting.get('learningpath').composite as string;
      console.log(
        `Learning Traces Extension Settings: learningpath is set to '${learningpath}'`
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

    const contents = new ContentsManager();
    let learningContent = '';

    NotebookActions.executed.connect((_, args) => {
      const { cell, notebook, success } = args;
      let tagValue = '';
      if (cell.model.type === 'code') {
        if (nestedKeys) {
          tagValue = cell.model.getMetadata(learningtag[0]);
          for (let i = 1; i < learningtag.length; i++) {
            const descriptor = Object.getOwnPropertyDescriptor(
              tagValue,
              learningtag[i]
            );
            tagValue = descriptor?.value;
          }
        } else {
          tagValue = cell.model.getMetadata(learningtag as string);
        }
        if (learningtag === '' || (learningtag !== '' && tagValue)) {
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
          learningContent += JSON.stringify(jsonCellOutput, undefined, 4);
          const filename = learningpath + '/' + LEARNING_TRACE_FILE;
          writelt(contents, filename, learningContent);
        }
      }
    });
  }
};

export default plugin;
