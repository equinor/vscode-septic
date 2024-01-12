import json
import os
import re
from dataclasses import asdict
from pathlib import Path
from typing import List

import yaml
from src.github import getCalcFile, getCommitId, getObjectFiles, getTags
from src.parse_doxygen import (
    SepticObject,
    parseCalcDocumentation,
    parseObjectDocumentation,
    testCalc,
)

output_path = Path("./public")
object_file_name = "objectsDoc.yaml"
calc_file_name = "calcs.yaml"
first_valid_version = (2, 87)


def get_versions():
    return [
        x[0].split("\\")[-1]
        for x in os.walk(output_path.resolve())
        if re.match(r"(?:v(\d+)_(\d+))|latest", x[0].split("\\")[-1])
    ]


def get_newest_existing_version():
    dirs = [x[0] for x in os.walk(output_path.resolve())]
    versions = []
    for dir in dirs:
        dir_match = re.match(r"v(\d+)_(\d+)", dir.split("\\")[-1])
        if not dir_match:
            continue
        versions.append((int(dir_match.group(1)), int(dir_match.group(2))))
    return max(versions) if versions else (0, 0)


def update_versioned_documentation():
    tags = getTags()
    new_versions = []
    min_version = max([get_newest_existing_version(), first_valid_version])
    for tag in tags:
        ver_match = re.match(r"^v(\d+)\.(\d+)\.0(?:\.0)?$", tag["name"])
        if not ver_match:
            continue
        version = (
            int(ver_match.group(1)),
            int(ver_match.group(2)),
        )
        if version > min_version:
            new_versions.append((f"v{version[0]}_{version[1]}", tag["commit"]["sha"]))
    new_versions.append(("latest", getCommitId("main")))
    for nv in new_versions:
        folder_path = output_path / nv[0]
        if not folder_path.exists():
            os.makedirs(folder_path.resolve())
        object_path = folder_path / object_file_name
        calc_path = folder_path / calc_file_name
        updateObjects(nv[1], object_path)
        updateCalcs(nv[1], calc_path)
    update_version_options()


def update_version_options():
    package_path = Path("package.json")
    with open(package_path.resolve(), "r") as f:
        package = json.load(f)
    available_versions = get_versions()
    package["contributes"]["configuration"]["properties"][
        "septic.documentation.version"
    ]["enum"] = available_versions
    package_path = Path("package.json")
    with open(package_path.resolve(), "w") as f:
        json.dump(package, f, indent=2)


def updateObjects(ref: str, output_path: Path):
    objects: List[SepticObject] = []
    file_generator = getObjectFiles(ref)
    for f in file_generator:
        objects.extend(parseObjectDocumentation(f))
    objects.sort(key=lambda x: x.name)
    for obj in objects:
        obj.attributes.sort(key=lambda x: x.name)
    with open(output_path.resolve(), "w") as file:
        file.write(f"# Commit: {ref[:7]}\n")
        yaml.dump(
            [asdict(obj) for obj in objects],
            file,
        )


def updateCalcs(ref: str, output_path: Path):
    calc_file = getCalcFile(ref)
    calcs = parseCalcDocumentation(calc_file)
    calcs.sort(key=lambda x: x.name)
    calcs = filter(testCalc, calcs)
    with open(output_path, "w") as file:
        file.write(f"# Commit: {ref[:7]}\n")
        yaml.dump([asdict(calc) for calc in calcs], file)


if __name__ == "__main__":
    update_versioned_documentation()
