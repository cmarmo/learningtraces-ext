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
// Create a new file
await root.getFileHandle(LEARNING_TRACE_FILE, { create: true });

async function writelt(content: string) {
  try {
    const filehandle = await root.getFileHandle(LEARNING_TRACE_FILE);
    const writableopfs = await filehandle.createWritable({ keepExistingData: true });
    await writableopfs.write(content);
    await writableopfs.close();
    const file = await filehandle.getFile();
    console.log(await file.text());
    // POST the file using Jupyter Server API
    //const serverUrl = location.protocol + "//" + location.host + "/api/contents/";
    const serverUrl = location.protocol + "//" + location.host + "/api/me";
    const response = await fetch(serverUrl, {
      //method: 'PUT',
      method: 'GET',
      /*body: JSON.stringify(
        {'name': LEARNING_TRACE_FILE,
         'path' :( '' + LEARNING_TRACE_FILE),
         'format': 'json',
         'type': 'file',
         'content': await file.text()
        })*/
      //headers: {'Content-Type': 'application/json', 'Authorization': 'key='+API_KEY} 
    });
    
    if (!response.ok) 
    { 
        console.error("Error");
    }
    else if (response.status >= 400) {
        console.error('HTTP Error: '+response.status+' - '+response.statusText);
    }
    else{
        //onSuccess();
        console.log(response.body);
    }
    // Obtain a file handle to a new file in the user-visible file system
    // with the same name as the file in the origin private file system.
    // This is not supported yet in Firefox
    /*const saveHandle = await showSaveFilePicker({
      suggestedName: filehandle.name || ''
    });
    const writable = await saveHandle.createWritable();
    await writable.write(await filehandle.getFile());
    await writable.close();*/

    // Create the blob URL.
    //const blobURL = URL.createObjectURL(file);
    // Create the `<a download>` element and append it invisibly.
    //const a = document.createElement('a');
    //a.href = blobURL;
    //a.download = filehandle.name;
    //a.style.display = 'none';
    //document.body.append(a);
    // Programmatically click the element.
    //a.click();
    // Revoke the blob URL and remove the element.
    //setTimeout(() => {
    //  URL.revokeObjectURL(blobURL);
    //  a.remove();
    //}, 1000);
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
          writelt(JSON.stringify(jsonCellOutput, undefined, 4));
          console.log(notebook);
        }
      }
    });
  }
};

export default plugin;