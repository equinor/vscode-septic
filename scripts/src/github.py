import base64
import os as os

import requests as requests
from dotenv import load_dotenv

load_dotenv()


def sendRequestGithub(endpoint: str):
    base_url = "https://api.github.com"
    url = base_url + endpoint
    token = os.getenv("API_TOKEN")
    header = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    response = requests.get(url=url, headers=header)
    if response.status_code != 200:
        raise Exception(response.status_code)
    return response.json()


def decodeBas64(base64_str: str):
    decoded_bytes = base64.b64decode(base64_str)
    return decoded_bytes.decode("utf-8")


def getCommitId(branch: str):
    owner = "equinor"
    repo = "SEPTIC"
    endpoint = f"/repos/{owner}/{repo}/branches/{branch}"
    response = sendRequestGithub(endpoint)
    return response["commit"]["sha"][0:7]


def getCalcFile(branch: str):
    path = "src/Calc.cpp"
    return getFile(branch, path)


def getObjectFiles(branch: str):
    paths = [
        "src/Xvrs.cpp",
        "src/Smpc.cpp",
        "src/Appl.cpp",
        "src/Tcip.cpp",
        "src/Sopc.cpp",
        "src/guielements.cpp",
        "src/Nois.cpp",
        "FMUsrc/MdlFMU.cpp",
        "src/Subr.cpp",
        "src/Calc.cpp",
        "src/Expr.cpp",
        "src/Evnt.cpp"
        "src/Fdta.cpp"
    ]
    files = []
    for path in paths:
        try:
            files.append(getFile(branch, path))
        except:
            continue
    return files


def getFile(branch: str, path: str):
    owner = "equinor"
    repo = "SEPTIC"
    endpoint = f"/repos/{owner}/{repo}/contents/{path}?ref={branch}"
    response = sendRequestGithub(endpoint)
    return decodeBas64(response["content"])


if __name__ == "__main__":
    calc_file = getCalcFile("calc_documentation")
    commit_hash = getCommitId("calc_documentation")
    with open("calc.cpp", "w", encoding="utf-8", newline="") as file:
        file.write(calc_file)
