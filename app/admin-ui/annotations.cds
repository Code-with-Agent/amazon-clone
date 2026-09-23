using AdminService as service from '../../srv/admin-service';

/* =========================================================================
 * 1. VALUE HELP ANNOTATIONS (Common.ValueList)
 * ========================================================================= */
annotate service.Products with {
    // Value Help: Category
    category @(
        Common.Label : 'Category',
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'Categories',
            Label          : 'Product Categories',
            Parameters     : [
                {
                    $Type             : 'Common.ValueListParameterInOut',
                    LocalDataProperty : category_ID,
                    ValueListProperty : 'ID'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'name'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'code'
                }
            ]
        }
    );

    // Value Help: Brand
    brand @(
        Common.Label : 'Brand',
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'Brands',
            Label          : 'Available Brands',
            Parameters     : [
                {
                    $Type             : 'Common.ValueListParameterInOut',
                    LocalDataProperty : brand,
                    ValueListProperty : 'brand'
                }
            ]
        }
    );

    // Value Help: Product Status
    status @(
        Common.Label : 'Catalog Status',
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'ProductStatuses',
            Label          : 'Product Lifecycle Statuses',
            Parameters     : [
                {
                    $Type             : 'Common.ValueListParameterInOut',
                    LocalDataProperty : status,
                    ValueListProperty : 'code'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'name'
                }
            ]
        }
    );
};

annotate service.Orders with {
    // Value Help: Customer
    customer @(
        Common.Label : 'Customer',
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'Customers',
            Label          : 'Customers',
            Parameters     : [
                {
                    $Type             : 'Common.ValueListParameterInOut',
                    LocalDataProperty : customer_ID,
                    ValueListProperty : 'ID'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'email'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'firstName'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'lastName'
                }
            ]
        }
    );

    // Value Help: Order Status
    status @(
        Common.Label : 'Order Status',
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'OrderStatuses',
            Label          : 'Order Statuses',
            Parameters     : [
                {
                    $Type             : 'Common.ValueListParameterInOut',
                    LocalDataProperty : status,
                    ValueListProperty : 'code'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'name'
                }
            ]
        }
    );

    // Value Help: Payment Status
    paymentStatus @(
        Common.Label : 'Payment Status',
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'PaymentStatuses',
            Label          : 'Payment Statuses',
            Parameters     : [
                {
                    $Type             : 'Common.ValueListParameterInOut',
                    LocalDataProperty : paymentStatus,
                    ValueListProperty : 'code'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'name'
                }
            ]
        }
    );
};

annotate service.Inventories with {
    // Value Help: Warehouse
    warehouse @(
        Common.Label : 'Warehouse',
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'Warehouses',
            Label          : 'Warehouses',
            Parameters     : [
                {
                    $Type             : 'Common.ValueListParameterInOut',
                    LocalDataProperty : warehouse_ID,
                    ValueListProperty : 'ID'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'name'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'code'
                }
            ]
        }
    );
};

annotate service.ProductOffers with {
    // Value Help: Seller
    seller @(
        Common.Label : 'Merchant Partner',
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'Sellers',
            Label          : 'Approved Merchants',
            Parameters     : [
                {
                    $Type             : 'Common.ValueListParameterInOut',
                    LocalDataProperty : seller_ID,
                    ValueListProperty : 'ID'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'storeName'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'contactEmail'
                }
            ]
        }
    );
};

/* =========================================================================
 * 2. PRODUCT MANAGEMENT ANNOTATIONS
 * ========================================================================= */
annotate service.Products with @(
    // UI.HeaderInfo
    UI.HeaderInfo : {
        TypeName       : 'Product',
        TypeNamePlural : 'Products',
        Title          : { Value : title },
        Description    : { Value : sku }
    },

    // UI.Identification
    UI.Identification : [
        { Value : title },
        { Value : sku }
    ],

    // UI.SelectionFields
    UI.SelectionFields : [
        category_ID,
        brand,
        status,
        isFeatured
    ],

    // UI.PresentationVariant
    UI.PresentationVariant #Default : {
        SortOrder      : [
            { Property : title, Descending : false }
        ],
        Visualizations : [ '@UI.LineItem' ]
    },

    // UI.Chart (Stock Distribution by Brand)
    UI.Chart #StockByBrand : {
        $Type       : 'UI.ChartDefinitionType',
        Title       : 'Available Units by Brand',
        ChartType   : #Column,
        Dimensions  : [ brand ],
        Measures    : [ stock ]
    },

    // UI.LineItem (Product Name, SKU, Category, Brand, Price, Stock, Rating, Status)
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : title,
            Label : 'Product Name'
        },
        {
            $Type : 'UI.DataField',
            Value : sku,
            Label : 'SKU'
        },
        {
            $Type : 'UI.DataField',
            Value : category.name,
            Label : 'Category'
        },
        {
            $Type : 'UI.DataField',
            Value : brand,
            Label : 'Brand'
        },
        {
            $Type : 'UI.DataField',
            Value : price,
            Label : 'Price'
        },
        {
            $Type       : 'UI.DataField',
            Value       : stock,
            Label       : 'Stock',
            Criticality : stockCriticality
        },
        {
            $Type : 'UI.DataField',
            Value : averageRating,
            Label : 'Rating'
        },
        {
            $Type       : 'UI.DataField',
            Value       : status,
            Label       : 'Status',
            Criticality : productStatusCriticality
        }
    ],

    // UI.HeaderFacets & DataPoints
    UI.HeaderFacets : [
        { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#ProductPrice' },
        { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#ProductStock' },
        { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#ProductRating' },
        { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#ProductStatus' }
    ],

    UI.DataPoint #ProductPrice : {
        Value : price,
        Title : 'BuyBox Price'
    },
    UI.DataPoint #ProductStock : {
        Value       : stock,
        Title       : 'Available Stock',
        Criticality : stockCriticality
    },
    UI.DataPoint #ProductRating : {
        Value : averageRating,
        Title : 'Rating'
    },
    UI.DataPoint #ProductStatus : {
        Value       : status,
        Title       : 'Catalog Status',
        Criticality : productStatusCriticality
    },

    // UI.Facets (General Information, Pricing, Inventory, Variants, Images, Offers, Reviews)
    UI.Facets : [
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'GeneralInformationFacet',
            Label  : 'General Information',
            Facets : [
                {
                    $Type  : 'UI.ReferenceFacet',
                    Label  : 'Product Specifications',
                    Target : '@UI.FieldGroup#GeneralInformation'
                }
            ]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'PricingFacet',
            Label  : 'Pricing',
            Facets : [
                {
                    $Type  : 'UI.ReferenceFacet',
                    Label  : 'Commercial Margins & Fees',
                    Target : '@UI.FieldGroup#Pricing'
                }
            ]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'InventoryFacet',
            Label  : 'Inventory',
            Facets : [
                {
                    $Type  : 'UI.ReferenceFacet',
                    Label  : 'Stock Allocation Summary',
                    Target : '@UI.FieldGroup#Inventory'
                }
            ]
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'VariantsFacet',
            Label  : 'Variants',
            Target : 'variants/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ImagesFacet',
            Label  : 'Images',
            Target : 'images/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'OffersFacet',
            Label  : 'Offers',
            Target : 'offers/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ReviewsFacet',
            Label  : 'Reviews',
            Target : 'reviews/@UI.LineItem'
        }
    ],

    // UI.FieldGroup definitions
    UI.FieldGroup #GeneralInformation : {
        Data : [
            { Value : sku, Label : 'SKU' },
            { Value : title, Label : 'Product Name' },
            { Value : brand, Label : 'Brand' },
            { Value : category_ID, Label : 'Category' },
            { Value : status, Label : 'Status', Criticality : productStatusCriticality },
            { Value : isFeatured, Label : 'Featured Showcase' },
            { Value : description, Label : 'Full Product Description' }
        ]
    },

    UI.FieldGroup #Pricing : {
        Data : [
            { Value : price, Label : 'Current BuyBox Price' },
            { Value : averageRating, Label : 'Average Customer Rating' },
            { Value : reviewCount, Label : 'Verified Reviews Count' }
        ]
    },

    UI.FieldGroup #Inventory : {
        Data : [
            { Value : stock, Label : 'Total Available Units Across Warehouses', Criticality : stockCriticality },
            { Value : active, Label : 'Catalog Purchasable' }
        ]
    }
);

annotate service.ProductVariants with @(
    UI.LineItem : [
        { Value : variantSku, Label : 'Variant SKU' },
        { Value : gtinEan, Label : 'GTIN/EAN' },
        { Value : attributes, Label : 'Attributes' },
        { Value : weightKg, Label : 'Weight (kg)' },
        { Value : dimensionsCm, Label : 'Dimensions' },
        { Value : isActive, Label : 'Active' }
    ]
);

annotate service.ProductImages with @(
    UI.LineItem : [
        { Value : mediaUrl, Label : 'Image Preview URL' },
        { Value : altText, Label : 'Alt Text' },
        { Value : displayOrder, Label : 'Display Order' },
        { Value : isHero, Label : 'Hero Image' }
    ]
);

/* =========================================================================
 * 3. ORDER MANAGEMENT ANNOTATIONS
 * ========================================================================= */
annotate service.Orders with @(
    UI.HeaderInfo : {
        TypeName       : 'Order',
        TypeNamePlural : 'Orders',
        Title          : { Value : orderNumber },
        Description    : { Value : status }
    },

    UI.Identification : [
        { Value : orderNumber }
    ],

    UI.SelectionFields : [
        orderNumber,
        status,
        paymentStatus,
        fulfillmentStatus,
        createdAt
    ],

    UI.PresentationVariant #Default : {
        SortOrder      : [
            { Property : createdAt, Descending : true }
        ],
        Visualizations : [ '@UI.LineItem' ]
    },

    UI.Chart #OrdersByStatus : {
        $Type       : 'UI.ChartDefinitionType',
        Title       : 'Order Distribution by Status',
        ChartType   : #Donut,
        Dimensions  : [ status ],
        Measures    : [ totalAmount ]
    },

    UI.LineItem : [
        { Value : orderNumber, Label : 'Order Number' },
        { Value : customer.email, Label : 'Customer' },
        { Value : createdAt, Label : 'Date' },
        { Value : totalAmount, Label : 'Amount' },
        { Value : paymentStatus, Label : 'Payment Status', Criticality : paymentStatusCriticality },
        { Value : fulfillmentStatus, Label : 'Shipping Status', Criticality : fulfillmentCriticality },
        { Value : status, Label : 'Order Status', Criticality : orderStatusCriticality }
    ],

    UI.HeaderFacets : [
        { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#OrderTotal' },
        { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#OrderStatus' },
        { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#OrderPayment' },
        { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#OrderShipping' }
    ],

    UI.DataPoint #OrderTotal : {
        Value : totalAmount,
        Title : 'Total Amount'
    },
    UI.DataPoint #OrderStatus : {
        Value       : status,
        Title       : 'Order Status',
        Criticality : orderStatusCriticality
    },
    UI.DataPoint #OrderPayment : {
        Value       : paymentStatus,
        Title       : 'Payment Status',
        Criticality : paymentStatusCriticality
    },
    UI.DataPoint #OrderShipping : {
        Value       : fulfillmentStatus,
        Title       : 'Shipping Status',
        Criticality : fulfillmentCriticality
    },

    UI.Facets : [
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'OrderHeaderFacet',
            Label  : 'Order Header',
            Facets : [
                { $Type : 'UI.ReferenceFacet', Label : 'Order Overview', Target : '@UI.FieldGroup#HeaderInfo' }
            ]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'CustomerFacet',
            Label  : 'Customer',
            Facets : [
                { $Type : 'UI.ReferenceFacet', Label : 'Customer Profile', Target : '@UI.FieldGroup#CustomerInfo' }
            ]
        },
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'AddressFacet',
            Label  : 'Address',
            Facets : [
                { $Type : 'UI.ReferenceFacet', Label : 'Shipping Destination', Target : '@UI.FieldGroup#AddressInfo' }
            ]
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ItemsFacet',
            Label  : 'Items',
            Target : 'items/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'PaymentFacet',
            Label  : 'Payment',
            Target : 'payment/@UI.FieldGroup#PaymentSummary'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ShipmentFacet',
            Label  : 'Shipment',
            Target : 'shipments/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'StatusHistoryFacet',
            Label  : 'Status History',
            Target : 'history/@UI.LineItem'
        }
    ],

    UI.FieldGroup #HeaderInfo : {
        Data : [
            { Value : orderNumber, Label : 'Order Number' },
            { Value : createdAt, Label : 'Created At' },
            { Value : status, Label : 'Order Status', Criticality : orderStatusCriticality },
            { Value : totalAmount, Label : 'Total Amount' },
            { Value : subtotal, Label : 'Subtotal' },
            { Value : discount, Label : 'Discount' },
            { Value : shippingCost, Label : 'Shipping Cost' },
            { Value : taxAmount, Label : 'Tax Amount' },
            { Value : cancellationReason, Label : 'Cancellation Reason' },
            { Value : rmaNumber, Label : 'RMA Number' },
            { Value : returnReason, Label : 'Return Reason' }
        ]
    },

    UI.FieldGroup #CustomerInfo : {
        Data : [
            { Value : customer.firstName, Label : 'First Name' },
            { Value : customer.lastName, Label : 'Last Name' },
            { Value : customer.email, Label : 'Email' },
            { Value : customer.phoneNumber, Label : 'Phone Number' }
        ]
    },

    UI.FieldGroup #AddressInfo : {
        Data : [
            { Value : shippingAddress.fullName, Label : 'Full Name' },
            { Value : shippingAddress.streetName, Label : 'Street' },
            { Value : shippingAddress.apartmentSuite, Label : 'Apartment/Suite' },
            { Value : shippingAddress.city, Label : 'City' },
            { Value : shippingAddress.stateProvince, Label : 'State/Province' },
            { Value : shippingAddress.postalCode, Label : 'Postal Code' },
            { Value : shippingAddress.country_code, Label : 'Country' }
        ]
    }
);

annotate service.OrderItems with @(
    UI.LineItem : [
        { Value : productTitle, Label : 'Product Name' },
        { Value : variantSku, Label : 'Variant SKU' },
        { Value : quantity, Label : 'Quantity' },
        { Value : unitPrice, Label : 'Unit Price' },
        { Value : lineTotal, Label : 'Line Total' },
        { Value : status, Label : 'Item Status' }
    ]
);

annotate service.OrderStatusHistories with @(
    UI.LineItem : [
        { Value : oldStatus, Label : 'From Status' },
        { Value : newStatus, Label : 'To Status' },
        { Value : changedAt, Label : 'Timestamp' },
        { Value : changedBy, Label : 'Operator' },
        { Value : notes, Label : 'Notes' }
    ]
);

/* =========================================================================
 * 4. INVENTORY MANAGEMENT ANNOTATIONS
 * ========================================================================= */
annotate service.Inventories with @(
    UI.HeaderInfo : {
        TypeName       : 'Inventory',
        TypeNamePlural : 'Inventory Stock',
        Title          : { Value : variant.variantSku },
        Description    : { Value : warehouse.name }
    },

    UI.Identification : [
        { Value : variant.variantSku }
    ],

    UI.SelectionFields : [
        warehouse_ID,
        stockStatus
    ],

    UI.PresentationVariant #Default : {
        SortOrder      : [
            { Property : availableQuantity, Descending : false }
        ],
        Visualizations : [ '@UI.LineItem' ]
    },

    UI.Chart #WarehouseStockChart : {
        $Type       : 'UI.ChartDefinitionType',
        Title       : 'Stock by Warehouse',
        ChartType   : #Bar,
        Dimensions  : [ warehouse_ID ],
        Measures    : [ availableQuantity ]
    },

    UI.LineItem : [
        { Value : variant.product.title, Label : 'Product' },
        { Value : warehouse.name, Label : 'Warehouse' },
        { Value : availableQuantity, Label : 'Available Quantity' },
        { Value : reservedQuantity, Label : 'Reserved Quantity' },
        { Value : reorderThreshold, Label : 'Reorder Level' },
        { Value : stockStatus, Label : 'Status', Criticality : criticality }
    ],

    UI.HeaderFacets : [
        { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#InvAvailable' },
        { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#InvReserved' },
        { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#InvHealth' }
    ],

    UI.DataPoint #InvAvailable : {
        Value : availableQuantity,
        Title : 'Available'
    },
    UI.DataPoint #InvReserved : {
        Value : reservedQuantity,
        Title : 'Reserved'
    },
    UI.DataPoint #InvHealth : {
        Value       : stockStatus,
        Title       : 'Health Status',
        Criticality : criticality
    },

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'InventoryDetailSection',
            Label  : 'Inventory Details',
            Target : '@UI.FieldGroup#InventoryDetails'
        }
    ],

    UI.FieldGroup #InventoryDetails : {
        Data : [
            { Value : variant.product.title, Label : 'Product' },
            { Value : variant.variantSku, Label : 'SKU' },
            { Value : warehouse.name, Label : 'Warehouse' },
            { Value : quantityOnHand, Label : 'Physical On Hand' },
            { Value : quantityReserved, Label : 'Reserved Quantity' },
            { Value : availableQuantity, Label : 'Available Quantity' },
            { Value : reorderThreshold, Label : 'Reorder Level' },
            { Value : stockStatus, Label : 'Status', Criticality : criticality }
        ]
    }
);

/* =========================================================================
 * 5. CUSTOMER MANAGEMENT ANNOTATIONS
 * ========================================================================= */
annotate service.Customers with @(
    UI.HeaderInfo : {
        TypeName       : 'Customer',
        TypeNamePlural : 'Customers',
        Title          : { Value : email },
        Description    : { Value : firstName }
    },

    UI.Identification : [
        { Value : email }
    ],

    UI.SelectionFields : [
        status,
        email,
        preferredLanguage
    ],

    UI.LineItem : [
        { Value : firstName, Label : 'First Name' },
        { Value : lastName, Label : 'Last Name' },
        { Value : email, Label : 'Email' },
        { Value : phoneNumber, Label : 'Phone' },
        { Value : createdAt, Label : 'Registration Date' },
        { Value : status, Label : 'Status', Criticality : statusCriticality }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.CollectionFacet',
            ID     : 'PersonalSection',
            Label  : 'Personal Information',
            Facets : [
                { $Type : 'UI.ReferenceFacet', Label : 'Personal Data', Target : '@UI.FieldGroup#Personal' }
            ]
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'AddressesSection',
            Label  : 'Addresses',
            Target : 'addresses/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'OrdersSection',
            Label  : 'Orders',
            Target : 'orders/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ReviewsSection',
            Label  : 'Reviews',
            Target : 'reviews/@UI.LineItem'
        }
    ],

    UI.FieldGroup #Personal : {
        Data : [
            { Value : firstName, Label : 'First Name' },
            { Value : lastName, Label : 'Last Name' },
            { Value : email, Label : 'Email' },
            { Value : phoneNumber, Label : 'Phone Number' },
            { Value : status, Label : 'Status', Criticality : statusCriticality },
            { Value : preferredCurrency_code, Label : 'Preferred Currency' },
            { Value : preferredLanguage, Label : 'Preferred Language' },
            { Value : isEmailVerified, Label : 'Email Verified' }
        ]
    }
);

annotate service.Addresses with @(
    UI.LineItem : [
        { Value : type, Label : 'Type' },
        { Value : fullName, Label : 'Name' },
        { Value : streetName, Label : 'Street' },
        { Value : city, Label : 'City' },
        { Value : stateProvince, Label : 'State' },
        { Value : postalCode, Label : 'Postal Code' },
        { Value : country_code, Label : 'Country' },
        { Value : isDefault, Label : 'Default' }
    ]
);

/* =========================================================================
 * 6. SELLER MANAGEMENT ANNOTATIONS
 * ========================================================================= */
annotate service.Sellers with @(
    UI.HeaderInfo : {
        TypeName       : 'Seller',
        TypeNamePlural : 'Sellers',
        Title          : { Value : storeName },
        Description    : { Value : contactEmail }
    },

    UI.Identification : [
        { Value : storeName }
    ],

    UI.SelectionFields : [
        status,
        rating
    ],

    UI.LineItem : [
        { Value : storeName, Label : 'Store Name' },
        { Value : legalEntity, Label : 'Legal Entity' },
        { Value : contactEmail, Label : 'Contact Email' },
        { Value : rating, Label : 'Rating' },
        { Value : commissionRate, Label : 'Commission Rate (%)' },
        { Value : status, Label : 'Status', Criticality : statusCriticality }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'SellerInfoSection',
            Label  : 'Seller Information',
            Target : '@UI.FieldGroup#SellerInfo'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'OffersSection',
            Label  : 'Active Offers',
            Target : 'offers/@UI.LineItem'
        }
    ],

    UI.FieldGroup #SellerInfo : {
        Data : [
            { Value : storeName, Label : 'Store Name' },
            { Value : legalEntity, Label : 'Legal Entity' },
            { Value : taxId, Label : 'Tax ID' },
            { Value : contactEmail, Label : 'Email' },
            { Value : rating, Label : 'Rating' },
            { Value : commissionRate, Label : 'Commission %' },
            { Value : status, Label : 'Status', Criticality : statusCriticality }
        ]
    }
);

annotate service.ProductOffers with @(
    UI.LineItem : [
        { Value : seller.storeName, Label : 'Seller Store' },
        { Value : variant.variantSku, Label : 'Variant SKU' },
        { Value : price, Label : 'Price' },
        { Value : originalPrice, Label : 'Original Price' },
        { Value : condition, Label : 'Condition' },
        { Value : isBuyBoxWinner, Label : 'BuyBox Winner' },
        { Value : isActive, Label : 'Active' }
    ]
);

/* =========================================================================
 * 7. PROMOTIONS & MARKETING ANNOTATIONS
 * ========================================================================= */
annotate service.Promotions with @(
    UI.HeaderInfo : {
        TypeName       : 'Promotion',
        TypeNamePlural : 'Promotions',
        Title          : { Value : name },
        Description    : { Value : code }
    },

    UI.Identification : [
        { Value : code }
    ],

    UI.SelectionFields : [
        discountType,
        isActive
    ],

    UI.LineItem : [
        { Value : code, Label : 'Code' },
        { Value : name, Label : 'Name' },
        { Value : description, Label : 'Description' },
        { Value : discountType, Label : 'Discount Type' },
        { Value : discountValue, Label : 'Discount Value' },
        { Value : startDate, Label : 'Start Date' },
        { Value : endDate, Label : 'End Date' },
        { Value : usageCount, Label : 'Redeemed' },
        { Value : usageLimit, Label : 'Limit' },
        { Value : isActive, Label : 'Active' }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'PromotionDetailsSection',
            Label  : 'Campaign Rules',
            Target : '@UI.FieldGroup#PromotionDetails'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'CouponsSection',
            Label  : 'Coupons',
            Target : 'coupons/@UI.LineItem'
        }
    ],

    UI.FieldGroup #PromotionDetails : {
        Data : [
            { Value : code, Label : 'Code' },
            { Value : name, Label : 'Name' },
            { Value : description, Label : 'Description' },
            { Value : discountType, Label : 'Discount Type' },
            { Value : discountValue, Label : 'Discount Value' },
            { Value : minimumOrderAmount, Label : 'Minimum Order' },
            { Value : startDate, Label : 'Start Date' },
            { Value : endDate, Label : 'End Date' },
            { Value : usageLimit, Label : 'Usage Limit' },
            { Value : usageCount, Label : 'Times Used' },
            { Value : isActive, Label : 'Active' }
        ]
    }
);

annotate service.Coupons with @(
    UI.LineItem : [
        { Value : code, Label : 'Coupon Code' },
        { Value : maxRedemptions, Label : 'Max Redemptions' },
        { Value : timesRedeemed, Label : 'Redeemed' },
        { Value : isActive, Label : 'Active' }
    ]
);

/* =========================================================================
 * 8. REVIEWS MODERATION ANNOTATIONS
 * ========================================================================= */
annotate service.Reviews with @(
    UI.HeaderInfo : {
        TypeName       : 'Review',
        TypeNamePlural : 'Customer Reviews',
        Title          : { Value : headline },
        Description    : { Value : customer.email }
    },

    UI.Identification : [
        { Value : headline }
    ],

    UI.SelectionFields : [
        status,
        rating,
        isVerifiedPurchase
    ],

    UI.LineItem : [
        { Value : product.title, Label : 'Product' },
        { Value : customer.email, Label : 'Customer' },
        { Value : rating, Label : 'Rating' },
        { Value : headline, Label : 'Headline' },
        { Value : isVerifiedPurchase, Label : 'Verified' },
        { Value : helpfulVotes, Label : 'Helpful' },
        { Value : status, Label : 'Status', Criticality : statusCriticality }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ReviewDetailSection',
            Label  : 'Review Details',
            Target : '@UI.FieldGroup#ReviewDetails'
        }
    ],

    UI.FieldGroup #ReviewDetails : {
        Data : [
            { Value : product.title, Label : 'Product' },
            { Value : customer.email, Label : 'Customer Email' },
            { Value : rating, Label : 'Rating' },
            { Value : headline, Label : 'Headline' },
            { Value : comment, Label : 'Comment' },
            { Value : isVerifiedPurchase, Label : 'Verified Purchase' },
            { Value : helpfulVotes, Label : 'Helpful Votes' },
            { Value : status, Label : 'Status', Criticality : statusCriticality }
        ]
    }
);

/* =========================================================================
 * 9. PAYMENTS ANNOTATIONS
 * ========================================================================= */
annotate service.Payments with @(
    UI.HeaderInfo : {
        TypeName       : 'Payment',
        TypeNamePlural : 'Payments',
        Title          : { Value : transactionReference },
        Description    : { Value : order.orderNumber }
    },

    UI.Identification : [
        { Value : transactionReference }
    ],

    UI.SelectionFields : [
        paymentMethod,
        status,
        paymentProvider
    ],

    UI.LineItem : [
        { Value : transactionReference, Label : 'Reference' },
        { Value : order.orderNumber, Label : 'Order' },
        { Value : paymentMethod, Label : 'Method' },
        { Value : amount, Label : 'Amount' },
        { Value : paymentProvider, Label : 'Provider' },
        { Value : status, Label : 'Status', Criticality : statusCriticality },
        { Value : createdAt, Label : 'Processed At' }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'PaymentSummarySection',
            Label  : 'Payment Details',
            Target : '@UI.FieldGroup#PaymentSummary'
        }
    ],

    UI.FieldGroup #PaymentSummary : {
        Data : [
            { Value : transactionReference, Label : 'Reference' },
            { Value : order.orderNumber, Label : 'Order Number' },
            { Value : paymentMethod, Label : 'Method' },
            { Value : paymentProvider, Label : 'Provider' },
            { Value : amount, Label : 'Amount' },
            { Value : currency_code, Label : 'Currency' },
            { Value : status, Label : 'Status', Criticality : statusCriticality },
            { Value : rawGatewayResponse, Label : 'Gateway Response' }
        ]
    }
);

/* =========================================================================
 * 10. SHIPMENTS ANNOTATIONS
 * ========================================================================= */
annotate service.Shipments with @(
    UI.HeaderInfo : {
        TypeName       : 'Shipment',
        TypeNamePlural : 'Shipments',
        Title          : { Value : trackingNumber },
        Description    : { Value : carrier }
    },

    UI.Identification : [
        { Value : trackingNumber }
    ],

    UI.SelectionFields : [
        status,
        carrier
    ],

    UI.LineItem : [
        { Value : trackingNumber, Label : 'Tracking #' },
        { Value : carrier, Label : 'Carrier' },
        { Value : order.orderNumber, Label : 'Order #' },
        { Value : warehouse.name, Label : 'Warehouse' },
        { Value : status, Label : 'Status', Criticality : statusCriticality },
        { Value : shippedAt, Label : 'Shipped At' },
        { Value : deliveredAt, Label : 'Delivered At' }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ShipmentDetailsSection',
            Label  : 'Shipment Consignment',
            Target : '@UI.FieldGroup#ShipmentDetails'
        }
    ],

    UI.FieldGroup #ShipmentDetails : {
        Data : [
            { Value : trackingNumber, Label : 'Tracking Number' },
            { Value : carrier, Label : 'Carrier' },
            { Value : trackingUrl, Label : 'Tracking URL' },
            { Value : status, Label : 'Status', Criticality : statusCriticality },
            { Value : shippedAt, Label : 'Shipped At' },
            { Value : deliveredAt, Label : 'Delivered At' }
        ]
    }
);
