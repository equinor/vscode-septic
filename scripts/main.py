import yaml
from src.github import getCalcFile
from src.parse_doxygen import parseCalcDocumentation
from dataclasses import asdict


def main():
    output_path = "./public/calc.yaml"
    branch = "calc_documentation"
    calc_file = getCalcFile(branch)
    calcs = parseCalcDocumentation(calc_file)
    with open(output_path, "w") as file:
        yaml.dump([asdict(calc) for calc in calcs], file)


if __name__ == "__main__":
    main()
