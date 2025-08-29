import { ContentsManager } from '@jupyterlab/services';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { NotebookActions, INotebookTracker } from '@jupyterlab/notebook';
import { CodeCellModel } from '@jupyterlab/cells';
import { IJupyterLabPioneer } from 'jupyterlab-pioneer';
import { Exporter } from 'jupyterlab-pioneer/lib/types';

import { learnRecord, getData, readRecursively, learnObject } from './types';

const PLUGIN_ID = 'learning-traces-extension:plugin';
const d = new Date();
const LEARNING_TRACE_FILE =
  '.learningtrace_' + d.getTime().toString() + '.jsonl';
const LOCAL_CONFIG_FILE = 'learningtrace_config.yml';

/**
 * Initialization data for the jupyterlab learning traces extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description:
    'A jupyter extension that save learning traces when executing a notebook.',
  autoStart: true,
  requires: [ISettingRegistry, IJupyterLabPioneer, INotebookTracker],
  activate: async (
    app: JupyterFrontEnd,
    settings: ISettingRegistry,
    pioneer: IJupyterLabPioneer,
    tracker: INotebookTracker
  ) => {
    console.log('JupyterLab extension learning-traces-extension is activated!');

    let recordCellFlag: string | string[] = '';
    let learningObjectId: string | string[] = '';
    let learningTrace: string = '';
    let nestedKeys: boolean = false;
    let trackedTags: string | string[] | string[][] = '';
    let trackedOutputs: string | string[] = '';
    let alloutput: boolean = false;
    const nestedTags: boolean[] = [];

    /**
     * Load the settings for this extension
     *
     * @param settings Extension settings
     */
    function loadSetting(setting: ISettingRegistry.ISettings): void {
      // Read the settings and convert to the correct type

      recordCellFlag = setting.get('recordCellFlag').composite as string;
      console.debug(
        `Learning Traces Extension Settings: recordCellFlag is set to '${recordCellFlag}'`
      );

      learningObjectId = setting.get('learningObjectId').composite as string;
      console.debug(
        `Learning Traces Extension Settings: learningObjectId is set to '${learningObjectId}'`
      );

      learningTrace = setting.get('learningTrace').composite as string;
      if (learningTrace === '') {
        learningTrace = LEARNING_TRACE_FILE;
      }
      console.debug(
        `Learning Traces Extension Settings: learningTrace is set to '${learningTrace}'`
      );

      trackedTags = setting.get('trackedTags').composite as string;
      console.debug(
        `Learning Traces Extension Settings: trackedTags is set to '${trackedTags}'`
      );

      trackedOutputs = setting.get('trackedOutputs').composite as string;
      console.debug(
        `Learning Traces Extension Settings: trackedOutputs is set to '${trackedOutputs}'`
      );

      let tags: string[] = [];
      if (recordCellFlag !== '') {
        tags = recordCellFlag.split('.');
        if (tags.length > 1) {
          nestedKeys = true;
          recordCellFlag = tags;
        } else {
          recordCellFlag = tags[0];
        }
      }

      let ltags: string[] = [];
      if (learningObjectId !== undefined) {
        ltags = learningObjectId.split('.');
        if (ltags.length > 1) {
          nestedKeys = true;
          learningObjectId = ltags;
        } else {
          learningObjectId = ltags[0];
        }
      }

      if (trackedTags !== '') {
        const tobeTracked = trackedTags.split(',');
        trackedTags = tobeTracked;
        for (let i = 0; i < trackedTags.length; i++) {
          tags = trackedTags[i].split('.');
          if (tags.length > 1) {
            nestedTags[nestedTags.length] = true;
          } else {
            nestedTags[nestedTags.length] = false;
          }
        }
      }

      if (trackedOutputs === 'all') {
        alloutput = true;
      } else {
        const outputs = trackedOutputs.split(',');
        for (let i = 0; i < outputs.length; i++) {
          outputs[i].trim();
        }
        trackedOutputs = outputs;
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
    NotebookActions.executed.connect(async (_: any, args: any) => {
      const { cell, success } = args;
      const notebookPanel = tracker.currentWidget;
      const path = notebookPanel?.context.path;
      const pathComponents = path?.split('/') || [];
      const repolevels = pathComponents.length;
      let i = repolevels;
      let get_success = false;
      let configpath = '';
      while (i > 0 && !get_success) {
        i -= 1;
        configpath = '';
        for (let j = 0; j < i; j++) {
          configpath += pathComponents[j] + '/';
        }
        const url = '/' + configpath + LOCAL_CONFIG_FILE;
        try {
          const config = await getData(contents, url);
          learningTrace = configpath + config.learningTrace || learningTrace;
          let tags: string[] = [];
          if (
            Object.prototype.hasOwnProperty.call(config, 'recordCellFlag') &&
            config.recordCellFlag !== ''
          ) {
            tags = config.recordCellFlag.split('.');
            if (tags.length > 1) {
              nestedKeys = true;
              recordCellFlag = tags;
            } else {
              recordCellFlag = tags[0];
            }
          }

          let ltags: string[] = [];
          if (
            Object.prototype.hasOwnProperty.call(config, 'learningObjectId') &&
            config.learningObjectId !== ''
          ) {
            ltags = config.learningObjectId.split('.');
            if (ltags.length > 1) {
              nestedKeys = true;
              learningObjectId = ltags;
            } else {
              learningObjectId = ltags[0];
            }
          }

          if (
            Object.prototype.hasOwnProperty.call(config, 'trackedTags') &&
            config.trackedTags !== ''
          ) {
            const tobeTracked = config.trackedTags.split(',');
            for (let i = 0; i < tobeTracked.length; i++) {
              tags = tobeTracked[i].split('.');
              if (tags.length > 1) {
                nestedTags[nestedTags.length] = true;
              } else {
                nestedTags[nestedTags.length] = false;
              }
              trackedTags = tobeTracked;
            }
          }
          if (
            Object.prototype.hasOwnProperty.call(config, 'trackedOutputs') &&
            config.trackedOutputs !== ''
          ) {
            if (config.trackedOutputs === 'all') {
              alloutput = true;
            } else {
              const outputs = config.trackedOutputs.split(',');
              for (let i = 0; i < outputs.length; i++) {
                outputs[i].trim();
              }
              trackedOutputs = outputs;
            }
          }
          get_success = true;
        } catch (error: any) {
          console.warn(
            `Cannot read '${'/' + configpath + LOCAL_CONFIG_FILE}' local configuration: '${error.message}'`
          );
        }
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
      let objectTag = '';
      if (cell.model.type === 'code') {
        tagValue = readRecursively(
          cell.model as CodeCellModel,
          nestedKeys,
          recordCellFlag
        );
        if (learningObjectId !== undefined) {
          objectTag = readRecursively(
            cell.model as CodeCellModel,
            nestedKeys,
            learningObjectId
          );
        }
        if (recordCellFlag !== '' && tagValue) {
          const myCellModel = cell.model as CodeCellModel;
          let tags: string[] = [];
          let cellMetadata = '';
          if (trackedTags.length > 0) {
            cellMetadata += '{';
            for (let i = 0; i < trackedTags.length; i++) {
              const tag = (trackedTags[i] as string).trim();
              tags = tag.split('.');
              const trackValue = readRecursively(
                myCellModel,
                nestedTags[i],
                tags
              );
              cellMetadata += '"' + tag + '" : "' + trackValue + '"';
              if (i < trackedTags.length - 1) {
                cellMetadata += ',';
              }
            }
            cellMetadata += '}';
          }

          const learnedCell = myCellModel.outputs.toJSON();
          let outputString: string = '';
          if (alloutput) {
            outputString = ', "outputs" : ' + JSON.stringify(learnedCell);
          } else {
            if (trackedOutputs[0] !== 'none') {
              outputString = ', "outputs" : [';
              for (const output of learnedCell) {
                for (const outputType of trackedOutputs) {
                  if (output.output_type === outputType) {
                    outputString += JSON.stringify(output);
                  }
                }
              }
              outputString += ']';
            }
          }

          const notebookPath =
            configpath === '' ? path : path?.split(configpath)[1];
          const jsonOutput: learnRecord = {
            time: timestamp,
            notebook: notebookPath,
            success: success,
            action: 'execute',
            outputs: outputString !== '' ? outputString : undefined,
            cellmetadata:
              cellMetadata !== '' ? JSON.parse(cellMetadata) : undefined
          };

          if (objectTag !== '') {
            const learningObject: learnObject = {
              fileID: notebookPath,
              cellID: objectTag
            };
            jsonOutput.learning_objectID = `${learningObject.fileID}#${learningObject.cellID}`;
          }

          const event = {
            eventName: 'CellExecuteEvent',
            eventData: jsonOutput
          };

          const exporter_type: Exporter = {
            type: 'custom_exporter',
            args: {
              path: learningTrace,
              id: 'JSONlExporter'
            }
          };

          if (notebookPanel !== null) {
            await pioneer.publishEvent(
              notebookPanel,
              event,
              exporter_type,
              false
            );
          }
        }
      }
    });
  }
};

export default plugin;
