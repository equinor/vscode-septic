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
        return "`" + attrDoc.name + "`" + `: ${attrDoc.description}`;
    }
    let doc = h4(attrDoc.name);
    let newline = "\n\n";
    doc += newline + horizontalRule();
    doc += newline + attrDoc.description;
    doc += newline + code("DataType:") + " " + attrDoc.dataType;
    if (attrDoc.dataType === "Enum") {
        doc += newline + code("Enums:") + " " + `${attrDoc.enums.join("|")}`;
    }
    if (attrDoc.list) {
        doc += newline + code("List:") + " True";
    }
    if (attrDoc.default.length) {
        doc +=
            newline +
            code("Default:") +
            " " +
            formatDefaultValue(attrDoc.default);
    }
    if (attrDoc.tags.length) {
        doc += newline + code("Tags:");
        doc += attrDoc.tags
            .map((tag) => {
                return tag;
            })
            .join(",");
    }
    return doc;
}

export function formatCalcMarkdown(calc: SepticCalcInfo) {
    let markdown = [
        "```js\n" + `function ${calc.signature}` + "\n```",
        horizontalRule(),
        `${calc.detailedDescription.replace(/\r\n/g, "\n")}`,
    ];

    let formattedParameters = calc.parameters.map((param) => {
        return formatCalcParameter(param);
    });
    if (formattedParameters.length) {
        markdown.push(
            "```\n" + formattedParameters[0],
            ...formattedParameters.slice(1),
            "\n```"
        );
    }
    markdown.push(
        "```\n" + `@return - ${calc.retr}`,
        `@value - ${calc.value}`,
        `@quality - ${calc.quality}` + "\n```"
    );

    return markdown.join("\n\n");
}

export function formatCalcParameter(param: SepticCalcParameterInfo) {
    let formattedParam = `@param[${param.direction}]: ${param.name} - ${param.description}`;
    if (param.datatype.length) {
        formattedParam += ` - ${param.datatype}`;
    }
    if (param.arity.length) {
        formattedParam += ` - ${param.arity}`;
    }
    return formattedParam;
}

export function formatDefaultValue(attrDefault: string[]) {
    if (attrDefault.length === 1) {
        return attrDefault[0];
    }
    return `${attrDefault.length}  ${attrDefault.join("  ")}`;
}
