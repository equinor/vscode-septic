import re
from dataclasses import dataclass
from typing import List, Optional

doxygen_regex = r"\/\*![\s\S]*?\*\/"


@dataclass
class Attribute:
    name: str
    dataType: str
    list: bool
    enums: List[str]
    tags: List[str]
    postfix: List[str]
    calc: bool
    noCnfg: bool
    default: str
    description: str
    snippet: str
    nosnippet: bool


@dataclass
class SepticObject:
    name: str
    description: str
    attributes: List[Attribute]
    parents: List[str]


@dataclass
class Parameter:
    name: str
    description: str
    direction: str
    datatype: str
    arity: str


@dataclass
class Calc:
    name: str
    signature: str
    parameters: Parameter
    retr: str
    detailedDescription: str
    quality: str


def get_object_doxygen_from_file(file: str) -> List[str]:
    matches_doxygen = re.findall(doxygen_regex, file)
    return list(filter(validate_object_doxygen, matches_doxygen))


def validate_object_doxygen(doxygen: str) -> bool:
    vscode_regex = r"\\vscode\s+[\w]+"
    if re.search(vscode_regex, doxygen):
        return True
    return False


def parse_object_documentation(file: str) -> List[SepticObject]:
    doxygen_objects = get_object_doxygen_from_file(file)
    septic_objects: List[SepticObject] = []
    for obj_dox in doxygen_objects:
        obj = parse_object_doxygen_doc(obj_dox)
        if obj:
            septic_objects.append(obj)
        else:
            print(f"Unable to parse the following doxygen:\n {obj_dox}")
    return septic_objects


def parse_object_doxygen_doc(doxygen: str) -> Optional[SepticObject]:
    name_regex = r"\\vscode\s+([\w]+)"
    name_match = re.search(name_regex, doxygen)
    if not name_match:
        return None
    name = name_match.group(1)

    description_regex = r"\\brief\s([\s\S]*?)(?:(?=(?:\r?\n){2})|(?=\\|\*\/))"
    description_match = re.search(description_regex, doxygen)
    description = description_match.group(1).strip() if description_match else ""

    parents_regex = r"\\containers\s+\[([\S\s]*)\]"
    parents_match = re.search(parents_regex, doxygen)
    parents = (
        [parent.strip() for parent in parents_match.group(1).split(",")]
        if parents_match
        else []
    )

    attr_regex = r"\\param\s*[\S\s]*?(?:(?=(?:\r?\n){2})|(?=\\[^n]|\*\/))"
    attr_matches = re.findall(attr_regex, doxygen)
    attributes: List[Attribute] = []
    for attr_dox in attr_matches:
        attr = parse_attribute(attr_dox)
        if attr:
            attributes.append(attr)
    return SepticObject(name, description, attributes, parents)


def parse_attribute(attribute: str) -> Optional[Attribute]:
    attr_regex = (
        r"\\param\s+([\w]+)\s+([\S\s]*?)\s+(?:\{([\S\s]+)\})(?:\s*\[([\w\s,]+)\])?"
    )
    attr_match = re.search(attr_regex, attribute)
    if not attr_match:
        return None
    name = attr_match.group(1)
    description = attr_match.group(2).strip()
    details = attr_match.group(3)
    attr_info = parse_attribute_details(details)
    tags = (
        [e.strip() for e in attr_match.group(4).split(",")]
        if attr_match.group(4)
        else []
    )
    return Attribute(
        name=name,
        dataType=attr_info["datatype"],
        list=attr_info["list"],
        enums=attr_info["enums"],
        postfix=attr_info["postfix"],
        calc=attr_info["calc"],
        noCnfg=attr_info["nocnfg"],
        default=attr_info["default"],
        tags=tags,
        description=description,
        snippet=attr_info["snippet"],
        nosnippet=attr_info["nosnippet"],
    )


def parse_attribute_details(input: str):
    information = {
        "datatype": "",
        "list": False,
        "enums": [],
        "postfix": [],
        "calc": False,
        "nocnfg": False,
        "default": [],
        "nosnippet": False,
        "snippet": "",
    }

    def datatype(inp: str):
        datatype_match = re.search(r"([\w]+)(\[([\S\s]*)\])?", inp)
        if not datatype_match:
            return
        information["datatype"] = datatype_match.group(1).lower()
        information["list"] = (
            True
            if datatype_match.group(2) and datatype_match.group(1).lower() != "enum"
            else False
        )
        information["enums"] = (
            [elem.strip() for elem in datatype_match.group(3).split(",")]
            if datatype_match.group(2) and datatype_match.group(1).lower() == "enum"
            else []
        )

    def postfix(inp: str):
        list_match = re.search(r"\[([\S\s]+)\]", inp)
        information["postfix"] = (
            [e.strip() for e in list_match.group(1).split(",")]
            if list_match
            else inp.strip()
        )

    def nosnippet(inp: str):
        information["nosnippet"] = True

    def snippet(inp: str):
        information["snippet"] = inp.strip().strip("'")

    def nocnfg(inp: str):
        information["nocnfg"] = True

    def calc(inp: str):
        information["calc"] = True

    def default(inp: str):
        list_match = re.search(r"\[([\S\s]+)\]", inp)
        information["default"] = (
            [e.strip() for e in list_match.group(1).split(",")]
            if list_match
            else [inp.strip()]
        )

    callbacks = {
        "datatype": datatype,
        "postfix": postfix,
        "nocnfg": nocnfg,
        "calc": calc,
        "nosnippet": nosnippet,
        "snippet": snippet,
        "default": default,
    }
    name_regex = r"^\s*([\w]+)(?::([\S\s]+))?"
    for elem in input.split(";"):
        name_match = re.search(name_regex, elem)
        if not name_match:
            continue
        name = name_match.group(1)
        callback = callbacks.get(name.lower())
        if not callback:
            continue
        callback(name_match.group(2))
    return information


def get_calc_doxygen_from_file(file: str) -> List[str]:
    matches_doxygen = re.findall(doxygen_regex, file)
    return list(filter(validate_calc_doxygen, matches_doxygen))


def validate_calc_doxygen(doxygen: str) -> bool:
    class_regex = r"\\class\s+(Calc[\w]+)\b"
    function_regex = r"\\calc\{[\S ]+\}"
    if re.search(class_regex, doxygen) and re.search(function_regex, doxygen):
        return True
    return False


def parse_calc_doxygen_doc(calc: str) -> Optional[Calc]:
    parameters: List[dict] = []
    func = re.search(r"\\calc\{\s*(([\w]+)\([\S ]*\))\}", calc)
    name = func.group(2) if func else None
    if not name:
        return None
    signature = func.group(1) if func else None
    if not signature:
        return None
    param_matches = re.findall(
        r"\\param\s*[\S\s]*?(?:(?=(?:\r?\n){2})|(?=\\|\*\/))", calc
    )
    for param in param_matches:
        parsedParam = parse_parameter(param)
        if parsedParam:
            parameters.append(parsedParam)
    return_match = re.search(
        r"\\return([\s\S]*?)(?:(?=(?:\r?\n){3})|(?=\\|\*\/))", calc
    )
    retr = return_match.group(1).strip() if return_match else ""
    detailed_description_match = re.search(
        r"\\details([\s\S]*?)(?:(?=(?:\r?\n){3})|(?=\\|\*\/))", calc
    )
    detailed_description = (
        detailed_description_match.group(1).strip()
        if detailed_description_match
        else ""
    )
    quality_match = re.search(
        r"\\quality([\s\S]*?)(?:(?=(?:\r?\n){2})|(?=\\|\*\/))", calc
    )
    quality = quality_match.group(1).strip() if quality_match else ""
    return Calc(
        name=name,
        signature=signature,
        parameters=parameters,
        retr=retr,
        detailedDescription=detailed_description,
        quality=quality,
    )


def parse_parameter(param: str) -> Optional[Parameter]:
    param_match = re.search(
        r"\\param\[([\w,]+)\]\s+([\w]+)\s+([^\{]+)(?:\{([\S\s]+)\})?",
        param,
    )
    direction = param_match.group(1) if param_match else None
    name = param_match.group(2) if param_match else None
    if not direction or not name:
        return None
    description = param_match.group(3).strip() if param_match.group(3) else ""
    param_details = parse_parameter_details(param_match.group(4))
    return Parameter(
        name=name,
        description=description,
        direction=direction,
        datatype=param_details["datatype"],
        arity=param_details["arity"],
    )


def parse_parameter_details(inp: Optional[str]):
    information = {"datatype": ["value"], "arity": "1"}
    if not inp:
        return information

    def datatype(inp: str):
        list_match = re.search(r"\[([\S\s]+)\]", inp)
        information["datatype"] = (
            [e.strip().lower() for e in list_match.group(1).split(",")]
            if list_match
            else [inp.strip().lower()]
        )

    def arity(inp: str):
        information["arity"] = inp.strip()

    callbacks = {"datatype": datatype, "arity": arity}

    name_regex = r"^\s*([\w]+)(?::([\S ]+))?"
    for elem in inp.split(";"):
        name_match = re.search(name_regex, elem)
        if not name_match:
            continue
        name = name_match.group(1)
        callback = callbacks.get(name.lower())
        if not callback:
            continue
        callback(name_match.group(2))
    return information


def parse_calc_documentation(file: str) -> List[Calc]:
    calcs_doxygen = get_calc_doxygen_from_file(file)
    parsedCalcs: List[Calc] = []
    for calc_dox in calcs_doxygen:
        parsed_calc = parse_calc_doxygen_doc(calc_dox)
        if parsed_calc:
            parsedCalcs.append(parsed_calc)
        else:
            print(f"Unable to parse the following doxygen:\n {calc_dox}")
    return parsedCalcs


def test_calc(calc: Calc) -> bool:
    params_sign_match = re.search(r"\(([\)^])\)", calc.signature)
    if not params_sign_match:
        return True
    param_sign = [param.strip() for param in params_sign_match.group(1).split(",")]
    valid = True
    for param in calc.parameters:
        if param.name in param_sign:
            print(f"{param.name} not in calc signature {calc.signature}")
            valid = False
    return valid


if __name__ == "__main__":
    doxygen = r"""
  \vscode MvrList

  \brief List of manipulated variables with associated values

  \param Text Free text description {datatype: String; default: ""; snippet: "${2}"}
  \param Mvrs List of references to Mvrs to be included in list {datatype: Variable[]; default: [""];
  snippet: '1\n                 "${3}"'}

  \containers [Table]
    """
    obj = parse_object_doxygen_doc(doxygen)
    print(obj)
