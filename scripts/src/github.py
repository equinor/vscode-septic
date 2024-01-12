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
    return response["commit"]["sha"]


def getCalcFile(ref: str):
    path = "src/Calc.cpp"
    return getFile(ref, path)


def getDir(ref: str, dir: str):
    owner = "equinor"
    repo = "SEPTIC"
    endpoint = f"/repos/{owner}/{repo}/contents/{dir}?ref={ref}"
    return sendRequestGithub(endpoint)


def getObjectFiles(ref: str):
    paths_src = getDir(ref, "src")
    paths_fmu = getDir(ref, "FMUsrc")
    paths = paths_src + paths_fmu
    paths = [x["path"] for x in paths if x["path"].endswith(".cpp")]
    for path in paths:
        try:
            yield getFile(ref, path)
        except Exception as e:
            print(e, path)


def getFile(ref: str, path: str):
    owner = "equinor"
    repo = "SEPTIC"
    endpoint = f"/repos/{owner}/{repo}/contents/{path}?ref={ref}"
    response = sendRequestGithub(endpoint)
    return decodeBas64(response["content"])


def getTags():
    owner = "equinor"
    repo = "SEPTIC"
    endpoint = f"/repos/{owner}/{repo}/tags"
    return sendRequestGithub(endpoint)


if __name__ == "__main__":
    pass
