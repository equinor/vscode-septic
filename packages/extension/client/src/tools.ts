/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import * as protocol from "./protocol";

interface GetVariablesParams {
    uri?: string;
}

export function registerChatTools(
    context: vscode.ExtensionContext,
    client: LanguageClient,
) {
    context.subscriptions.push(
        vscode.lm.registerTool(
            "septic-tools_get_functions",
            new GetFunctions(client),
        ),
    );
    context.subscriptions.push(
        vscode.lm.registerTool(
            "septic-tools_get_variables",
            new GetVariables(client),
        ),
    );
}

export class GetFunctions implements vscode.LanguageModelTool<object> {
    private client: LanguageClient;
    constructor(client: LanguageClient) {
        this.client = client;
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<object>,
        _token: vscode.CancellationToken,
    ) {
        const documentation = await this.client.sendRequest(
            protocol.documentation,
            {},
        );
        const functions = documentation.calcs
            .map((calc) => {
                let description = calc.detailedDescription;
                description = description.replace(/(\r\n|\n|\r|<br>)/gm, "");
                if (description.length > 50) {
                    description = description.slice(0, 75) + "...";
                }
                return `${calc.signature}: ${description}`;
            })
            .join("\n");
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
                `Available functions that can be used in calculations:\n${functions}`,
            ),
        ]);
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<object>,
        _token: vscode.CancellationToken,
    ) {
        return {};
    }
}

export class GetVariables implements vscode.LanguageModelTool<GetVariablesParams> {
    private client: LanguageClient;
    constructor(client: LanguageClient) {
        this.client = client;
    }
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<GetVariablesParams>,
        _token: vscode.CancellationToken,
    ) {
        const uri =
            options.input.uri ??
            vscode.window.activeTextEditor?.document.uri.toString();
        const variables = await this.client.sendRequest(protocol.variables, {
            uri: uri,
        });
        const variablesString =
            variables
                ?.map((variable) => {
                    return `${variable.type} ${variable.name}: ${variable.description}`;
                })
                .join("\n") ?? "";
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
                `Available variables in the current context with type, name and description:\n${variablesString}`,
            ),
        ]);
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<GetVariablesParams>,
        _token: vscode.CancellationToken,
    ): Promise<vscode.PreparedToolInvocation> {
        const uri =
            options.input.uri ??
            vscode.window.activeTextEditor?.document.uri.toString();
        return {
            invocationMessage: uri
                ? `Getting variables for ${vscode.Uri.parse(uri).fsPath}`
                : "Getting variables for active editor",
        };
    }
}
