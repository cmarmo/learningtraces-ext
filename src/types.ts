import YAML from 'yaml';
import { CodeCellModel } from '@jupyterlab/cells';
import { ContentsManager } from '@jupyterlab/services';

export type learnRecord = {
  time: string;
  notebookPath: string | undefined;
  success: boolean;
  outputs?: string;
  cellmetadata?: object;
};

export async function getData(contents: ContentsManager, url: string) {
  const config = YAML.parse((await contents.get(url)).content);
  return config;
}

export function readRecursively(
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
