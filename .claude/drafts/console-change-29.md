# Firebase Console — Change 29 (Shared Product Categories & Sub-categories)

Publish these rules in the **Firebase Console -> Firestore Database -> Rules** tab **before** pushing the Step 1 category code.

---

## Step 1 of 3 — Add the `categoryManager` helper function

### WHERE to paste (around line 155)
Find the end of `function sellDamagedHolder(bossUid)` right above `function isSalesman(bossUid)`:

```javascript
      return isAuthenticated() && profile != null && profile.bossUid == bossUid && (role == 'AREA_ADMIN' || role == 'FLEET_CAPTAIN') &&
        (known ? key in saved.get(role, []) : role == 'AREA_ADMIN');
    }

    function isSalesman(bossUid) {
```

### WHAT to paste
Paste this block **after** the closing `}` of `sellDamagedHolder(bossUid)` and **before** `function isSalesman(bossUid) {`:

```javascript
    // [CHANGE 29 — DRAFT] WHO MANAGES SHARED PRODUCT CATEGORIES (Master Vault + Competitors).
    function categoryManager(bossUid) {
      let profile = getEmployeeProfile();
      let role = profile != null ? profile.get('userRole', 'NONE') : 'NONE';
      let m = getPermissionMatrixDoc(bossUid);
      let saved = m != null && ('matrix' in m) ? m.matrix : {};
      let key = 'manage_product_categories';
      let known = key in saved.get('DEVELOPER', []) || key in saved.get('COMPANY_OWNER', []) || key in saved.get('AREA_ADMIN', []) ||
        key in saved.get('FLEET_CAPTAIN', []) || key in saved.get('FIELD_OPERATIVE', []) || key in saved.get('ROOKIE', []);
      return isAuthenticated() && profile != null && profile.bossUid == bossUid &&
        (known ? key in saved.get(role, []) : (role == 'AREA_ADMIN' || role == 'FLEET_CAPTAIN'));
    }
```

---

## Step 2 of 3 — Add `categoryId` and `subCategoryId` to the Sell Again (`rsk-*`) product lines

### WHERE to paste (around lines 668–677, near the bottom of `match /products/{productId}`)
Find the two `sellDamagedHolder(bossUid)` lines inside `match /products/{productId}`:

```javascript
        allow create: if sellDamagedHolder(bossUid) && productId == 'rsk-' + request.resource.data.damagedFrom &&
          request.resource.data.keys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'images', 'dimensions', 'useFrontForBack',
            'sticksPerPack', 'packsPerSlop', 'slopsPerBal', 'balsPerCarton', 'hpp', 'costPrice',
            'priceRetail', 'priceGrosir', 'priceEcer', 'priceDistributor', 'stock']);
        allow update: if sellDamagedHolder(bossUid) && productId == 'rsk-' + resource.data.damagedFrom &&
          request.resource.data.damagedFrom == resource.data.damagedFrom &&
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'images', 'dimensions',
            'useFrontForBack', 'sticksPerPack', 'packsPerSlop', 'slopsPerBal', 'balsPerCarton', 'hpp', 'costPrice',
            'priceRetail', 'priceGrosir', 'priceEcer', 'priceDistributor', 'stock']);
```

### WHAT to paste
Replace those 9 lines with these 9 lines (this adds `'categoryId', 'subCategoryId',` right after `'category',` on both `allow create` and `allow update`):

```javascript
        allow create: if sellDamagedHolder(bossUid) && productId == 'rsk-' + request.resource.data.damagedFrom &&
          request.resource.data.keys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'categoryId', 'subCategoryId', 'images', 'dimensions', 'useFrontForBack',
            'sticksPerPack', 'packsPerSlop', 'slopsPerBal', 'balsPerCarton', 'hpp', 'costPrice',
            'priceRetail', 'priceGrosir', 'priceEcer', 'priceDistributor', 'stock']);
        allow update: if sellDamagedHolder(bossUid) && productId == 'rsk-' + resource.data.damagedFrom &&
          request.resource.data.damagedFrom == resource.data.damagedFrom &&
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'categoryId', 'subCategoryId', 'images', 'dimensions',
            'useFrontForBack', 'sticksPerPack', 'packsPerSlop', 'slopsPerBal', 'balsPerCarton', 'hpp', 'costPrice',
            'priceRetail', 'priceGrosir', 'priceEcer', 'priceDistributor', 'stock']);
```

---

## Step 3 of 3 — Add the `product_categories/{catId}` collection rule

### WHERE to paste (around line 678, right below `match /products/{productId}`)
Find the closing `}` of `match /products/{productId}` right above `match /quarantine_logs/{logId}`:

```javascript
        allow delete: if false;
      }
      // [CHANGE 24 — DRAFT] the Sell Again holder writes its own line in the quarantine history, method SELL only. Reading the history
      // stays the owner's (the users/{bossUid} catch-all above).
      match /quarantine_logs/{logId} {
```

### WHAT to paste
Paste this block **after** the closing `}` of `match /products/{productId}` and **before** `// [CHANGE 24 — DRAFT] the Sell Again holder writes its own line`:

```javascript
      // [CHANGE 29 — DRAFT] Shared 2-level category list (Master Vault + Competitors).
      match /product_categories/{catId} {
        allow read: if isSalesman(bossUid);
        allow create, update: if (isCompanyTopTier(bossUid) || categoryManager(bossUid)) &&
          request.resource.data.keys().hasOnly(['name', 'normName', 'subs', 'createdAt', 'updatedAt', 'updatedBy']) &&
          request.resource.data.name is string && request.resource.data.name.size() > 0 &&
          request.resource.data.subs is list;
        allow delete: if isCompanyTopTier(bossUid) || categoryManager(bossUid);
      }
```

---

## After publish, check this (3 lines)
1. **Console banner is green:** Pressing **Publish** in the Firebase Console finishes with no red syntax errors and shows today's timestamp at the top of the Rules page.
2. **Existing app works normally before code push:** Refresh the live app and confirm Master Vault products, Sales Terminal tabs, and Stock Opname load with zero permission errors.
3. **Ready for Step 1 code push:** Once published in both Firebase projects (live + demo if used), tell Alucard `"Change 29 is live"` so the Step 1 category code can be built and pushed.
