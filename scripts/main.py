from typing import List
import yaml
from src.github import getCalcFile, getCommitId, getObjectFiles
from src.parse_doxygen import (
    parseCalcDocumentation,
    parseObjectDocumentation,
    SepticObject,
)
from dataclasses import asdict

BRANCH = "main"
OBJECT_OUTPUT_PATH = "./public/objectsDoc.yaml"
CALCS_OUTPUT_PATH = "./public/calcs.yaml"


def updateObjects():
    files = getObjectFiles(BRANCH)
    objects: List[SepticObject] = []
    for f in files:
        objects.extend(parseObjectDocumentation(f))
    for obj in objects:
        obj.attributes.sort(key=lambda x: x.name)
    commit = getCommitId(BRANCH)
    with open(OBJECT_OUTPUT_PATH, "w") as file:
        file.write(f"# Commit: {commit}\n")
        yaml.dump(
            [asdict(obj) for obj in objects],
            file,
        )


def updateCalcs():
    calc_file = getCalcFile(BRANCH)
    calcs = parseCalcDocumentation(calc_file)
    calcs.sort(key=lambda x: x.name)
    commit = getCommitId(BRANCH)
    with open(CALCS_OUTPUT_PATH, "w") as file:
        file.write(f"# Commit: {commit}\n")
        yaml.dump([asdict(calc) for calc in calcs], file)


def main():
    updateObjects()
    updateCalcs()


if __name__ == "__main__":
    main()
