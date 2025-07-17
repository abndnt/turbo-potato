# Google Sheets Configuration Guide

## 📋 **Exact Sheet Structure Required**

Your Google Sheet **must** have these exact column headers in row 1:

| Column | Header | Description | Required | Example Values |
|--------|--------|-------------|----------|----------------|
| A | Item Name | Name/title of the item | ✅ Yes | "iPhone 12 Pro", "Vintage Chair" |
| B | Description | Detailed description | ✅ Yes | "Excellent condition, barely used..." |
| C | Price | Price in dollars (numbers only) | ✅ Yes | 25, 150, 1200 |
| D | Category | Facebook Marketplace category | ✅ Yes | "Electronics", "Furniture", "Clothing" |
| E | Condition | Item condition | ✅ Yes | "New", "Used", "Fair" |
| F | Photos | Image file paths or URLs | ❌ Optional | "image1.jpg,image2.jpg" |
| G | Location | Location for pickup/delivery | ❌ Optional | "New York, NY", "Los Angeles, CA" |
| H | Status | Processing status | ✅ Yes | "Process", "Ready", "Processing", "Success", "Failed" |
| I | Listing URL | Facebook listing URL (auto-filled) | ❌ Auto | Auto-generated after posting |
| J | Error Log | Error messages (auto-filled) | ❌ Auto | Auto-generated if errors occur |

## 🎯 **Status Column Values**

The automation system looks for these specific values in the **Status** column (Column H):

### **For Processing:**
- `Process` - Item will be processed by automation
- `Ready` - Item is ready for processing

### **System Status (Auto-Updated):**
- `Processing` - Currently being processed
- `Success` - Successfully posted to Facebook
- `Failed` - Processing failed (check Error Log)
- `Error: [message]` - Specific error occurred

## 📝 **Sample Sheet Setup**

### **Row 1 (Headers):**
```
Item Name | Description | Price | Category | Condition | Photos | Location | Status | Listing URL | Error Log
```

### **Row 2 (Sample Data):**
```
Test Item | Sample description for testing automation | 25 | Electronics | Used | | New York, NY | Process | | 
```

## ⚙️ **Environment Variables**

Your `.env` file must use these exact variable names:

```env
# Google Sheets API Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----"
GOOGLE_PROJECT_ID=your-project-id
```

## 🔍 **Code Implementation Details**

The system uses these specific mappings from [`src/services/googleSheets.js`](src/services/googleSheets.js):

```javascript
parseRowData(row, rowNumber) {
  return {
    rowNumber,
    itemName: row[0] || '',      // Column A
    description: row[1] || '',   // Column B  
    price: row[2] || '',         // Column C
    category: row[3] || '',      // Column D
    condition: row[4] || '',     // Column E
    photos: row[5] ? row[5].split(',').map(p => p.trim()) : [], // Column F
    location: row[6] || '',      // Column G
    status: row[7] || 'Pending'  // Column H
  };
}
```

### **Validation Logic:**
```javascript
// Items are processed if status is:
if (rowData.status === 'Process' || rowData.status === 'Ready') {
  // Process this item
}
```

### **Expected Headers Validation:**
```javascript
const expectedHeaders = [
  'Item Name',
  'Description', 
  'Price',
  'Category',
  'Condition',
  'Photos',
  'Location',
  'Status',
  'Listing URL',
  'Error Log'
];
```

## 🚨 **Common Issues & Solutions**

### **Issue: "Sheet structure validation failed"**
**Solution:** Ensure your headers match exactly (case-sensitive):
- ✅ "Item Name" (correct)
- ❌ "Title" (incorrect)
- ✅ "Photos" (correct)  
- ❌ "Images" (incorrect)

### **Issue: "No pending items found"**
**Solution:** Check your Status column values:
- ✅ Use "Process" or "Ready"
- ❌ Don't use "Pending" or empty values

### **Issue: "Missing required fields"**
**Solution:** Ensure these columns have values:
- Item Name (Column A)
- Description (Column B)
- Price (Column C)

## 📊 **Sheet Permissions**

1. Share your Google Sheet with your service account email
2. Give **Editor** permissions
3. Service account email format: `your-service-account@project-id.iam.gserviceaccount.com`

## 🧪 **Testing Your Setup**

1. Create sheet with exact headers above
2. Add sample row with Status = "Process"
3. Use dashboard to validate sheet
4. Should show "Sheet validation successful"
5. Should display your test item in pending items

## 📱 **Dashboard Integration**

The dashboard expects:
- **Spreadsheet URL**: Full Google Sheets URL
- **Validation**: Checks structure and permissions
- **Pending Items**: Shows items with "Process" or "Ready" status
- **Real-time Updates**: Status changes reflected immediately

---

**Important**: This configuration is based on the actual code implementation. Any deviation from these specifications may cause validation or processing failures.