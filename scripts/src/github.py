from dotenv import load_dotenv
import requests as requests
import os as os
import base64

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


def getCalcFile(branch: str):
    owner = "equinor"
    repo = "SEPTIC"
    path = "src/Calc.cpp"
    endpoint = f"/repos/{owner}/{repo}/contents/{path}?ref={branch}"
    response = sendRequestGithub(endpoint)
    return decodeBas64(response["content"])


if __name__ == "__main__":
    calc_file = getCalcFile("calc_documentation")
    with open("calc.cpp", "w", encoding="utf-8", newline="") as file:
        file.write(calc_file)
