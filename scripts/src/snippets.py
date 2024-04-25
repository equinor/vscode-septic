from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List

import yaml

public_path = Path("./public")

indents_attribute_value = 17
spaces_between_int_values = 6
spaces_first_int_value = 5
spaces_between_values = 2


@dataclass
class Snippet:
    prefix: str
    body: List[str]
    description: str


def create_snippet(obj: dict) -> Snippet:
    prefix = obj["name"].lower()
    body = []
    body.append(format_header(obj["name"]))
    for attr in obj["attributes"]:
        if attr["noCnfg"] == "true" or attr["nosnippet"] == "true":
            continue
        body.extend(format_attribute(attr))
    description = obj["description"]
    return Snippet(prefix, body, description)


def format_header(object_name: str):
    spaces_between_declaration_and_name = max(17 - len(object_name) - 3, 2)
    return (
        "  "
        + object_name
        + ":"
        + " " * spaces_between_declaration_and_name
        + "${1:"
        + object_name
        + "Name"
        + "}"
    )


def format_attribute(attribute: dict):
    if len(attribute["postfix"]) > 0:
        name = attribute["name"] + attribute["postfix"][0]
    else:
        name = attribute["name"]
    indents_attribute_delimiter = 14
    indents_line = max(indents_attribute_delimiter - len(name), 0)
    attribute_def = " " * indents_line + name + "=  "
    if attribute["snippet"]:
        attribute_values = [attribute["snippet"]]
    else:
        attribute_values = format_attribute_value(
            attribute["default"], attribute["list"], attribute["dataType"]
        )
    attribute_values[0] = attribute_def + str(attribute_values[0])
    return attribute_values


def format_attribute_value(values: List[str], is_list: str, datatype: str) -> List[str]:
    if not values:
        return [""]
    if is_list == "true" and datatype.lower() in ["string", "variable"]:
        return format_string_list(values)
    elif is_list == "true" and datatype.lower() == "int":
        return format_int_list(values)
    elif is_list == "true":
        sep = " " * spaces_between_values
        return [f"{len(values)}" + sep + sep.join(values)]
    return [values[0]]


def format_string_list(values: List[str]):
    lines = [len(values)]
    current_line = " " * indents_attribute_value
    for ind, val in enumerate(values):
        if ind % 5 == 0 and ind != 0:
            lines.append(current_line.rstrip())
            current_line = " " * indents_attribute_value
        current_line += val + " " * spaces_between_values
    lines.append(current_line.rstrip())
    return lines


def format_int_list(values: List[str]):
    line = f"{len(values)}"
    for ind, val in enumerate(values):
        if ind == 0:
            line += " " * max(1, spaces_first_int_value - len(val)) + val
        else:
            line += " " * max(1, spaces_between_int_values - len(val)) + val
    return [line]


def generate_snippets(version: str):
    version_path = Path("./public") / version
    with open(version_path / "objectsDoc.yaml") as file:
        objects = yaml.load(file, Loader=yaml.BaseLoader)
    snippets = []
    for obj in objects:
        snippets.append(create_snippet(obj))
    with open(version_path / "snippets.yaml", "w") as file:
        yaml.dump([asdict(snippet) for snippet in snippets], file)


if __name__ == "__main__":
    generate_snippets("latest")
