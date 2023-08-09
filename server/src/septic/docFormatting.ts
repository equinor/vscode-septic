import { code, h4, horizontalRule } from "../util/markdown";
import {
    SepticAttributeDocumentation,
    SepticCalcInfo,
    SepticCalcParameterInfo,
    SepticObjectDocumentationInput,
} from "./septicMetaInfo";

export function formatObjectDocumentationMarkdown(
    objDoc: SepticObjectDocumentationInput
) {
    let markdown: string[] = [];
    markdown.push(h4(objDoc.name));
    markdown.push(horizontalRule());
    markdown.push(`${objDoc.description}`);
    markdown.push("Attributes:");
    objDoc.attributes.forEach((attr) => {
        markdown.push(formatObjectAttribute(attr));
    });
    return markdown.join("\n\n");
}

export function formatObjectAttribute(
    attrDoc: SepticAttributeDocumentation,
    long = false
) {
    if (!long) {
        return "`" + attrDoc.name + "`" + `: ${attrDoc.briefDescription}`;
    }
    let doc = h4(attrDoc.name);
    let newline = "\n\n";
    doc += newline + horizontalRule();
    doc += newline + attrDoc.briefDescription;
    doc += newline + code("DataType:") + " " + attrDoc.dataType;
    if (attrDoc.dataType === "Enum") {
        doc += newline + code("Enums:") + " " + `${attrDoc.enums.join("|")}`;
    }
    if (attrDoc.list) {
        doc += newline + code("List:") + " True";
    }
    if (attrDoc.default !== "") {
        doc += newline + code("Default:") + " " + attrDoc.default;
    }
    if (attrDoc.tags.length) {
        doc += newline + code("Tags:");
        doc += attrDoc.tags
            .map((tag) => {
                return tag;
            })
            .join(",");
    }
    if (attrDoc.detailedDescription !== "") {
        doc += newline + attrDoc.detailedDescription;
    }
    return doc;
}

export function formatCalcMarkdown(
    calc: SepticCalcInfo,
    short: boolean = false
) {
    let formattedParameters = calc.parameters.map((param) => {
        return formatCalcParameter(param);
    });
    let markdown = [
        "```js\n" + `function ${calc.signature}` + "\n```",
        horizontalRule(),
        `${calc.briefDescription.replace(/\r\n/g, "\n")}`,
    ];

    if (formattedParameters.length) {
        markdown.push(
            "\n```\n" + formattedParameters[0],
            ...formattedParameters.slice(1),
            `@return - ${calc.retr}` + "\n```\n"
        );
    }

    if (!short) {
        markdown.push(calc.detailedDescription.replace(/\r\n/g, "\n"));
    }

    return markdown.join("\n\n");
}

export function formatCalcParameter(param: SepticCalcParameterInfo) {
    let formattedParam = `@param[${param.direction}]: ${param.name} - ${param.description}`;
    if (param.type.length) {
        formattedParam += ` - ${param.type}`;
    }
    if (param.arity.length) {
        formattedParam += ` - ${param.arity}`;
    }
    return formattedParam;
}
