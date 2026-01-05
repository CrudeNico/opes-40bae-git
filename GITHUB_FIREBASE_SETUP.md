# GitHub Actions + Firebase Hosting Setup

I've created GitHub Actions workflows for automatic deployments. Now you need to set up the Firebase Service Account secret.

## Steps to Complete Setup

### Step 1: Get Firebase Service Account Token

1. Go to Firebase Console: https://console.firebase.google.com/project/opes-40bae/settings/serviceaccounts/adminsdk
2. Click **"Generate new private key"**
3. Click **"Generate key"** in the popup
4. A JSON file will download - **keep this safe!**

### Step 2: Add Secret to GitHub

1. Go to your GitHub repository: https://github.com/CrudeNico/opes-40bae-git
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `FIREBASE_SERVICE_ACCOUNT`
5. Value: Open the downloaded JSON file, copy the **entire contents**, and paste it here
6. Click **"Add secret"**

### Step 3: Push to GitHub

The workflows are already created. Just commit and push:

```bash
git add .github/
git commit -m "Add Firebase Hosting GitHub Actions workflows"
git push
```

### Step 4: Watch It Deploy!

After pushing:
- Go to **Actions** tab in your GitHub repo
- You'll see the workflow running
- Once complete, your site will be live at: `https://opes-40bae.web.app`

## What Happens Next

- **Every push to `main`** → Automatic deployment to production
- **Every Pull Request** → Preview deployment (you'll get a preview URL)

## Alternative: Use Firebase Console (Easier)

If you prefer, you can also:
1. Complete the `firebase init hosting` (type `dist` when asked for public directory)
2. Then in Firebase Console → Hosting → there should be a "Connect repository" option after initialization

Let me know which method you prefer!

