export const ch5 = `
# Chapter 5: Security, Authentication & Authorization (XSUAA)

## 5.1 Architecture of SAP BTP Security
In enterprise cloud applications, security must never rely exclusively on frontend UI controls (such as hiding a "Delete" button). A malicious user can open Chrome DevTools or curl and submit HTTP requests directly to your backend APIs.

In SAP BTP, security is governed by the **Extended Services for User Account and Authentication (XSUAA)** service, which implements the **OAuth 2.0 / JWT (JSON Web Token)** standard.

\`\`\`
+------------------+         1. Login Request         +--------------------+
|  Browser Client  | -------------------------------> |   SAP Cloud IDP    |
|   (User Alice)   | <------------------------------- | (Identity Provider)|
+------------------+     2. Issues Signed JWT Token   +--------------------+
         |
         | 3. HTTP Request with Header:
         |    "Authorization: Bearer <JWT-Token>"
         v
+--------------------------------------------------------------------------+
| CAP Application Backend (@sap/cds-mtxs & passport)                       |
|                                                                          |
| 1. Validates JWT Signature using XSUAA public key                        |
| 2. Decodes Token Claims:                                                 |
|    - User Identity: req.user.id ("alice@example.com")                    |
|    - Scopes: ["$XSAPPNAME.Customer", "$XSAPPNAME.Buyer"]                 |
|    - Attributes: customerId, tenantId                                    |
| 3. Checks CDS @requires & @restrict rules                                |
|    - If authorized -> executes query                                     |
|    - If unauthorized -> returns 401 Unauthorized or 403 Forbidden        |
+--------------------------------------------------------------------------+
\`\`\`

---

## 5.2 Decoupling Roles and Scopes in \`xs-security.json\`

Open \`xs-security.json\` in the project root. It defines three key levels of security metadata:

### 1. Scopes (Technical Permissions)
Scopes are the granular technical permissions verified by the CAP runtime:
\`\`\`json
"scopes": [
  { "name": "$XSAPPNAME.Customer", "description": "Customer storefront access" },
  { "name": "$XSAPPNAME.Seller", "description": "Seller portal access" },
  { "name": "$XSAPPNAME.ProductManager", "description": "Manage catalog products" },
  { "name": "$XSAPPNAME.OrderManager", "description": "Manage customer orders & fulfillment" },
  { "name": "$XSAPPNAME.InventoryManager", "description": "Manage warehouse stock" },
  { "name": "$XSAPPNAME.Administrator", "description": "Full system administrator access" }
]
\`\`\`

### 2. Role Templates (Blueprints)
Role templates bundle one or more scopes together into a functional template:
\`\`\`json
"role-templates": [
  {
    "name": "CustomerRole",
    "description": "Storefront customer capabilities",
    "scope-references": ["$XSAPPNAME.Customer"]
  },
  {
    "name": "AdminRole",
    "description": "Full administrative privileges",
    "scope-references": ["$XSAPPNAME.Administrator"]
  }
]
\`\`\`

### 3. Role Collections (User Assignment)
Role collections are assigned to actual human users in the SAP BTP Cockpit:
\`\`\`json
"role-collections": [
  {
    "name": "Marketplace_Customer",
    "description": "Customer shoppers",
    "role-template-references": ["$XSAPPNAME.CustomerRole"]
  }
]
\`\`\`

---

## 5.3 Enforcing Authorization in CDS (\`@requires\` & \`@restrict\`)

CAP provides two declarative annotations for service and entity authorization:

### 1. Service-Level Gatekeeping (\`@requires\`)
In \`srv/admin-service.cds\`:
\`\`\`cds
service AdminService @(requires: ['Administrator', 'ProductManager', 'OrderManager', 'InventoryManager']) { ... }
\`\`\`
* If an unauthenticated user or a standard customer attempts to query \`/odata/v4/admin/Products\`, CAP immediately rejects the request with **HTTP 403 Forbidden** before any database query is executed.

### 2. Entity-Level Operations & Row-Level Security (\`@restrict\`)
In \`srv/customer-service.cds\`:
\`\`\`cds
service CustomerService @(requires: 'authenticated-user') {
    @restrict: [
        { grant: ['READ', 'UPDATE'], to: 'Customer', where: 'customer.email = $user.id' },
        { grant: '*', to: 'Administrator' }
    ]
    entity Addresses as projection on db.Addresses;
}
\`\`\`

### Why this is revolutionary:
* **Horizontal Privilege Escalation Prevention:** If Alice's customer ID is \`cust-1\` and Bob's is \`cust-2\`, Alice cannot read Bob's addresses even if she knows Bob's UUID!
* **Zero Boilerplate:** The \`where: 'customer.email = $user.id'\` clause is automatically injected by CAP into the underlying SQL query:
  \`\`\`sql
  SELECT * FROM Addresses WHERE customer_email = 'alice@example.com';
  \`\`\`

---

## 5.4 Mocking Security in Local Development (\`package.json\`)

In local development, you do not have an active BTP XSUAA cloud instance running. CAP provides a mock authentication provider configured in \`package.json\`:

\`\`\`json
"cds": {
  "requires": {
    "auth": {
      "kind": "mocked",
      "users": {
        "alice": {
          "roles": ["Customer"],
          "attr": { "id": "cust-001" }
        },
        "carol_prod": {
          "roles": ["ProductManager"]
        },
        "admin": {
          "roles": ["Administrator", "Customer", "OrderManager", "ProductManager"]
        }
      }
    }
  }
}
\`\`\`

To test an endpoint as Alice, simply pass Basic Authentication header:
\`Authorization: Basic YWxpY2U6\` (alice with empty password).
In production (\`[production]\`), CAP automatically switches to \`"kind": "xsuaa"\`.
`;
