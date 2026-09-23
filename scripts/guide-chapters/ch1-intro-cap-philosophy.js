export const ch1 = `
# Chapter 1: Introduction to SAP CAP & Project Architecture

## 1.1 Executive Summary & Mission
Welcome to the engineering documentation and learning guide for the **Aura Enterprise Marketplace** (Amazon Clone). This application is a production-grade, multi-tenant ready, full-stack enterprise e-commerce platform built natively with the **SAP Cloud Application Programming Model (CAP)**, **OData V4**, **SAPUI5 Freestyle**, **SAP Fiori Elements**, and **SAP BTP XSUAA**.

As a junior developer joining our engineering team, you may be familiar with general web frameworks such as Node.js/Express, React, or Python/Django. SAP CAP introduces an enterprise-grade paradigm known as **Domain-Driven, Metadata-Driven Development**. Rather than manually writing hundreds of boilerplate REST controllers, SQL migrations, and UI binding plumbing, CAP allows us to define our domain models once in **Core Data Services (CDS)**, and the framework automatically generates database tables, OData V4 services, and UI annotations.

This guide is designed as both an architectural reference for this specific application and a comprehensive tutorial on SAP CAP. Every core concept is explained in detail with direct references to the actual code in our repository.

---

## 1.2 What is the SAP Cloud Application Programming Model (CAP)?

The **SAP Cloud Application Programming Model (CAP)** is an opinionated framework of languages, libraries, and tools for building enterprise-grade cloud services and applications. It is officially supported by SAP in two flavors: **Node.js** (JavaScript/TypeScript) and **Java**. Our application is built with **Node.js (v20+)** using ECMAScript modules (\`"type": "module"\`).

### Why SAP CAP?
In traditional full-stack development, building an enterprise marketplace requires:
1. Writing database schemas (PostgreSQL / MySQL / Oracle DDL).
2. Writing database migrations for schema evolution.
3. Writing ORM models (Prisma, TypeORM, Hibernate) with duplicate field definitions.
4. Writing REST controllers and handling pagination (\`$top\`, \`$skip\`), filtering, sorting, and nested expansions manually.
5. Implementing authentication, JWT parsing, and role-based authorization in custom middleware.
6. Writing custom frontend data-fetching hooks and state management.

**CAP eliminates this redundant boilerplate through 4 Core Pillars:**

1. **Domain-Driven Design (DDD):** Everything starts with the domain model in \`db/schema.cds\`. Business entities, relationships, validations, and constraints are declared in human-readable CDS syntax.
2. **Platform & Database Agnostic:** In local development, our app runs on **SQLite** for ultra-fast startup with zero cloud dependencies. In production on SAP BTP, the exact same code runs on **SAP HANA Cloud** without changing a single line of application logic.
3. **Golden Paths & Out-of-the-Box Enterprise Features:**
   * Automatic OData V4 protocol support (batch processing, \`$expand\`, \`$filter\`, \`$select\`, \`$orderby\`, \`$count\`).
   * Built-in transaction management (\`cds.tx\`).
   * Built-in authentication & authorization via SAP BTP XSUAA.
   * Built-in draft handling (for complex UI editing).
   * Built-in audit logging and temporal data handling.
4. **Metadata-Driven UI (Fiori Elements):** CAP compiles CDS annotations directly into OData V4 annotations that render rich Fiori Elements user interfaces without writing a single line of frontend JavaScript.

---

## 1.3 Project Directory Structure Breakdown

Let us examine the exact file structure of our repository:

\`\`\`
amazon-clone/
├── .vscode/               # Recommended IDE extensions, launch configs & tasks
├── app/                   # Frontend Applications
│   ├── admin-ui/          # Backoffice Management App (SAP Fiori Elements)
│   │   ├── annotations.cds # CDS UI annotations driving List Reports & Object Pages
│   │   ├── package.json   # UI5 dependencies & scripts
│   │   └── webapp/        # Fiori Elements manifest, Component, and custom extensions
│   ├── shop-ui/           # Customer Storefront (SAPUI5 Freestyle)
│   │   ├── webapp/        # XML views, Controllers, Fragments, Formatters, CSS
│   │   ├── package.json   # UI5 tooling configuration
│   │   └── ui5.yaml       # SAPUI5 build tooling descriptor
│   ├── index.html         # Launchpad entry point for local preview
│   └── services.cds       # Aggregation file importing all UI annotations
├── db/                    # Database Domain Layer
│   ├── data/              # Initial seed data (.csv files per entity)
│   └── schema.cds         # Core domain model definitions (CDS)
├── docs/                  # Engineering Guides, API reference, Architecture docs
├── srv/                   # Business Services & Custom Handlers Layer
│   ├── admin-service.cds  # Backoffice admin service definition
│   ├── admin-service.js   # Backoffice admin business logic
│   ├── cart-service.cds   # Shopping cart service definition
│   ├── cart-service.js    # Cart calculation, items manipulation & coupon logic
│   ├── catalog-service.cds# Public catalog service definition
│   ├── catalog-service.js # Catalog search, filtering, and recommendations
│   ├── customer-service.cds # Customer profile, addresses & wishlist definition
│   ├── customer-service.js # Customer authorization & profile handlers
│   ├── inventory-service.cds # Warehouse inventory service definition
│   ├── inventory-service.js # Inventory reservations & stock syncing
│   ├── order-service.cds  # Order management service definition
│   ├── order-service.js   # 18-step checkout orchestration & cancellations
│   ├── payment-service.cds # Payment processing service definition
│   ├── payment-service.js # Payment gateway simulation & refunds
│   └── server.js          # Custom CAP server bootstrap (CORS, Swagger, Mock Auth)
├── test/                  # Automated Test Suite (136 tests across 9 suites)
├── scripts/               # Automation scripts (UI packaging, MTA building)
├── mta.yaml               # SAP BTP Cloud Foundry Multitarget Application descriptor
├── xs-security.json       # XSUAA security configuration (Scopes & Role Templates)
├── package.json           # Node.js dependencies, npm scripts, CAP configurations
└── eslint.config.mjs      # Code style & CDS linter configuration
\`\`\`

---

## 1.4 How the CAP Compiler Works Under the Hood

When you execute \`cds watch\` or \`cds build\`, the CAP compiler executes three key transformations:

\`\`\`
                     +--------------------+
                     |    db/schema.cds   |
                     |   (Domain Model)   |
                     +---------+----------+
                               |
                               v
                     +--------------------+
                     |  CDS Compiler (@sap/cds)
                     +---------+----------+
                               |
            +------------------+------------------+
            |                                     |
            v                                     v
  +--------------------+               +--------------------+
  |      SQL DDL       |               |    CSN / EDMX      |
  | (SQLite / HANA)    |               |  (OData Metadata)  |
  +--------------------+               +--------------------+
            |                                     |
            v                                     v
  +--------------------+               +--------------------+
  | Database Tables,   |               | REST / OData V4    |
  | Views, Foreign Keys|               | Endpoints & Schema |
  +--------------------+               +--------------------+
\`\`\`

1. **Schema to SQL Translation:** \`db/schema.cds\` is compiled into relational database tables and foreign key constraints. In SQLite, it creates SQLite DDL; in SAP HANA, it creates CDS artifacts deployed via the HDI Deployer (\`.hdbcds\` / \`.hdbtable\`).
2. **Projections to Views:** Service entities defined in \`srv/*.cds\` are compiled into SQL database views (e.g. \`CatalogService_Products\` view) or query rewrites.
3. **Services to OData V4:** Each \`service\` in CDS automatically becomes a fully functional OData V4 HTTP endpoint serving \`$metadata\` (EDMX XML schema) and JSON payloads.
`;
