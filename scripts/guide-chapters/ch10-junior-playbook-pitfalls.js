export const ch10 = `
# Chapter 10: Junior Developer Playbook & Common Pitfalls

## 10.1 Ten Common Mistakes Every Junior CAP Developer Makes

### Mistake 1: Unexposed Navigation Targets with \`$expand\`
* **The Error:** \`[400] Bad Request: Navigation property "xyz" does not exist\`.
* **The Cause:** You called \`$expand=xyz\` from the UI, but entity \`xyz\` was not declared inside that specific service in \`srv/*.cds\`.
* **The Fix:** Always expose a \`@readonly entity xyz as projection on db.xyz;\` in the service.

### Mistake 2: Declaring \`$top\` / \`$skip\` in SAPUI5 Binding Parameters
* **The Error:** \`System query option $top is not supported\`.
* **The Cause:** SAPUI5 OData V4 manages paging internally. Putting \`$top\` in XML view \`parameters\` crashes the router.
* **The Fix:** Put \`length: 4\` and \`startIndex: 0\` directly on the binding object outside \`parameters\`.

### Mistake 3: Executing Multiple Database Writes Without a Transaction
* **The Error:** Data corruption when a failure occurs midway through checkout.
* **The Cause:** Calling \`await INSERT\` and \`await UPDATE\` without binding to \`cds.tx(req)\`.
* **The Fix:** Always use \`const tx = cds.tx(req); await tx.run(...);\`. If an error occurs, CAP automatically rolls back all changes.

### Mistake 4: Using Association Instead of Composition for Line Items
* **The Error:** Child records are orphaned when parent is deleted, or deep insert fails.
* **The Cause:** Using \`items : Association to many OrderItems\` instead of \`items : Composition of many OrderItems on items.order = $self\`.
* **The Fix:** Use \`Composition of\` for parent-child lifecycles.

### Mistake 5: Incorrect CSV Seed File Headers
* **The Error:** Foreign key values are null or ignored when loading mock data.
* **The Cause:** Naming the CSV column \`category\` instead of \`category_ID\`.
* **The Fix:** For any association \`category : Association to Categories\`, the relational column in SQL and CSV is always \`<associationName>_ID\`.

### Mistake 6: Relying on Frontend Hiding for Security
* **The Error:** Unauthorized users can delete records or view other customers' carts using curl or Postman.
* **The Cause:** Checking user role in JavaScript UI instead of CDS \`@restrict\`.
* **The Fix:** Always enforce security at the CAP service layer with \`@requires\` and \`@restrict\`.

### Mistake 7: Hardcoding Full Cloud URLs
* **The Error:** Frontend fails when deployed to Cloud Foundry due to CORS or broken domains.
* **The Cause:** Hardcoding \`http://localhost:4004\` in UI5 models or manifest.
* **The Fix:** Use relative paths (e.g., \`/odata/v4/catalog/\`) and route via the Managed App Router.

### Mistake 8: Forgetting to Re-Deploy SQLite Views
* **The Error:** \`SQLITE_ERROR: no such table: CartService_Products\`.
* **The Cause:** Adding a new service projection without redeploying the SQLite schema.
* **The Fix:** Run \`npx cds deploy --to sqlite:db.sqlite\` or \`cds.deploy('*')\`.

### Mistake 9: Failing to Freeze Historical Snapshot Prices
* **The Error:** An order placed last month changes total price when the seller raises the catalog price today.
* **The Cause:** Calculating order totals by joining with current catalog product prices.
* **The Fix:** Snapshot the price into \`OrderItems.unitPrice\` at the exact second of purchase.

### Mistake 10: Writing Custom UI Code Instead of Annotations in Admin Screens
* **The Error:** Huge boilerplate JavaScript controllers for simple tabular and form screens.
* **The Cause:** Not knowing how to leverage Fiori Elements.
* **The Fix:** Use \`@UI.LineItem\`, \`@UI.HeaderInfo\`, and \`@UI.Facets\`. Fiori Elements handles sorting, filtering, paging, and responsive rendering with 0 JavaScript.

---

## 10.2 Essential CDS CLI Cheat Sheet

| Command | What It Does |
| :--- | :--- |
| \`cds watch\` | Starts local development server with auto-restart on file save |
| \`cds serve\` | Serves all services in \`srv/\` on port 4004 |
| \`cds compile db/schema.cds --to sql\` | Inspects the generated SQL DDL statements |
| \`cds compile srv/catalog-service.cds --to edmx\` | Inspects the generated OData V4 EDMX XML metadata |
| \`cds deploy --to sqlite:db.sqlite\` | Deploys schema and views to local SQLite database |
| \`cds lint\` | Validates CDS syntax, naming conventions, and best practices |
| \`cds env\` | Inspects active configuration, database profiles, and auth settings |
| \`npm test\` | Runs the entire 136-test suite |
| \`npm run build\` | Runs production compilation and UI packaging |
| \`mbt build\` | Builds the complete Cloud Foundry \`.mtar\` deployment archive |

---

## 10.3 Step-by-Step: How to Add a New Feature to This Project

Follow this 7-step checklist whenever you are assigned a new business requirement:

\`\`\`
Step 1: Declare Domain Model in db/schema.cds
        (Use cuid, managed, enums, Associations/Compositions)
                         |
                         v
Step 2: Add Seed CSV Data in db/data/sap.marketplace-<Entity>.csv
        (Include header row with UUIDs and _ID foreign keys)
                         |
                         v
Step 3: Expose Projection in srv/<service-name>.cds
        (Add @readonly, @restrict, virtual fields, actions)
                         |
                         v
Step 4: Implement Logic in srv/<service-name>.js
        (Handle before validation, on actions, after virtual fields)
                         |
                         v
Step 5: Bind to UI
        (Freestyle XML View for Storefront OR CDS Annotations for Admin)
                         |
                         v
Step 6: Write Automated Tests in test/
        (Test happy path + negative edge cases with @cap-js/cds-test)
                         |
                         v
Step 7: Verify with npm test and npm run lint
        (Ensure all 136+ tests pass with 0 errors)
\`\`\`
`;
