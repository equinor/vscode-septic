import re
from typing import List, Optional
from dataclasses import dataclass


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


def getCalcDoxygenFromFile(file: str) -> List[str]:
    doxygen_regex = r"\/\*![\s\S]*?\*\/"
    matches_doxygen = re.findall(doxygen_regex, file)
    return list(filter(validateCalcDoxygen, matches_doxygen))


def validateCalcDoxygen(doxygen: str) -> bool:
    class_regex = r"\\class\s+(Calc[\w]+)\b"
    function_regex = r"\\fn\s*([\w]+)\([\S ]+\)"
    if re.search(class_regex, doxygen) and re.search(function_regex, doxygen):
        return True
    return False


def parseCalcDoxygenDoc(calc: str) -> Optional[dict]:
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


def parseParameter(param: str) -> Optional[dict]:
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


def parseCalcDocumentation(file: str) -> List[dict]:
    calcDoxygen = getCalcDoxygenFromFile(file)
    parsedCalcs: List[dict] = []
    for calc in calcDoxygen:
        parsedCalc = parseCalcDoxygenDoc(calc)
        if parsedCalc:
            parsedCalcs.append(parsedCalc)
    return parsedCalcs
