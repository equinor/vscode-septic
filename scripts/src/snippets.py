from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List

import yaml

public_path = Path("./public")


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
        if attr["noCnfg"] == "true":
            continue
        body.append(format_attribute(attr))
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
    return (
        " " * indents_line
        + name
        + "=  "
        + format_attribute_value(attribute["default"], attribute["list"])
    )


def format_attribute_value(values: List[str], is_list: str):
    if not values:
        return ""
    if is_list == "true":
        return f"{len(values)}" + "  " + "  ".join(values)
    return values[0]


def is_int(s):
    try:
        int(s)
        return True
    except ValueError:
        return False


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
