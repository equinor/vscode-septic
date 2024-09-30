import os
import re
from pathlib import Path
from typing import List

import yaml

meta_info_name = "meta.yaml"


def folder_name_to_option(name: str):
    return name.replace("_", ".")


def version_to_folder_name(version: tuple):
    major = get_major(version)
    return "v" + "_".join([str(x) for x in major])


def read_meta_file(path: Path):
    with open(path, "r") as file:
        meta = yaml.safe_load(file)
    return meta


def get_major(version: tuple):
    return (version[0], version[1])


def get_newest_version_for_major(versions: List[tuple]):
    majors = {}
    for ver in versions:
        major = get_major(ver)
        if not major in majors:
            majors[major] = ver
        if majors[major] < ver:
            majors[major] = ver
    return majors


def get_existing_versions(path: Path):
    dirs = [x[0] for x in os.walk(path.resolve())]
    versions = []
    for dir in dirs:
        dir_match = re.match(r"v(\d+)_(\d+)", dir.split("\\")[-1])
        if not dir_match:
            continue
        meta = read_meta_file(path / dir / meta_info_name)
        versions.append(tuple(int(x) for x in meta["version"].split(".")))
    return versions


def get_versions_from_tag(tag: str):
    ver_match = re.match(r"v(\d+)\.(\d+)(?:\.(\d+))?(?:\.(\d+))?", tag)
    if not ver_match:
        return None
    return (
        int(ver_match.group(1)),
        int(ver_match.group(2)),
        int(ver_match.group(3)) if ver_match.group(3) else 0,
    )


def get_versions(path: Path):
    return [
        x[0].split("\\")[-1]
        for x in os.walk(path.resolve())
        if re.match(r"(?:v(\d+)_(\d+))|latest", x[0].split("\\")[-1])
    ]
