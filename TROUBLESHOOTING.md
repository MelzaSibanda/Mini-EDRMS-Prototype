# Mini EDRMS - Troubleshooting Guide

## 🔧 Common Issues and Solutions

This guide helps you quickly resolve any issues you might encounter with the Mini EDRMS system.

---

## 🚨 Problem: Nothing Displays / Blank Page

### Symptoms
- White/blank screen
- No content visible
- Console shows errors

### Solutions

1. **Check Browser Console**
   - Press F12 (Windows) or Cmd+Option+J (Mac)
   - Look for red error messages
   - Note the error and check solutions below

2. **Refresh the Page**
   - Press Ctrl+R (Windows) or Cmd+R (Mac)
   - Sometimes the page just needs a refresh

3. **Clear Browser Cache**
   - Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   - Clear cached images and files
   - Refresh the page

---

## 🚨 Problem: Documents Don't Load on Dashboard

### Symptoms
- Dashboard shows loading spinner forever
- "Failed to load dashboard data" error
- Statistics show as 0

### Solutions

1. **Check Network Connection**
   - Make sure you're connected to the internet
   - Backend requires connectivity to function

2. **Check Browser Console**
   - Look for network errors (red in Console tab)
   - Check Network tab in DevTools for failed requests

3. **Verify Backend is Running**
   - Backend should auto-start
   - Check if other pages (like Add Document) work

4. **Wait and Retry**
   - Sometimes the backend takes a moment to initialize
   - Refresh after 5-10 seconds

---

## 🚨 Problem: Can't Add Documents

### Symptoms
- Form submission fails
- Error message appears
- Nothing happens when clicking "Create Document"

### Solutions

1. **Check All Required Fields**
   - Document Title - must not be empty
   - Document Type - must select from dropdown
   - Department - must select from dropdown
   - Status - must select from dropdown
   - Owner Name - must not be empty

2. **Check Form Validation Errors**
   - Red error message at top of form
   - Read the error message carefully
   - Fix the issue mentioned

3. **Check Browser Console**
   - Press F12
   - Look for JavaScript errors
   - Check Network tab for failed API calls

4. **Try Different Data**
   - Use simple title: "Test Document"
   - Select first options in dropdowns
   - Owner name: "Test User"

---

## 🚨 Problem: Search Returns No Results

### Symptoms
- "No documents found" message
- Expected documents don't appear
- Empty results table

### Solutions

1. **Reset Filters**
   - Click "Reset" button
   - Try searching with no filters first
   - This should show all 6 sample documents

2. **Check Filter Combinations**
   - Some combinations may have no matches
   - Try filtering by just Department first
   - Then try filtering by just Status

3. **Verify Sample Data Exists**
   - Go to Dashboard
   - Check if documents appear there
   - If Dashboard is empty, backend may not have initialized

4. **Clear and Re-search**
   - Set filters to "All Departments" and "All Statuses"
   - Click Search
   - Should show all documents

---

## 🚨 Problem: Document Details Show "Not Found"

### Symptoms
- Error message when clicking on a document
- "Document not found" error
- Red error box

### Solutions

1. **Try Different Document**
   - Go back to Dashboard or Search
   - Try clicking on a different document
   - If others work, that document ID might be invalid

2. **Check URL**
   - URL should look like: `/documents/1`
   - If URL looks strange, navigate from home

3. **Refresh and Try Again**
   - Press back button
   - Refresh the page
   - Click on document again

---

## 🚨 Problem: Navigation Doesn't Work

### Symptoms
- Clicking menu items does nothing
- Page doesn't change
- Links are not clickable

### Solutions

1. **Check if JavaScript is Enabled**
   - JavaScript must be enabled in browser
   - Check browser settings

2. **Reload the Page**
   - Ctrl+R or Cmd+R
   - Sometimes state gets confused

3. **Use Browser Back/Forward**
   - Browser back button should work
   - Navigate manually if needed

---

## 🚨 Problem: Styling Looks Broken

### Symptoms
- No colors
- Ugly layout
- Text is wrong size
- Everything looks plain

### Solutions

1. **Hard Refresh**
   - Ctrl+Shift+R (Windows)
   - Cmd+Shift+R (Mac)
   - This reloads CSS files

2. **Check Browser Compatibility**
   - Use modern browser (Chrome, Firefox, Safari, Edge)
   - Update browser to latest version

3. **Disable Browser Extensions**
   - Some extensions block CSS
   - Try incognito/private mode

---

## 🚨 Problem: API Errors in Console

### Symptoms
- Console shows "Failed to fetch"
- 404 or 500 errors
- Network errors

### Solutions

1. **Check Network Connection**
   - Ensure internet is working
   - Try loading another website

2. **Check API Endpoint URLs**
   - Should point to Supabase functions
   - URL should include project ID

3. **Check for CORS Errors**
   - CORS should be configured in backend
   - If you see CORS error, backend needs restart

4. **Wait for Backend Initialization**
   - Backend may still be starting
   - Wait 10-20 seconds
   - Refresh and try again

---

## 🚨 Problem: "Authorization Error" or 401 Status

### Symptoms
- "Unauthorized" error
- 401 status code
- "Invalid token" message

### Solutions

1. **This Shouldn't Happen**
   - The public anon key is pre-configured
   - If you see this, it's a configuration issue

2. **Check /utils/supabase/info.tsx**
   - Make sure file exists
   - Should have projectId and publicAnonKey

3. **Refresh Page**
   - Sometimes token gets stale
   - Refresh should fix it

---

## 🚨 Problem: Foreign Key Validation Error

### Symptoms
- "Invalid department ID" error
- "Invalid document type ID" error
- Can't create document

### Solutions

1. **This is EXPECTED Behavior**
   - This demonstrates foreign key validation working!
   - You tried to select invalid data

2. **Select Valid Options**
   - Use the dropdown menus
   - Don't type department/type IDs manually
   - Select from provided options

3. **For Interview**
   - This is a FEATURE to demonstrate
   - Shows referential integrity
   - Explain: "The system prevents invalid references"

---

## 🔍 Debugging Checklist

When something goes wrong, check these in order:

1. [ ] Browser console for errors (F12)
2. [ ] Network tab for failed requests
3. [ ] Internet connection
4. [ ] All required form fields filled
5. [ ] Using supported browser (Chrome, Firefox, Safari, Edge)
6. [ ] Page has been refreshed
7. [ ] No browser extensions interfering
8. [ ] Backend has had time to initialize (10-20 seconds)

---

## 🛠️ Developer Tools Guide

### How to Open Developer Tools

**Windows:**
- Chrome/Edge: F12 or Ctrl+Shift+I
- Firefox: F12 or Ctrl+Shift+I

**Mac:**
- Chrome/Safari: Cmd+Option+I
- Firefox: Cmd+Option+I

### What to Check

1. **Console Tab**
   - Look for red error messages
   - Read error details
   - Note line numbers

2. **Network Tab**
   - Click to enable recording
   - Perform the action that's failing
   - Look for red/failed requests
   - Click failed request to see details

3. **Application/Storage Tab**
   - Check if data is being stored
   - Clear cache if needed

---

## 📞 Error Messages Explained

### "Failed to fetch"
**Meaning:** Can't connect to backend  
**Solution:** Check internet connection, wait for backend initialization

### "Document not found"
**Meaning:** Invalid document ID  
**Solution:** Navigate from Dashboard or Search, don't use random IDs

### "Missing required fields"
**Meaning:** Form validation failed  
**Solution:** Fill all required fields marked with *

### "Invalid department ID"
**Meaning:** Foreign key validation working correctly  
**Solution:** Select from dropdown, don't use custom values

### "Failed to load dashboard data"
**Meaning:** Can't retrieve statistics  
**Solution:** Refresh page, check internet connection

---

## 🎯 Interview Day Troubleshooting

### Problem: Demo Isn't Working During Interview

**DON'T PANIC!** Here's what to do:

1. **Acknowledge It Calmly**
   - "Let me refresh the page quickly"
   - Shows you stay calm under pressure

2. **Quick Fixes to Try (in order)**
   - Refresh the page (Ctrl+R)
   - Try a different browser tab
   - Navigate to a different page then back
   - Show static documentation as backup

3. **Have a Backup Plan**
   - "While this loads, let me walk you through the architecture"
   - Show the code instead
   - Explain how it's supposed to work
   - Use the documentation files

4. **Turn It Into a Learning Moment**
   - "This is why error handling is important"
   - "In production, I'd add better retry logic"
   - Shows problem-solving skills

---

## 🚀 Pre-Interview Testing

To avoid surprises, test these the night before:

### 30-Minute Pre-Flight Check

1. **Test Dashboard** (2 min)
   - [ ] Loads successfully
   - [ ] Shows statistics
   - [ ] Displays recent documents
   - [ ] "View Details" links work

2. **Test Add Document** (3 min)
   - [ ] Form loads
   - [ ] Dropdowns populate
   - [ ] Can submit valid document
   - [ ] Redirects after creation
   - [ ] New document appears in search

3. **Test Search** (2 min)
   - [ ] Search page loads
   - [ ] Can search without filters
   - [ ] Can filter by department
   - [ ] Can filter by status
   - [ ] Results display correctly

4. **Test Document Details** (2 min)
   - [ ] Can view document details
   - [ ] All information displays
   - [ ] Back button works
   - [ ] Foreign keys are resolved

5. **Test Navigation** (1 min)
   - [ ] All menu items work
   - [ ] Can navigate between pages
   - [ ] URLs update correctly

6. **Test Error Handling** (2 min)
   - [ ] Try submitting empty form (should show error)
   - [ ] Try invalid document ID (should show error)
   - [ ] Errors display user-friendly messages

If ALL tests pass: **You're ready!** ✅

If ANY test fails: **Fix it now** before the interview!

---

## 🔄 Reset Instructions

If everything is really broken and you need to start fresh:

### Option 1: Hard Refresh
1. Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. This reloads everything from scratch
3. Wait 10-20 seconds for backend to initialize

### Option 2: Clear All Data
1. Open Developer Tools (F12)
2. Go to Application/Storage tab
3. Click "Clear site data"
4. Refresh the page
5. Backend will reinitialize with sample data

### Option 3: New Browser Window
1. Open a new incognito/private window
2. Navigate to the application
3. Fresh start with no cached data

---

## ✅ System Health Check

Use this to verify everything is working:

```
✅ Dashboard loads and shows 6 total documents
✅ Dashboard shows statistics (Draft: 1, Submitted: 2, Approved: 3)
✅ Can navigate to Add Document page
✅ Dropdowns show 4 departments and 4 document types
✅ Can create a new document successfully
✅ Search page displays
✅ Search with no filters shows all documents
✅ Can view document details
✅ Navigation works between all pages
✅ No console errors (except expected warnings)
```

If all boxes check: **System is healthy!** 💚

---

## 📚 Additional Resources

If you need more help:

1. **Read the Code Comments**
   - Every component is thoroughly documented
   - Look for explanations in the code

2. **Check Documentation**
   - README.md for overview
   - SYSTEM_ARCHITECTURE.md for technical details
   - DATABASE_SCHEMA.md for database info

3. **Browser DevTools**
   - Console tab for JavaScript errors
   - Network tab for API issues
   - Elements tab for CSS issues

---

## 🎯 Remember

- Most issues are solved by refreshing the page
- Check the browser console first
- The system is designed to work - if it doesn't, it's usually a simple fix
- Stay calm, especially during interviews
- You can always explain how it's supposed to work

---

## ✨ Pro Tips

1. **Test before the interview** - Don't wait until you're sharing your screen
2. **Have documentation open** - As a backup if demo fails
3. **Know your browser shortcuts** - F12, Ctrl+R, etc.
4. **Stay calm** - Technical issues happen, handling them well impresses interviewers
5. **Have a plan B** - Can you explain the code if the demo doesn't work?

---

**Most Important:** If something breaks during your interview, it's not the end of the world. How you handle it shows your problem-solving skills and composure under pressure!

**You've got this!** 💪
