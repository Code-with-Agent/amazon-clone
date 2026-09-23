export const ch7 = `
# Chapter 7: Backoffice Frontend (SAP Fiori Elements)

## 7.1 What is SAP Fiori Elements?
For the internal business backoffice (\`app/admin-ui\`), our requirements were very different from the consumer storefront:
* Business users need comprehensive management screens for 9 operational areas: Products, Orders, Customers, Inventory, Sellers, Promotions, Reviews, Payments, and Shipments.
* Building 9 separate CRUD applications from scratch in freestyle UI5 would take months and produce inconsistent UI layouts.

**SAP Fiori Elements** solves this by generating complete enterprise web applications entirely from **CDS UI Annotations**. Instead of writing HTML/XML views and JavaScript controllers, we write declarative metadata in \`app/admin-ui/annotations.cds\`.

---

## 7.2 Core CDS UI Annotations Breakdown (\`app/admin-ui/annotations.cds\`)

Let us examine the annotations that power the **Product Management** screen:

### 1. Header Information (\`@UI.HeaderInfo\`)
Defines the title of the page and singular/plural entity names:
\`\`\`cds
annotate AdminService.Products with @(
    UI.HeaderInfo: {
        TypeName: 'Product',
        TypeNamePlural: 'Products',
        Title: { $Type: 'UI.DataField', Value: title },
        Description: { $Type: 'UI.DataField', Value: brand }
    }
);
\`\`\`

### 2. List Report Columns (\`@UI.LineItem\`)
Defines the table columns, their display order, and responsiveness:
\`\`\`cds
annotate AdminService.Products with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: title, Label: 'Product Title', ![@UI.Importance]: #High },
        { $Type: 'UI.DataField', Value: brand, Label: 'Brand' },
        { $Type: 'UI.DataField', Value: category.name, Label: 'Category' },
        { $Type: 'UI.DataField', Value: basePrice, Label: 'Base Price' },
        { $Type: 'UI.DataField', Value: averageRating, Label: 'Rating' },
        {
            $Type: 'UI.DataField',
            Value: status,
            Label: 'Status',
            Criticality: statusCriticality
        }
    ]
);
\`\`\`

### 3. Filter Bar (\`@UI.SelectionFields\`)
Defines which fields appear in the SmartFilterBar at the top of the table:
\`\`\`cds
annotate AdminService.Products with @(
    UI.SelectionFields: [
        title,
        brand,
        category_ID,
        seller_ID,
        status
    ]
);
\`\`\`
Fiori Elements automatically renders input fields, date pickers, or value help dialogs based on the underlying data types.

### 4. Semantic Colors (\`@UI.Criticality\`)
Criticality renders semantic color badges without custom CSS:
* \`1\` or \`#Negative\` = Red (e.g. OUT_OF_STOCK, CANCELLED)
* \`2\` or \`#Critical\` = Orange/Yellow (e.g. LOW_STOCK, PENDING_PAYMENT)
* \`3\` or \`#Positive\` = Green (e.g. IN_STOCK, DELIVERED, ACTIVE)
* \`0\` or \`#Neutral\`  = Grey/Default

In \`srv/admin-service.js\`, we calculate \`statusCriticality\` dynamically in \`after('READ')\`:
\`\`\`javascript
this.after('READ', 'Products', (each) => {
    if (each.status === 'ACTIVE') each.statusCriticality = 3;
    else if (each.status === 'INACTIVE') each.statusCriticality = 1;
    else each.statusCriticality = 0;
});
\`\`\`

### 5. Object Page Sections (\`@UI.Facets\` & \`@UI.FieldGroup\`)
When a user clicks a row in the List Report, Fiori Elements opens the **Object Page**.
\`@UI.Facets\` organizes the layout into tabs and accordion sections:
\`\`\`cds
annotate AdminService.Products with @(
    UI.Facets: [
        {
            $Type: 'UI.CollectionFacet',
            ID: 'GeneralSection',
            Label: 'General Information',
            Facets: [
                { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#General', Label: 'Details' },
                { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Pricing', Label: 'Pricing' }
            ]
        },
        {
            $Type: 'UI.ReferenceFacet',
            Target: 'variants/@UI.LineItem',
            Label: 'Product Variants'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Target: 'reviews/@UI.LineItem',
            Label: 'Customer Reviews'
        }
    ],
    UI.FieldGroup#General: {
        Data: [
            { $Type: 'UI.DataField', Value: title },
            { $Type: 'UI.DataField', Value: description },
            { $Type: 'UI.DataField', Value: brand }
        ]
    }
);
\`\`\`
* Notice how \`variants/@UI.LineItem\` reuses the variant entity's line items table as a nested child table on the product screen!

### 6. Search Helps (\`@Common.ValueList\`)
When selecting a category, users should see a search dialog rather than typing raw UUIDs:
\`\`\`cds
annotate AdminService.Products with {
    category @Common.ValueList: {
        CollectionPath: 'Categories',
        Parameters: [
            { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: category_ID, ValueListProperty: 'ID' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
        ]
    }
};
\`\`\`
`;
