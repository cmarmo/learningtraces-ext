import YAML from 'yaml';

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

type learnRecord = {
  time: string;
  notebookPath: string | undefined;
  success: boolean;
  outputs?: string;
  cellmetadata?: object;
};

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
  if (typeof tags === 'string') {
    tags = [tags];
  }
  let tagValue: string = cellmodel.getMetadata(tags[0]);
  if (tagValue !== undefined) {
    for (let i = 1; i < tags.length; i++) {
      const descriptor = Object.getOwnPropertyDescriptor(tagValue, tags[i]);
      tagValue = descriptor?.value;
      console.log(tagValue);
    }
  }
  return tagValue;
}

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

    let learningtag: string | string[] = '';
    let learningtrace: string = '';
    let nestedKeys: boolean = false;
    let trackedtags: string | string[] | string[][] = '';
    let trackedoutputs: string | string[] = '';
    let alloutput: boolean = false;
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

      trackedtags = setting.get('trackedtags').composite as string;
      console.debug(
        `Learning Traces Extension Settings: trackedtags is set to '${trackedtags}'`
      );

      trackedoutputs = setting.get('trackedoutputs').composite as string;
      console.debug(
        `Learning Traces Extension Settings: trackedoutputs is set to '${trackedoutputs}'`
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

      if (trackedoutputs === 'all') {
        alloutput = true;
      } else {
        const outputs = trackedoutputs.split(',');
        for (let i = 0; i < outputs.length; i++) {
          outputs[i].trim();
        }
        trackedoutputs = outputs;
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
          learningtrace = configpath + config.learningtrace || learningtrace;
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
          if (
            Object.prototype.hasOwnProperty.call(config, 'trackedoutputs') &&
            config.trackedoutputs !== ''
          ) {
            if (config.trackedoutputs === 'all') {
              alloutput = true;
            } else {
              const outputs = config.trackedoutputs.split(',');
              for (let i = 0; i < outputs.length; i++) {
                outputs[i].trim();
              }
              trackedoutputs = outputs;
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
          if (trackedtags.length > 0) {
            cellMetadata += '{';
            for (let i = 0; i < trackedtags.length; i++) {
              const tag = (trackedtags[i] as string).trim();
              tags = tag.split('.');
              const trackValue = readRecursively(
                myCellModel,
                nestedTags[i],
                tags
              );
              cellMetadata += '"' + tag + '" : "' + trackValue + '"';
              if (i < trackedtags.length - 1) {
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
            if (trackedoutputs[0] !== 'none') {
              outputString = ', "outputs" : [';
              for (const output of learnedCell) {
                for (const outputType of trackedoutputs) {
                  if (output.output_type === outputType) {
                    outputString += JSON.stringify(output);
                  }
                }
              }
              outputString += ']';
            }
          }
          const jsonOutput: learnRecord = {
            time: timestamp,
            notebookPath: configpath === '' ? path : path?.split(configpath)[1],
            success: success,
            outputs: outputString !== '' ? outputString : undefined,
            cellmetadata:
              cellMetadata !== '' ? JSON.parse(cellMetadata) : undefined
          };
          const event = {
            eventName: 'CellExecuteEvent',
            eventData: jsonOutput
          };

          const exporter_type: Exporter = {
            type: 'custom_exporter',
            args: {
              path: learningtrace,
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
