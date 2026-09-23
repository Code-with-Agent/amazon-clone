import cds from '@sap/cds';

export default class AdminService extends cds.ApplicationService {
    async init() {
        const {
            Orders, OrderItems, Shipments, OrderStatusHistories, Reviews, Sellers,
            ProductVariants, ProductOffers, Inventories
        } = cds.entities('sap.marketplace');

        // -------------------------------------------------------------
        // AFTER READ: Products (compute price, stock, active, criticality)
        // -------------------------------------------------------------
        this.after('READ', 'Products', async (products, req) => {
            if (!products) return;
            const aProducts = Array.isArray(products) ? products : [products];
            if (aProducts.length === 0) return;

            const productIds = aProducts.map(p => p.ID).filter(Boolean);
            if (productIds.length === 0) return;

            const tx = req ? cds.tx(req) : cds;
            const variants = await tx.run(
                SELECT.from(ProductVariants).where({ product_ID: { in: productIds } })
            );
            const variantIds = variants.map(v => v.ID);

            let offers = [];
            let invs = [];
            if (variantIds.length > 0) {
                offers = await tx.run(
                    SELECT.from(ProductOffers).where({ variant_ID: { in: variantIds }, isActive: true })
                );
                invs = await tx.run(
                    SELECT.from(Inventories).where({ variant_ID: { in: variantIds } })
                );
            }

            for (const p of aProducts) {
                const prodVariants = variants.filter(v => v.product_ID === p.ID);
                const prodVariantIds = new Set(prodVariants.map(v => v.ID));

                const prodOffers = offers.filter(o => prodVariantIds.has(o.variant_ID));
                if (prodOffers.length > 0) {
                    const minPrice = Math.min(...prodOffers.map(o => Number(o.price)));
                    p.price = isFinite(minPrice) ? minPrice : 0;
                } else {
                    p.price = 0;
                }

                const prodInvs = invs.filter(i => prodVariantIds.has(i.variant_ID));
                let totalAvailable = 0;
                for (const inv of prodInvs) {
                    totalAvailable += Math.max(0, (inv.quantityOnHand || 0) - (inv.quantityReserved || 0));
                }
                p.stock = totalAvailable;
                p.active = p.status === 'ACTIVE';

                if (p.stock <= 0) {
                    p.stockCriticality = 1;
                } else if (p.stock <= 10) {
                    p.stockCriticality = 2;
                } else {
                    p.stockCriticality = 3;
                }

                if (p.status === 'ACTIVE') {
                    p.productStatusCriticality = 3;
                } else if (p.status === 'DRAFT') {
                    p.productStatusCriticality = 2;
                } else if (p.status === 'DISCONTINUED') {
                    p.productStatusCriticality = 1;
                } else {
                    p.productStatusCriticality = 0;
                }
            }
        });

        // -------------------------------------------------------------
        // AFTER READ: Inventories (compute available, reserved, status, criticality)
        // -------------------------------------------------------------
        this.after('READ', 'Inventories', (inventories) => {
            if (!inventories) return;
            const aInvs = Array.isArray(inventories) ? inventories : [inventories];
            for (const item of aInvs) {
                const onHand = Number(item.quantityOnHand || 0);
                const reserved = Number(item.quantityReserved || 0);
                const threshold = Number(item.reorderThreshold || 10);
                const available = Math.max(0, onHand - reserved);

                item.availableQuantity = available;
                item.reservedQuantity = reserved;

                if (available <= 0) {
                    item.stockStatus = 'OUT_OF_STOCK';
                    item.criticality = 1;
                } else if (available <= threshold) {
                    item.stockStatus = 'LOW_STOCK';
                    item.criticality = 2;
                } else {
                    item.stockStatus = 'IN_STOCK';
                    item.criticality = 3;
                }
            }
        });

        // -------------------------------------------------------------
        // AFTER READ: Orders (criticality for status, payment, shipping)
        // -------------------------------------------------------------
        this.after('READ', 'Orders', (orders) => {
            if (!orders) return;
            const aOrders = Array.isArray(orders) ? orders : [orders];
            for (const o of aOrders) {
                if (['DELIVERED'].includes(o.status)) o.orderCriticality = 3;
                else if (['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status)) o.orderCriticality = 2;
                else if (['CANCELLED', 'RETURNED', 'PAYMENT_FAILED'].includes(o.status)) o.orderCriticality = 1;
                else o.orderCriticality = 0;

                o.orderStatusCriticality = o.orderCriticality;

                if (o.paymentStatus === 'PAID') o.paymentCriticality = 3;
                else if (o.paymentStatus === 'AUTHORIZED') o.paymentCriticality = 2;
                else if (['FAILED', 'REFUNDED'].includes(o.paymentStatus)) o.paymentCriticality = 1;
                else o.paymentCriticality = 0;

                o.paymentStatusCriticality = o.paymentCriticality;

                if (o.fulfillmentStatus === 'FULFILLED') o.fulfillmentCriticality = 3;
                else if (o.fulfillmentStatus === 'PARTIAL') o.fulfillmentCriticality = 2;
                else if (o.fulfillmentStatus === 'RETURNED') o.fulfillmentCriticality = 1;
                else o.fulfillmentCriticality = 0;
            }
        });

        // -------------------------------------------------------------
        // VALUE HELP HANDLERS FOR STATUSES & BRANDS
        // -------------------------------------------------------------
        this.on('READ', 'Brands', async (req) => {
            const { Products: dbProducts } = cds.entities('sap.marketplace');
            const tx = req ? cds.tx(req) : cds;
            const prods = await tx.run(SELECT.from(dbProducts).columns('brand'));
            const uniqueBrands = [...new Set(prods.map(p => p.brand).filter(Boolean))];
            return uniqueBrands.map(b => ({ brand: b }));
        });

        this.on('READ', 'OrderStatuses', () => [
            { code: 'PENDING_PAYMENT', name: 'Pending Payment', criticality: 0 },
            { code: 'CONFIRMED', name: 'Confirmed', criticality: 2 },
            { code: 'PROCESSING', name: 'Processing', criticality: 2 },
            { code: 'SHIPPED', name: 'Shipped', criticality: 2 },
            { code: 'DELIVERED', name: 'Delivered', criticality: 3 },
            { code: 'CANCELLED', name: 'Cancelled', criticality: 1 },
            { code: 'RETURNED', name: 'Returned', criticality: 1 },
            { code: 'PAYMENT_FAILED', name: 'Payment Failed', criticality: 1 }
        ]);

        this.on('READ', 'PaymentStatuses', () => [
            { code: 'UNPAID', name: 'Unpaid', criticality: 0 },
            { code: 'AUTHORIZED', name: 'Authorized', criticality: 2 },
            { code: 'PAID', name: 'Paid', criticality: 3 },
            { code: 'FAILED', name: 'Failed', criticality: 1 },
            { code: 'REFUNDED', name: 'Refunded', criticality: 1 }
        ]);

        this.on('READ', 'ProductStatuses', () => [
            { code: 'DRAFT', name: 'Draft', criticality: 2 },
            { code: 'ACTIVE', name: 'Active', criticality: 3 },
            { code: 'DISCONTINUED', name: 'Discontinued', criticality: 1 }
        ]);

        // -------------------------------------------------------------
        // AFTER READ: Customers, Reviews, Sellers, Payments, Shipments
        // -------------------------------------------------------------
        this.after('READ', 'Customers', (customers) => {
            if (!customers) return;
            const aCusts = Array.isArray(customers) ? customers : [customers];
            for (const c of aCusts) {
                if (c.status === 'ACTIVE') c.statusCriticality = 3;
                else if (c.status === 'SUSPENDED') c.statusCriticality = 2;
                else if (c.status === 'LOCKED') c.statusCriticality = 1;
                else c.statusCriticality = 0;
            }
        });

        this.after('READ', 'Reviews', (reviews) => {
            if (!reviews) return;
            const aRevs = Array.isArray(reviews) ? reviews : [reviews];
            for (const r of aRevs) {
                if (r.status === 'APPROVED') r.statusCriticality = 3;
                else if (r.status === 'PENDING_MODERATION') r.statusCriticality = 2;
                else if (r.status === 'REJECTED') r.statusCriticality = 1;
                else r.statusCriticality = 0;
            }
        });

        this.after('READ', 'Sellers', (sellers) => {
            if (!sellers) return;
            const aSellers = Array.isArray(sellers) ? sellers : [sellers];
            for (const s of aSellers) {
                if (s.status === 'APPROVED') s.statusCriticality = 3;
                else if (s.status === 'PENDING') s.statusCriticality = 2;
                else if (s.status === 'SUSPENDED') s.statusCriticality = 1;
                else s.statusCriticality = 0;
            }
        });

        this.after('READ', 'Payments', (payments) => {
            if (!payments) return;
            const aPays = Array.isArray(payments) ? payments : [payments];
            for (const p of aPays) {
                if (p.status === 'CAPTURED') p.statusCriticality = 3;
                else if (p.status === 'AUTHORIZED') p.statusCriticality = 2;
                else if (['FAILED', 'REFUNDED'].includes(p.status)) p.statusCriticality = 1;
                else p.statusCriticality = 0;
            }
        });

        this.after('READ', 'Shipments', (shipments) => {
            if (!shipments) return;
            const aShips = Array.isArray(shipments) ? shipments : [shipments];
            for (const s of aShips) {
                if (s.status === 'DELIVERED') s.statusCriticality = 3;
                else if (['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status)) s.statusCriticality = 2;
                else if (s.status === 'RETURNED') s.statusCriticality = 1;
                else s.statusCriticality = 0;
            }
        });

        // -------------------------------------------------------------
        // ACTION: fulfillShipment
        // -------------------------------------------------------------
        this.on('fulfillShipment', async (req) => {
            const { order_ID, carrier, trackingNumber } = req.data;
            if (!order_ID) return req.reject(400, 'Order ID is required');

            const tx = cds.tx(req);
            const order = await tx.run(SELECT.one.from(Orders).where({ ID: order_ID }));
            if (!order) return req.reject(404, 'Order not found');

            const chosenCarrier = carrier || 'DHL_EXPRESS';
            const trackingNum = trackingNumber || `TRACK-${Date.now()}`;
            const trackingUrl = `https://track.mockcarrier.com/?num=${trackingNum}`;

            const shipment = {
                ID: cds.utils.uuid(),
                order_ID: order_ID,
                warehouse_ID: null,
                carrier: chosenCarrier,
                trackingNumber: trackingNum,
                trackingUrl: trackingUrl,
                status: 'DISPATCHED',
                shippedAt: new Date().toISOString(),
                deliveredAt: null
            };

            await tx.run(INSERT.into(Shipments).entries(shipment));

            // Update order and item statuses
            await tx.run(
                UPDATE(Orders, order_ID).with({
                    status: 'SHIPPED',
                    fulfillmentStatus: 'FULFILLED'
                })
            );

            await tx.run(
                UPDATE(OrderItems).where({ order_ID: order_ID }).with({ status: 'SHIPPED' })
            );

            // Audit history
            const userAttrId = req.user?.attr?.id || req.user?.id || 'admin';
            await tx.run(
                INSERT.into(OrderStatusHistories).entries({
                    ID: cds.utils.uuid(),
                    order_ID: order_ID,
                    oldStatus: order.status,
                    newStatus: 'SHIPPED',
                    changedAt: new Date().toISOString(),
                    changedBy: userAttrId,
                    notes: `Dispatched via ${chosenCarrier} (${trackingNum})`
                })
            );

            return shipment;
        });

        // -------------------------------------------------------------
        // ACTION: updateShipmentStatus
        // -------------------------------------------------------------
        this.on('updateShipmentStatus', async (req) => {
            const { shipment_ID, status } = req.data;
            if (!shipment_ID || !status) return req.reject(400, 'Shipment ID and status are required');

            const tx = cds.tx(req);
            const shipment = await tx.run(SELECT.one.from(Shipments).where({ ID: shipment_ID }));
            if (!shipment) return req.reject(404, 'Shipment not found');

            const updateData = { status: status };
            if (status === 'DELIVERED') {
                updateData.deliveredAt = new Date().toISOString();
                await tx.run(
                    UPDATE(Orders, shipment.order_ID).with({ status: 'DELIVERED' })
                );
                await tx.run(
                    UPDATE(OrderItems).where({ order_ID: shipment.order_ID }).with({ status: 'DELIVERED' })
                );
            }

            await tx.run(UPDATE(Shipments, shipment_ID).with(updateData));
            return await tx.run(SELECT.one.from(Shipments).where({ ID: shipment_ID }));
        });

        // -------------------------------------------------------------
        // ACTION: moderateReview
        // -------------------------------------------------------------
        this.on('moderateReview', async (req) => {
            const { review_ID, status } = req.data;
            if (!review_ID || !['APPROVED', 'REJECTED'].includes(status)) {
                return req.reject(400, "Review ID and valid status ('APPROVED' or 'REJECTED') are required");
            }

            const tx = cds.tx(req);
            const review = await tx.run(SELECT.one.from(Reviews).where({ ID: review_ID }));
            if (!review) return req.reject(404, 'Review not found');

            await tx.run(UPDATE(Reviews, review_ID).with({ status: status }));
            return await tx.run(SELECT.one.from(Reviews).where({ ID: review_ID }));
        });

        // -------------------------------------------------------------
        // ACTION: approveSeller
        // -------------------------------------------------------------
        this.on('approveSeller', async (req) => {
            const { seller_ID } = req.data;
            if (!seller_ID) return req.reject(400, 'Seller ID is required');

            const tx = cds.tx(req);
            const seller = await tx.run(SELECT.one.from(Sellers).where({ ID: seller_ID }));
            if (!seller) return req.reject(404, 'Seller not found');

            await tx.run(UPDATE(Sellers, seller_ID).with({ status: 'APPROVED' }));
            return await tx.run(SELECT.one.from(Sellers).where({ ID: seller_ID }));
        });

        return super.init();
    }
}
