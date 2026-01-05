# Add Firebase Secret to GitHub

## IMPORTANT: The key file is now in .gitignore and won't be committed

## Steps to Add the Secret:

1. **Go to GitHub Secrets:**
   - Open: https://github.com/CrudeNico/opes-40bae-git/settings/secrets/actions

2. **Click "New repository secret"**

3. **Fill in:**
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** Copy the ENTIRE contents of the file `opes-40bae-firebase-adminsdk-fbsvc-d3ad2fef4a.json`
     - Open the file in your editor
     - Select all (Cmd+A)
     - Copy (Cmd+C)
     - Paste into the GitHub secret value field

4. **Click "Add secret"**

5. **Done!** Now you can commit and push, and deployments will work automatically.

