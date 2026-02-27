"""
Generate example .cnfg files from snippets.yaml

This script reads the snippets.yaml file from a specified Septic version
and creates individual .cnfg example files for each object type in the
examples folder.

Usage:
    python generate_examples.py [version]

Arguments:
    version: Septic version folder to use (default: 'latest')
             Examples: 'latest', 'v2_88', 'v2_89', 'v3_0', etc.
"""

import argparse
import re
import sys
from pathlib import Path
from typing import List, Dict, Any

import yaml


def remove_snippet_placeholders(text: str) -> str:
    """
    Remove VSCode snippet placeholders like ${1:Name}, ${2}, etc.
    and replace them with the default values or generic placeholders.
    """
    # Replace ${n:text} with text
    text = re.sub(r"\$\{(\d+):([^}]+)\}", r"\2", text)
    # Replace ${n} with empty string
    text = re.sub(r"\$\{\d+\}", "", text)
    # Replace ${n|option1,option2|} with option1
    text = re.sub(r"\$\{\d+\|([^,|]+)[^}]*\}", r"\1", text)
    return text


def clean_snippet_body(body: List[str]) -> str:
    """
    Clean the snippet body by removing placeholders and joining lines.
    """
    cleaned_lines = []
    for line in body:
        cleaned_line = remove_snippet_placeholders(line)
        # Replace literal \n with actual newlines
        cleaned_line = cleaned_line.replace("\\n", "\n")
        cleaned_lines.append(cleaned_line)
    return "\n".join(cleaned_lines)


def generate_example_file(snippet: Dict[str, Any], output_dir: Path) -> None:
    """
    Generate a single example .cnfg file from a snippet definition.
    """
    prefix = snippet.get("prefix", "")
    description = snippet.get("description", "")
    body = snippet.get("body", [])

    if not prefix or not body:
        print(f"Skipping snippet without prefix or body: {snippet}")
        return

    # Create file name from prefix
    file_name = f"{prefix}.cnfg"
    file_path = output_dir / file_name

    # Clean the snippet body
    content = clean_snippet_body(body)

    # Add header comment with description
    header = f"// {description}\n" if description else ""
    full_content = header + content + "\n"

    # Write to file
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(full_content)

    print(f"Generated: {file_name}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate example .cnfg files from snippets.yaml"
    )
    parser.add_argument(
        "version",
        nargs="?",
        default="latest",
        help="Septic version folder to use (default: latest)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="packages/extension/skills/writing-septic-config/objects",
        help="Output directory for example files (default: packages/extension/skills/writing-septic-config/objects)",
    )

    args = parser.parse_args()

    # Construct paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    snippets_path = (
        project_root / "packages" / "septic" / "public" / args.version / "snippets.yaml"
    )
    output_dir = project_root / args.output

    # Validate snippets file exists
    if not snippets_path.exists():
        print(f"Error: snippets.yaml not found at {snippets_path}")
        print(f"Available versions:")
        public_dir = project_root / "packages" / "septic" / "public"
        for version_dir in sorted(public_dir.iterdir()):
            if version_dir.is_dir():
                print(f"  - {version_dir.name}")
        sys.exit(1)

    # Create output directory if it doesn't exist
    output_dir.mkdir(parents=True, exist_ok=True)

    # Read snippets.yaml
    print(f"Reading snippets from: {snippets_path}")
    with open(snippets_path, "r", encoding="utf-8") as f:
        snippets = yaml.safe_load(f)

    if not isinstance(snippets, list):
        print("Error: snippets.yaml should contain a list of snippets")
        sys.exit(1)

    # Get list of expected file names from snippets
    expected_files = set()
    for snippet in snippets:
        prefix = snippet.get("prefix", "")
        if prefix:
            expected_files.add(f"{prefix}.cnfg")

    # Remove files that are not in the snippets list
    existing_files = list(output_dir.glob("*.cnfg"))
    removed_count = 0
    for file_path in existing_files:
        if file_path.name not in expected_files:
            print(f"Removing: {file_path.name}")
            file_path.unlink()
            removed_count += 1

    if removed_count > 0:
        print(f"Removed {removed_count} file(s) not in snippets list")
        print()

    # Generate example files
    print(f"Generating example files in: {output_dir}")
    print(f"Total snippets: {len(snippets)}")
    print()

    for snippet in snippets:
        generate_example_file(snippet, output_dir)

    print()
    print(f"Done! Generated {len(snippets)} example files.")


if __name__ == "__main__":
    main()
