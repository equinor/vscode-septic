from typing import List
import yaml
from src.github import getCalcFile, getCommitId, getObjectFiles
from src.parse_doxygen import (
    parseCalcDocumentation,
    parseObjectDocumentation,
    SepticObject,
)
from dataclasses import asdict

TEST = True


def resolve_inheritance(septic_objects: List[SepticObject]):
    upper_dict: dict = {}
    for obj in septic_objects:
        upper_dict[obj.name] = {"resolved": False, "object": obj}
    for key in upper_dict.keys():
        upper_dict = resolve(key, upper_dict)
    return [val["object"] for val in upper_dict.values()]


def resolve(name: str, dict: dict):
    if dict[name]["resolved"]:
        return dict
    obj: SepticObject = dict[name]["object"]
    if not obj.extends:
        dict[name]["resolved"] = True
        return dict

    parent = dict[obj.extends]
    if not parent["resolved"]:
        dict = resolve(obj.extends, dict)

    obj.attributes.extend(parent["object"].attributes)
    dict[name]["resolved"] = True
    return dict


def updateObjects():
    output_path = "./public/objectsDoc.yaml"
    branch = "object_documentation"
    files = getObjectFiles(branch)
    objects: List[SepticObject] = []
    for f in files:
        objects.extend(parseObjectDocumentation(f))
    objects = resolve_inheritance(objects)
    objects = [obj for obj in objects if not obj.abstract]
    for obj in objects:
        obj.attributes.sort(key=lambda x: x.name)
    commit = getCommitId(branch)
    with open(output_path, "w") as file:
        file.write(f"# Commit: {commit}\n")
        yaml.dump(
            [asdict(obj, dict_factory=SepticObject.dict_factory) for obj in objects],
            file,
        )


def updateCalcs():
    output_path = "./public/calcs.yaml"
    branch = "calc_documentation"
    calc_file = getCalcFile(branch)
    calcs = parseCalcDocumentation(calc_file)
    calcs.sort(key=lambda x: x.name)
    commit = getCommitId(branch)
    with open(output_path, "w") as file:
        file.write(f"# Commit: {commit}\n")
        yaml.dump([asdict(calc) for calc in calcs], file)


def main():
    updateObjects()
    updateCalcs()


if __name__ == "__main__":
    main()
