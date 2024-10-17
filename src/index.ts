//import { writeFile } from 'node:fs/promises';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker, NotebookActions } from '@jupyterlab/notebook';
import { CodeCellModel } from '@jupyterlab/cells'

async function writelt(content: String) {
  try {
    //await writeFile('./learningtrace.json', content);
    console.log(content);
  } catch (err) {
    console.log(err);
  }
}

/**
 * Initialization data for the jupyterlab learning traces extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'learning-traces-extension:plugin',
  description: 'A jupyter extension that save learning traces when executing a notebook.',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, tracker: INotebookTracker) => {
    NotebookActions.executed.connect((_, args) => {
      const { cell, notebook, success } = args;
      if (cell.model.type === 'code') {
        const myCellModel = cell.model as CodeCellModel;
        const learnedCell = myCellModel.outputs.toJSON();
        let jsonCellOutput = JSON.parse(JSON.stringify(learnedCell)) 
        jsonCellOutput.push({"success": success});
        writelt(JSON.stringify(jsonCellOutput));
        console.log(notebook);
      }
    });
  }
};

export default plugin;