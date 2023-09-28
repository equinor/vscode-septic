import { bold, code, h4, horizontalRule } from "../util/markdown";
import {
    ISepticObjectDocumentation,
    SepticAttributeDocumentation,
    SepticCalcInfo,
    SepticCalcParameterInfo,
} from "./septicMetaInfo";

export function formatObjectDocumentationMarkdown(
    objDoc: ISepticObjectDocumentation
) {
    let markdown: string[] = [];
    markdown.push(h4(objDoc.name));
    markdown.push(horizontalRule());
    markdown.push(`${bold("Description:")} ${objDoc.description}`);
    markdown.push(`${bold("Parent object(s):")} ${objDoc.parents.join(", ")}`);
    if (objDoc.publicAttributes.length) {
        markdown.push(
            `${bold("Public properties:")} ${objDoc.publicAttributes.join(
                ", "
            )}`
        );
    }
    markdown.push(bold("Attributes:"));
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
    doc += newline + code("DataType:") + " " + formatDataType(attrDoc);
    doc +=
        newline + code("PublicProperty") + " " + attrDoc.calc
            ? "True"
            : "False";
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

export function formatDataType(attrDoc: SepticAttributeDocumentation) {
    let output = capitalizeFirstLetter(attrDoc.dataType);
    if (attrDoc.dataType === "enum") {
        output += "[" + attrDoc.enums.join(", ") + "]";
    }
    if (attrDoc.list) {
        output += "[ ]";
    }
    return output;
}

function capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
