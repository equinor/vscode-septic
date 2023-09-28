## Setup

1. Install python (dependent of plattform)
2. Create virtual environment in `/script` (dependent of plattform)
3. Activate virtual environment (dependent of plattform)
4. Install requirments `pip install -r requirements.txt`
5. Create `.env` file in `/scripts`
6. Create GitHub API Access Token by following this [guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
    - NB! Step 11 is required for accessing the SEPTIC Repo using the token.
7. Add the personal access token to the `.env` file
    - Add the line `API_TOKEN=YOUR_PERSONAL_TOKEN`

## Updating the documentation

1. Set the desired branch to pull the documentation from for both calcs and objects by updating the variables in the top of `/scripts/main.py`
2. Update the desired output path for both calcs and objects by updating the variables in the top of `/scripts/main.py`
3. Run the script from the root of the project in the terminal or by using the VSCode Launch script `Update Documentation`.
4. Check the terminal for error messages
