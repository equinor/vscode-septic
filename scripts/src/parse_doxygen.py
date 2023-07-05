import re
from typing import List, Optional
from dataclasses import dataclass

doxygen_regex = r"\/\*![\s\S]*?\*\/"


@dataclass
class Attribute:
    name: str
    dataType: str
    list: bool
    default: str
    enums: str
    tags: List[str]
    briefDescription: str
    detailedDescription: str


@dataclass
class SepticObject:
    name: str
    description: str
    attributes: List[Attribute]
    extends: str
    abstract: bool

    @staticmethod
    def dict_factory(x):
        exclude_fields = ["extends", "abstract"]
        return {k: v for (k, v) in x if k not in exclude_fields}


@dataclass
class Parameter:
    name: str
    description: str
    direction: str
    type: str
    arity: str


@dataclass
class Calc:
    name: str
    signature: str
    parameters: Parameter
    retr: str
    briefDescription: str
    detailedDescription: str


def getObjectDoxygenFromFile(file: str) -> List[str]:
    matches_doxygen = re.findall(doxygen_regex, file)
    return list(filter(validateObjectDoxygen, matches_doxygen))


def validateObjectDoxygen(doxygen: str) -> bool:
    class_regex = r"\\class\s+([\w]+Cnfg)\b"
    if re.search(class_regex, doxygen):
        return True
    return False


def parseObjectDocumentation(file: str) -> List[SepticObject]:
    doxygen_objects = getObjectDoxygenFromFile(file)
    septic_objects: List[SepticObject] = []
    for obj_dox in doxygen_objects:
        obj = parseObjectDoxygenDoc(obj_dox)
        if obj:
            septic_objects.append(obj)
    return septic_objects


def parseObjectDoxygenDoc(doxygen: str) -> Optional[SepticObject]:
    name_regex = r"\\class\s+([\w]+)Cnfg"
    name_match = re.search(name_regex, doxygen)
    if not name_match:
        return None
    name = name_match.group(1)
    description_regex = r"\\brief\s([\s\S]*?)(?=\\property|\*\/)"
    description_match = re.search(description_regex, doxygen)
    description = description_match.group(1).strip() if description_match else ""
    extends_regex = r"\\extends\s+([\w]+)Cnfg"
    extends_match = re.search(extends_regex, doxygen)
    extends = extends_match.group(1) if extends_match else ""
    abstract_regex = r"\\abstract"
    abstract = True if re.search(abstract_regex, doxygen) else False
    attr_regex = r"\\property\s[\s\S]*?(?=\\property|\*\/)"
    attr_matches = re.findall(attr_regex, doxygen)
    attributes: List[Attribute] = []
    for attr_dox in attr_matches:
        attr = parseAttribute(attr_dox)
        if attr:
            attributes.append(attr)
    return SepticObject(name, description, attributes, extends, abstract)


def parseAttribute(attribute: str) -> Optional[Attribute]:
    attr_regex = r"\\property\s+([\w]+)\s([\S\s]*?)\s+(?:\(([\s\S]*?)\))\s+(?:\[([\w\s,]+)\])*\s*(?:\\brief\s+([\S\s]*?))?"
    attr_match = re.search(attr_regex, attribute)
    if not attr_match:
        return None
    name = attr_match.group(1)
    brief_description = attr_match.group(2).strip()
    details = attr_match.group(3)
    data_type_regex = r"DataType:\s+([\w]+)"
    enums_regex = r"Enums:\s+([\w|]+)"
    default_regex = r"Default:\s+([\w]+)"
    list_regex = r"List:\s+(True|False)"
    data_type_match = re.search(data_type_regex, details)
    enums_match = re.search(enums_regex, details)
    default_match = re.search(default_regex, details)
    list_match = re.search(list_regex, details)
    data_type = data_type_match.group(1) if data_type_match else ""
    enums = [e.strip() for e in enums_match.group(1).split("|")] if enums_match else []
    default = default_match.group(1) if default_match else ""
    list_ = list_match.group(1).lower() == "true" if list_match else False
    tags = (
        [e.strip() for e in attr_match.group(4).split(",")]
        if attr_match.group(4)
        else []
    )
    detailed_description = attr_match.group(5).strip() if attr_match.group(5) else ""
    return Attribute(
        name=name,
        dataType=data_type,
        default=default,
        enums=enums,
        list=list_,
        tags=tags,
        briefDescription=brief_description,
        detailedDescription=detailed_description,
    )


def getCalcDoxygenFromFile(file: str) -> List[str]:
    matches_doxygen = re.findall(doxygen_regex, file)
    return list(filter(validateCalcDoxygen, matches_doxygen))


def validateCalcDoxygen(doxygen: str) -> bool:
    class_regex = r"\\class\s+(Calc[\w]+)\b"
    function_regex = r"\\fn\s*([\w]+)\([\S ]+\)"
    if re.search(class_regex, doxygen) and re.search(function_regex, doxygen):
        return True
    return False


def parseCalcDoxygenDoc(calc: str) -> Optional[Calc]:
    parameters: List[dict] = []
    func = re.search(r"\\fn\s*(([\w]+)\([\S ]+\))", calc)
    name = func.group(2) if func else None
    if not name:
        return None
    signature = func.group(1) if func else None
    if not signature:
        return None
    paramMatches = re.findall(r"\\param[\S ]+", calc)
    for param in paramMatches:
        parsedParam = parseParameter(param)
        if parsedParam:
            parameters.append(parsedParam)
    returnMatch = re.search(r"\\return([\S ]+)", calc)
    retr = returnMatch.group(1).strip() if returnMatch else ""
    brief_description_match = re.search(
        r"\\brief([\s\S]*?)(?:(?=(?:\r?\n){3})|(?=\\par|\*\/))", calc
    )
    brief_description = (
        brief_description_match.group(1).strip() if brief_description_match else ""
    )
    detailed_description_match = re.search(r"\\par\b([\s\S]*?)(?:\*\/)", calc)
    detailed_description = (
        detailed_description_match.group(1).strip()
        if detailed_description_match
        else ""
    )
    return Calc(
        name=name,
        signature=signature,
        parameters=parameters,
        retr=retr,
        briefDescription=brief_description,
        detailedDescription=detailed_description,
    )


def parseParameter(param: str) -> Optional[Parameter]:
    paramMatch = re.search(
        r"\\param\[([\w]+)\]\s+([\w]+)\s+([\w\s.,-\/]+)(?:\(([\w]+)\))?(?:\s*\[([\w\+]+)\])?",
        param,
    )
    direction = paramMatch.group(1) if paramMatch else None
    name = paramMatch.group(2) if paramMatch else None
    if not direction or not name:
        return None
    description = paramMatch.group(3).strip() if paramMatch.group(3) else ""
    type = paramMatch.group(4) if paramMatch.group(4) else "Value"
    arity = paramMatch.group(5) if paramMatch.group(5) else "1"
    return Parameter(
        name=name, description=description, direction=direction, type=type, arity=arity
    )


def parseCalcDocumentation(file: str) -> List[Calc]:
    calcDoxygen = getCalcDoxygenFromFile(file)
    parsedCalcs: List[Calc] = []
    for calc in calcDoxygen:
        parsedCalc = parseCalcDoxygenDoc(calc)
        if parsedCalc:
            parsedCalcs.append(parsedCalc)
    return parsedCalcs
