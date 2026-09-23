export const ch8 = `
# Chapter 8: Multitarget Application (MTA) & Cloud Deployment

## 8.1 What is an SAP Multitarget Application (MTA)?
In enterprise cloud development, a complete business application is rarely a single monolithic server. Our marketplace consists of:
1. A Node.js CAP backend service.
2. A SAP HANA Cloud relational database schema.
3. Two independent HTML5 frontend web applications (\`shop-ui\` and \`admin-ui\`).
4. Multiple cloud service bindings (XSUAA, Destinations, HTML5 App Repo, HDI).

In SAP BTP, deploying these distinct pieces independently by hand would be error-prone and slow.
The **Multitarget Application (MTA)** standard solves this by packaging the entire distributed system into a single cohesive archive (\`.mtar\`) governed by a single deployment descriptor: **\`mta.yaml\`**.

---

## 8.2 Dissecting \`mta.yaml\`

The \`mta.yaml\` file defines **Modules** (software artifacts that run) and **Resources** (cloud services provisioned on BTP):

\`\`\`
+--------------------------------------------------------------------------------+
|                             mta.yaml ROOT ARCHIVE                              |
|                                                                                |
|  MODULES (What runs):                                                          |
|  1. amazon-clone-srv           (Node.js CAP Backend)                           |
|  2. amazon-clone-db-deployer   (HANA Database Migrations Deployer)             |
|  3. amazon-clone-app-deployer  (HTML5 Application Repository Content Deployer)  |
|  4. marketplace-shop           (SAPUI5 Storefront Frontend)                    |
|  5. marketplace-admin          (SAP Fiori Elements Admin Frontend)             |
|                                                                                |
|  RESOURCES (BTP Managed Services):                                             |
|  - amazon-clone-db             (SAP HANA HDI Container)                        |
|  - amazon-clone-auth           (SAP BTP XSUAA Service Instance)                |
|  - amazon-clone-destination    (BTP Destination Service)                       |
|  - amazon-clone-html5-repo-host(HTML5 Application Repository)                  |
+--------------------------------------------------------------------------------+
\`\`\`

### Key Module Configurations:

#### 1. Backend Service Module (\`amazon-clone-srv\`)
\`\`\`yaml
- name: amazon-clone-srv
  type: nodejs
  path: gen/srv
  parameters:
    buildpack: nodejs_buildpack
    memory: 512M
  provides:
    - name: srv-api
      properties:
        srv-url: \${default-url}
  requires:
    - name: amazon-clone-db
    - name: amazon-clone-auth
    - name: amazon-clone-destination-service
\`\`\`
* Notice \`provides: srv-api\`: This exports the backend's live URL so other modules and destinations can bind to it dynamically.

#### 2. HANA Database Deployer Module (\`amazon-clone-db-deployer\`)
\`\`\`yaml
- name: amazon-clone-db-deployer
  type: hdb
  path: gen/db
  requires:
    - name: amazon-clone-db
\`\`\`
* Uses SAP's official **HDB Deployer** container to run database migrations, create SAP HANA column tables, and create database views automatically.

---

## 8.3 The Build and Packaging Pipeline

To produce the deployment archive, run the following automated pipeline:

\`\`\`bash
# 1. Compile CDS models to production output (gen/srv and gen/db)
npx cds build --production

# 2. Package both UI5 applications into zip archives
npm run build:ui

# 3. Compile the MTA Archive using Cloud MTA Build Tool (mbt)
mbt build
\`\`\`

The output is written to:
\`\`\`
mta_archives/amazon-clone_1.0.0.mtar
\`\`\`

---

## 8.4 Production Deployment Commands (Cloud Foundry)

Once the \`.mtar\` file is generated, deploy it to your SAP BTP subaccount:

\`\`\`bash
# Step 1: Login to SAP BTP Cloud Foundry API
cf login -a https://api.cf.eu10.hana.ondemand.com

# Step 2: Target your Organization and Space
cf target -o my-btp-org -s dev

# Step 3: Deploy the MTA archive
cf deploy mta_archives/amazon-clone_1.0.0.mtar
\`\`\`

The Cloud Foundry deployer reads \`mta.yaml\`, automatically creates all service instances (XSUAA, HDI Container, Destination Service), deploys the database schema, launches the Node.js backend, and uploads the HTML5 applications into the SAP BTP HTML5 Repository.
`;
