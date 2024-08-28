import base64
import os as os

import requests as requests
from dotenv import load_dotenv

load_dotenv()


def send_request_github(endpoint: str):
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


def decode_base64(base64_str: str):
    decoded_bytes = base64.b64decode(base64_str)
    return decoded_bytes.decode("utf-8")


def get_commit_id(branch: str):
    owner = "equinor"
    repo = "SEPTIC"
    endpoint = f"/repos/{owner}/{repo}/branches/{branch}"
    response = send_request_github(endpoint)
    return response["commit"]["sha"]


def get_calc_file(ref: str):
    path = "src/calc.cpp"
    return get_file(ref, path)


def get_dir(ref: str, dir: str):
    owner = "equinor"
    repo = "SEPTIC"
    endpoint = f"/repos/{owner}/{repo}/contents/{dir}?ref={ref}"
    return send_request_github(endpoint)


def get_object_files(ref: str):
    paths_src = get_dir(ref, "src")
    paths_fmu = get_dir(ref, "src/fmusrc")
    paths = paths_src + paths_fmu
    paths = [x["path"] for x in paths if x["path"].endswith(".cpp")]
    for path in paths:
        try:
            yield get_file(ref, path)
        except Exception as e:
            print(e, path)


def get_file(ref: str, path: str):
    owner = "equinor"
    repo = "SEPTIC"
    endpoint = f"/repos/{owner}/{repo}/contents/{path}?ref={ref}"
    response = send_request_github(endpoint)
    return decode_base64(response["content"])


def get_tags():
    owner = "equinor"
    repo = "SEPTIC"
    endpoint = f"/repos/{owner}/{repo}/tags"
    return send_request_github(endpoint)


if __name__ == "__main__":
    pass
