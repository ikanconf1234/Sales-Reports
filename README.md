# Google Sheets Backup Setup

Use this to save every submitted sales visit into Google Sheets.

## Setup

1. Create a new Google Sheet.
2. Open `Extensions > Apps Script`.
3. Delete the default code.
4. Paste the contents of `Code.gs` into Apps Script.
5. Click `Deploy > New deployment`.
6. Select `Web app`.
7. Set `Execute as` to `Me`.
8. Set `Who has access` to `Anyone with the link`.
9. Deploy and copy the Web App URL.
10. Open `script.js` and replace:

```js
PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE
```

with your Web App URL.

## What It Creates

The spreadsheet will store records in:

- `All Submissions`
- `ADIL`
- `JENNY`
- `ESSAM`
- `AJAY`

Every submission is saved to `All Submissions` and also to the matching salesperson tab.
