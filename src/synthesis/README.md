# Synthesis

Cleans and transforms raw chat data for display. Raw data stays in Firebase; synthesis runs at render time.

## Username cleaning
- Removes all emojis from usernames
- If username is Armando "The Professor", displays as **Admin 3**
- If no username or only a date (e.g. "Mar 20, 2025"), assigns a stable `Member_xxx` name

## Display rules
- Images and documents are not shown (filtered at import; hidden in display)
- Profile images are not displayed (only usernames)
