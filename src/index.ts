import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { runIcon } from '@jupyterlab/ui-components';
import { CodeCellModel } from '@jupyterlab/cells'

const CommandIds = {
  /**
   * Command to run a code cell.
   */
  runCodeCell: 'toolbar-button:run-code-cell'
};

/**
 * Initialization data for the @jupyterlab-examples/cell-toolbar extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'learning-traces-extension:plugin',
  description: 'A jupyter extension that save learning traces when executing a notebook.',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, tracker: INotebookTracker) => {
    const commandID = 'save-trace';
    let toggled = false;
    
    app.commands.addCommand(commandID, {
      label: 'Save the learning trace.',
      isEnabled: () => true,
      isVisible: () => true,
      isToggled: () => toggled,
      iconClass: 'some-css-icon-class',
      execute: () => {
        const myCellModel =  tracker.activeCell?.model as CodeCellModel;
        const learnedCell = myCellModel.outputs;
        console.log(learnedCell.toJSON()[0]);
        console.log(`Executed ${commandID}`);
        toggled = !toggled;
      }
    });

    const { commands } = app;

    /* Adds a command enabled only on code cell */
    commands.addCommand(CommandIds.runCodeCell, {
      icon: runIcon,
      caption: 'Run a code cell',
      execute: () => {
        commands.execute('notebook:run-cell');
        commands.execute('save-trace');
      },
      isVisible: () => tracker.activeCell?.model.type === 'code'
    });
  }
};

export default plugin;