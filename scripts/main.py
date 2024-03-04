import json
import os
import sys
from dataclasses import asdict
from pathlib import Path
from typing import List, Union

import yaml
from src.github import get_calc_file, get_commit_id, get_object_files, get_tags
from src.parse_doxygen import (
    SepticObject,
    parse_calc_documentation,
    parse_object_documentation,
    test_calc,
)
from src.snippets import generate_snippets
from src.versioning import (
    folder_name_to_option,
    get_existing_versions,
    get_major,
    get_newest_version_for_major,
    get_versions,
    get_versions_from_tag,
    meta_info_name,
    version_to_folder_name,
)

output_path = Path("./public")
object_file_name = "objectsDoc.yaml"
calc_file_name = "calcs.yaml"
first_valid_version = (2, 88)


def update_versioned_documentation_tag(tag: str):
    tags = list(
        map(
            lambda x: x["commit"]["sha"], filter(lambda x: x["name"] == tag, get_tags())
        )
    )
    if len(tags) == 0:
        raise Exception("Tag not found in repostitory")
    commit = tags[0]
    version = get_versions_from_tag(tag)
    if not version:
        raise Exception("Unable to get version from tag")
    major = get_major(version)
    majors_existing = get_newest_version_for_major(get_existing_versions(output_path))
    if major in majors_existing and version <= majors_existing[major]:
        return
    folder_path = output_path / version_to_folder_name(version)
    if not folder_path.exists():
        os.makedirs(folder_path.resolve())
    object_path = folder_path / object_file_name
    calc_path = folder_path / calc_file_name
    meta_path = folder_path / meta_info_name
    updateObjects(commit, object_path)
    updateCalcs(commit, calc_path)
    update_meta_info(commit, version, meta_path)


def update_versioned_documentation():
    tags = get_tags()
    tag_versions = {}
    for tag in tags:
        version = get_versions_from_tag(tag["name"])
        if version and version >= first_valid_version:
            tag_versions[version] = tag["commit"]["sha"]
    majors_tags = get_newest_version_for_major(list(tag_versions.keys()))
    majors_existing = get_newest_version_for_major(get_existing_versions(output_path))
    for major, ver in majors_tags.items():
        if major in majors_existing and ver <= majors_existing[major]:
            continue
        commit = tag_versions[ver]
        folder_path = output_path / version_to_folder_name(ver)
        if not folder_path.exists():
            os.makedirs(folder_path.resolve())
        object_path = folder_path / object_file_name
        calc_path = folder_path / calc_file_name
        meta_path = folder_path / meta_info_name
        updateObjects(commit, object_path)
        updateCalcs(commit, calc_path)
        update_meta_info(commit, ver, meta_path)


def update_latest_documentation():
    folder_path = output_path / "latest"
    if not folder_path.exists():
        os.makedirs(folder_path.resolve())
    object_path = folder_path / object_file_name
    calc_path = folder_path / calc_file_name
    meta_path = folder_path / meta_info_name
    commit = get_commit_id("main")
    updateObjects(commit, object_path)
    updateCalcs(commit, calc_path)
    update_meta_info(commit, "latest", meta_path)


def update_version_options():
    package_path = Path("package.json")
    with open(package_path.resolve(), "r") as f:
        package = json.load(f)
    package["contributes"]["configuration"]["properties"][
        "septic.documentation.version"
    ]["enum"] = list(map(folder_name_to_option, get_versions(output_path)))
    package_path = Path("package.json")
    with open(package_path.resolve(), "w") as f:
        json.dump(package, f, indent=2)


def updateObjects(ref: str, output_path: Path):
    objects: List[SepticObject] = []
    file_generator = get_object_files(ref)
    for f in file_generator:
        objects.extend(parse_object_documentation(f))
    objects.sort(key=lambda x: x.name)
    with open(output_path.resolve(), "w") as file:
        yaml.dump(
            [asdict(obj) for obj in objects],
            file,
        )


def updateCalcs(ref: str, output_path: Path):
    calc_file = get_calc_file(ref)
    calcs = parse_calc_documentation(calc_file)
    calcs.sort(key=lambda x: x.name)
    calcs = filter(test_calc, calcs)
    with open(output_path, "w") as file:
        yaml.dump([asdict(calc) for calc in calcs], file)


def update_meta_info(commit: str, version: Union[tuple, str], output_path: Path):
    if isinstance(version, tuple):
        version = ".".join([str(x) for x in version])
    meta = {"commit": commit[0:7], "version": version}
    with open(output_path, "w") as file:
        yaml.dump(meta, file)


if __name__ == "__main__":
    if len(sys.argv) == 1:
        update_versioned_documentation()
        update_latest_documentation()
        update_version_options()
    elif len(sys.argv) == 2:
        ref = sys.argv[1].split("/")[-1]
        if ref == "main":
            update_latest_documentation()
            generate_snippets("latest")
        else:
            update_versioned_documentation_tag(ref)
            update_version_options()
            generate_snippets(version_to_folder_name(get_versions_from_tag(ref)))
