import YAML from 'yaml';

import { ContentsManager } from '@jupyterlab/services';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { NotebookActions, INotebookTracker } from '@jupyterlab/notebook';
import { CodeCellModel } from '@jupyterlab/cells';
const PLUGIN_ID = 'learning-traces-extension:plugin';
const d = new Date();
const LEARNING_TRACE_FILE =
  '.learningtrace_' + d.getTime().toString() + '.jsonl';
const LOCAL_CONFIG_FILE = 'learningtrace_config.yml';

async function getData(contents: ContentsManager, url: string) {
  const config = YAML.parse((await contents.get(url)).content);
  return config;
}

function readRecursively(
  cellmodel: CodeCellModel,
  nested: boolean,
  tags: string | string[]
) {
  let tagValue: string = '';
  if (nested) {
    tagValue = cellmodel.getMetadata(tags[0]);
    if (tagValue !== undefined) {
      for (let i = 1; i < tags.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(tagValue, tags[i]);
        tagValue = descriptor?.value;
      }
    }
  } else {
    tagValue = cellmodel.getMetadata(tags as string);
  }
  return tagValue;
}

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
  requires: [ISettingRegistry, INotebookTracker],
  activate: async (
    app: JupyterFrontEnd,
    settings: ISettingRegistry,
    tracker: INotebookTracker
  ) => {
    console.log('JupyterLab extension learning-traces-extension is activated!');

    let learningtag: string | string[] = '';
    let learningtrace: string = '';
    let learningpath: string = '';
    let nestedKeys: boolean = false;
    let trackedtags: string | string[] | string[][] = '';
    const nestedTags: boolean[] = [];

    /**
     * Load the settings for this extension
     *
     * @param settings Extension settings
     */
    function loadSetting(setting: ISettingRegistry.ISettings): void {
      // Read the settings and convert to the correct type

      learningtag = setting.get('learningtag').composite as string;
      console.debug(
        `Learning Traces Extension Settings: learningtag is set to '${learningtag}'`
      );

      learningtrace = setting.get('learningtrace').composite as string;
      if (learningtrace === '') {
        learningtrace = LEARNING_TRACE_FILE;
      }
      console.debug(
        `Learning Traces Extension Settings: learningtrace is set to '${learningtrace}'`
      );

      learningpath = setting.get('learningpath').composite as string;
      console.debug(
        `Learning Traces Extension Settings: learningpath is set to '${learningpath}'`
      );

      trackedtags = setting.get('trackedtags').composite as string;
      console.debug(
        `Learning Traces Extension Settings: trackedtags is set to '${trackedtags}'`
      );

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

      if (trackedtags !== '') {
        const tobeTracked = trackedtags.split(',');
        trackedtags = tobeTracked;
        for (let i = 0; i < trackedtags.length; i++) {
          tags = trackedtags[i].split('.');
          if (tags.length > 1) {
            nestedTags[nestedTags.length] = true;
          } else {
            nestedTags[nestedTags.length] = false;
          }
        }
      }
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
      const { cell, success } = args;
      const path = tracker.currentWidget?.context.path;
      const pathComponents = path?.split('/') || [];
      const repolevels = pathComponents.length;
      let i = repolevels;
      let get_success = false;
      while (i > 0 && !get_success) {
        i -= 1;
        let configpath = '';
        for (let j = 0; j < i; j++) {
          configpath += pathComponents[j] + '/';
        }
        getData(contents, '/' + configpath + LOCAL_CONFIG_FILE)
          .then(config => {
            learningtrace = config.learningtrace || learningtrace;
            learningpath = config.learningpath || learningpath;
            let tags: string[] = [];
            if (
              Object.prototype.hasOwnProperty.call(config, 'learningtag') &&
              config.learningtag !== ''
            ) {
              tags = config.learningtag.split('.');
              if (tags.length > 1) {
                nestedKeys = true;
                learningtag = tags;
              } else {
                learningtag = tags[0];
              }
            }

            if (
              Object.prototype.hasOwnProperty.call(config, 'trackedtags') &&
              config.trackedtags !== ''
            ) {
              const tobeTracked = config.trackedtags.split(',');
              for (let i = 0; i < tobeTracked.length; i++) {
                tags = tobeTracked[i].split('.');
                if (tags.length > 1) {
                  nestedTags[nestedTags.length] = true;
                } else {
                  nestedTags[nestedTags.length] = false;
                }
                trackedtags = tobeTracked;
              }
            }
            get_success = true;
          })
          .catch((error: any) => {
            console.warn(
              `Cannot read '${'/' + configpath + LOCAL_CONFIG_FILE}' local configuration: '${error.message}'`
            );
          });
      }
      const time = new Date();
      const timestamp =
        time.getFullYear().toPrecision(4).toString() +
        '-' +
        ('0' + (time.getMonth() + 1).toString()).slice(-2) +
        '-' +
        ('0' + time.getDate().toString()).slice(-2) +
        '-' +
        ('0' + time.getHours().toString()).slice(-2) +
        ('0' + time.getMinutes().toString()).slice(-2) +
        ('0' + time.getSeconds().toString()).slice(-2);
      let tagValue = '';
      if (cell.model.type === 'code') {
        tagValue = readRecursively(
          cell.model as CodeCellModel,
          nestedKeys,
          learningtag
        );
        if (learningtag !== '' && tagValue) {
          const myCellModel = cell.model as CodeCellModel;
          let tags: string[] = [];
          let cellMetadata = '';
          for (let i = 0; i < trackedtags.length; i++) {
            const tag = (trackedtags[i] as string).trim();
            tags = tag.split('.');
            const trackValue = readRecursively(
              myCellModel,
              nestedTags[i],
              tags
            );
            cellMetadata += ', "' + tag + '" : "' + trackValue + '"';
          }

          const learnedCell = myCellModel.outputs.toJSON();
          const jsonStringOutput =
            '{ "time": "' +
            timestamp +
            '", "outputs" : ' +
            JSON.stringify(learnedCell) +
            ', "success" : ' +
            success +
            cellMetadata +
            ', "notebook" : "' +
            path +
            '" }';
          const jsonCellOutput = JSON.parse(jsonStringOutput);
          const filename = learningpath + '/' + learningtrace;
          contents
            .get(filename)
            .then(filemodel => {
              learningContent = filemodel.content;
            })
            .catch(error => {
              console.warn(error);
            })
            .then(() => {
              learningContent += JSON.stringify(jsonCellOutput) + '\n';
              writelt(contents, filename, learningContent);
            });
        }
      }
    });
  }
};

export default plugin;
