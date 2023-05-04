import { RequestType } from "vscode-languageserver";

export const findCnfgFilesInWorkspace = new RequestType<{}, string[], any>(
    "septic/findCnfgFilesInWorkspace"
);

export const fsReadFile = new RequestType<{ uri: string }, number[], any>(
    "septic/fs_readfile"
);

export const findYamlFiles = new RequestType<{}, string[], any>(
    "septic/findYamlFiles"
);

export const fsWatcherUpdate = new RequestType<{ uri: string }, void, any>(
    "septic/fsWatcherUpdate"
);
