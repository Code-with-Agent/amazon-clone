import cds from '@sap/cds';

export default class OrderService extends cds.ApplicationService {
    async init() {
        const {
            Orders, OrderItems, OrderStatusHistories, Carts, CartItems,
            Customers, Addresses, ProductOffers, ProductVariants, Products,
            Inventories, InventoryReservations, Coupons, Promotions, CouponUsages,
            Payments, Notifications
        } = cds.entities('sap.marketplace');

        // Helper: retrieve authenticated customer
        const getCustomer = async (tx, req) => {
            const userAttrId = req.user?.attr?.id || req.user?.attr?.customerId || req.user?.id;
            if (!userAttrId) return null;
            let customer = await tx.run(
                SELECT.one.from(Customers).where({ externalUserId: userAttrId })
            );
            if (!customer) {
                customer = await tx.run(
                    SELECT.one.from(Customers).where({ ID: userAttrId })
                );
            }
            return customer;
        };

        // -------------------------------------------------------------
        // ROW-LEVEL AUTHORIZATION: Orders (Customer & Seller data isolation)
        // -------------------------------------------------------------
        this.before('READ', 'Orders', async (req) => {
            if (req.user?.is?.('Customer') && !req.user?.is?.('OrderManager') && !req.user?.is?.('Administrator')) {
                const customer = await getCustomer(cds.tx(req), req);
                if (customer) {
                    req.query.where({ customer_ID: customer.ID });
                }
            } else if (req.user?.is?.('Seller') && !req.user?.is?.('OrderManager') && !req.user?.is?.('Administrator')) {
                const sellerId = req.user?.attr?.sellerId;
                if (sellerId) {
                    const sellerOrders = await cds.tx(req).run(
                        SELECT.from(OrderItems).columns('order_ID').where({ seller_ID: sellerId })
                    );
                    const orderIds = [...new Set(sellerOrders.map(o => o.order_ID))];
                    req.query.where({ ID: { in: orderIds.length > 0 ? orderIds : ['00000000-0000-0000-0000-000000000000'] } });
                }
            }
        });

        // -------------------------------------------------------------
        // ACTION: checkout (Comprehensive 18-Step Enterprise Flow)
        // -------------------------------------------------------------
        this.on('checkout', async (req) => {
            const {
                shippingAddress_ID,
                billingAddress_ID,
                paymentMethod,
                paymentToken,
                simulateOutcome
            } = req.data;

            const tx = cds.tx(req);
            const customer = await getCustomer(tx, req);
            if (!customer) return req.reject(401, 'Customer authentication profile not found');

            // Step 1: Validate cart
            const cart = await tx.run(
                SELECT.one.from(Carts).where({ customer_ID: customer.ID })
            );
            if (!cart) {
                return req.reject(400, 'Checkout failed: No active shopping cart found for customer');
            }

            // Step 2: Ensure cart contains items
            const cartItems = await tx.run(
                SELECT.from(CartItems).where({ cart_ID: cart.ID })
            );
            if (!cartItems || cartItems.length === 0) {
                return req.reject(400, 'Checkout failed: Shopping cart contains no items');
            }

            // Step 3: Validate all product prices & offer status
            let calculatedSubtotal = 0;
            const validatedLines = [];

            for (const item of cartItems) {
                const offer = await tx.run(
                    SELECT.one.from(ProductOffers).where({ ID: item.offer_ID, isActive: true })
                );
                if (!offer) {
                    return req.reject(
                        400,
                        `An item in your cart is no longer available from the seller (Offer ID: ${item.offer_ID})`
                    );
                }

                const variant = await tx.run(
                    SELECT.one.from(ProductVariants).where({ ID: offer.variant_ID, isActive: true })
                );
                if (!variant) {
                    return req.reject(400, 'Product variant in cart is no longer active');
                }

                const product = await tx.run(
                    SELECT.one.from(Products).where({ ID: variant.product_ID, status: 'ACTIVE' })
                );
                if (!product) {
                    return req.reject(400, 'Product in cart is no longer active');
                }

                const liveUnitPrice = Number(offer.price);
                const liveExtendedPrice = Number((item.quantity * liveUnitPrice).toFixed(2));
                calculatedSubtotal += liveExtendedPrice;

                validatedLines.push({
                    cartItem: item,
                    offer: offer,
                    variant: variant,
                    product: product,
                    quantity: item.quantity,
                    unitPrice: liveUnitPrice,
                    extendedPrice: liveExtendedPrice
                });
            }

            // Step 4: Validate inventory (Check available stock across all items)
            for (const line of validatedLines) {
                const stockRecords = await tx.run(
                    SELECT.from(Inventories).where({ variant_ID: line.variant.ID })
                );
                const totalAvailable = stockRecords.reduce(
                    (sum, s) => sum + Math.max(0, s.quantityOnHand - s.quantityReserved),
                    0
                );

                if (totalAvailable < line.quantity) {
                    return req.reject(
                        409,
                        `Insufficient stock for '${line.product.title}' (SKU: ${line.variant.variantSku}). Available: ${totalAvailable}, Requested: ${line.quantity}`
                    );
                }
            }

            // Step 5: Validate customer address
            let shipAddr = null;
            if (shippingAddress_ID) {
                shipAddr = await tx.run(
                    SELECT.one.from(Addresses).where({ ID: shippingAddress_ID, customer_ID: customer.ID })
                );
            }
            if (!shipAddr) {
                shipAddr = await tx.run(
                    SELECT.one.from(Addresses).where({ customer_ID: customer.ID, isDefault: true })
                ) || await tx.run(
                    SELECT.one.from(Addresses).where({ customer_ID: customer.ID })
                );
            }
            if (!shipAddr) {
                return req.reject(400, 'Valid shipping destination address is required');
            }
            if (!shipAddr.streetName || !shipAddr.city || !shipAddr.postalCode) {
                return req.reject(400, 'Shipping address is incomplete (street, city, or postal code missing)');
            }

            const billAddrId = billingAddress_ID || shipAddr.ID;

            // Step 6: Calculate subtotal
            const subtotal = Number(calculatedSubtotal.toFixed(2));

            // Step 7: Calculate promotion discount
            let discount = 0;
            if (cart.appliedCoupon_ID) {
                const coupon = await tx.run(
                    SELECT.one.from(Coupons).where({ ID: cart.appliedCoupon_ID, isActive: true })
                );
                if (coupon && coupon.currentRedemptions < coupon.maxRedemptions) {
                    const promo = await tx.run(
                        SELECT.one.from(Promotions).where({ ID: coupon.promotion_ID, isActive: true })
                    );
                    if (promo) {
                        const now = new Date();
                        if (new Date(promo.startDate) <= now && now <= new Date(promo.endDate)) {
                            if (!promo.minOrderValue || subtotal >= Number(promo.minOrderValue)) {
                                if (promo.discountType === 'PERCENTAGE') {
                                    discount = subtotal * (Number(promo.discountValue) / 100);
                                } else if (promo.discountType === 'FIXED_AMOUNT') {
                                    discount = Math.min(Number(promo.discountValue), subtotal);
                                }
                            }
                        }
                    }
                }
            }
            discount = Number(discount.toFixed(2));

            // Step 8: Calculate shipping
            const shippingCost = subtotal >= 50.00 || subtotal === 0 ? 0.00 : 9.99;

            // Step 9: Calculate tax (8% on taxable amount)
            const taxableAmount = Math.max(0, subtotal - discount);
            const taxAmount = Number((taxableAmount * 0.08).toFixed(2));

            // Step 10: Calculate grand total
            const grandTotal = Number((taxableAmount + shippingCost + taxAmount).toFixed(2));

            // Step 11: Reserve inventory (Atomic holds with 15-minute TTL)
            const orderId = cds.utils.uuid();
            const reservationIds = [];

            for (const line of validatedLines) {
                const stockRecords = await tx.run(
                    SELECT.from(Inventories)
                        .where({ variant_ID: line.variant.ID })
                        .orderBy('quantityOnHand desc')
                );

                let remainingToReserve = line.quantity;
                for (const inv of stockRecords) {
                    const availableInBin = inv.quantityOnHand - inv.quantityReserved;
                    if (availableInBin > 0) {
                        const reserveFromThisBin = Math.min(remainingToReserve, availableInBin);
                        await tx.run(
                            UPDATE(Inventories, inv.ID).with({
                                quantityReserved: inv.quantityReserved + reserveFromThisBin
                            })
                        );

                        const resId = cds.utils.uuid();
                        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

                        await tx.run(
                            INSERT.into(InventoryReservations).entries({
                                ID: resId,
                                inventory_ID: inv.ID,
                                order_ID: orderId,
                                quantity: reserveFromThisBin,
                                status: 'RESERVED',
                                expiresAt: expiresAt
                            })
                        );

                        reservationIds.push(resId);
                        remainingToReserve -= reserveFromThisBin;
                        if (remainingToReserve <= 0) break;
                    }
                }

                if (remainingToReserve > 0) {
                    return req.reject(
                        409,
                        `Concurrency conflict: Inventory could not be secured for '${line.product.title}'`
                    );
                }
            }

            // Step 12: Create Order with guaranteed unique orderNumber
            const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            let orderNumber;
            for (let attempt = 0; attempt < 20; attempt++) {
                const randomDigits = Math.floor(1000 + Math.random() * 9000);
                const candidate = `ORD-${todayStr}-${randomDigits}`;
                const existing = await tx.run(SELECT.one.from(Orders).where({ orderNumber: candidate }));
                if (!existing) {
                    orderNumber = candidate;
                    break;
                }
            }
            if (!orderNumber) {
                orderNumber = `ORD-${todayStr}-${Date.now().toString().slice(-4)}`;
            }

            const order = {
                ID: orderId,
                orderNumber: orderNumber,
                customer_ID: customer.ID,
                shippingAddress_ID: shipAddr.ID,
                billingAddress_ID: billAddrId,
                status: 'PENDING_PAYMENT',
                paymentStatus: 'UNPAID',
                fulfillmentStatus: 'UNFULFILLED',
                currency_code: cart.currency_code || 'USD',
                subtotal: subtotal.toFixed(2),
                discount: discount.toFixed(2),
                shippingCost: shippingCost.toFixed(2),
                taxAmount: taxAmount.toFixed(2),
                totalAmount: grandTotal.toFixed(2)
            };

            await tx.run(INSERT.into(Orders).entries(order));

            // Step 13: Create OrderItems using a snapshot of product name, SKU, price, tax
            for (const line of validatedLines) {
                const orderItem = {
                    ID: cds.utils.uuid(),
                    order_ID: orderId,
                    offer_ID: line.offer.ID,
                    seller_ID: line.offer.seller_ID,
                    variant_ID: line.variant.ID,
                    productTitle: line.product.title,
                    variantSku: line.variant.variantSku,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice.toFixed(2),
                    taxRate: 8.00,
                    lineTotal: line.extendedPrice.toFixed(2),
                    status: 'ORDERED'
                };
                await tx.run(INSERT.into(OrderItems).entries(orderItem));
            }

            // Step 14: Create Payment record
            const paymentId = cds.utils.uuid();
            const method = paymentMethod || 'CREDIT_CARD';
            const paymentRecord = {
                ID: paymentId,
                order_ID: orderId,
                paymentMethod: method,
                paymentProvider: 'MOCK_PAYMENT_GATEWAY',
                transactionReference: `TX-INIT-${Date.now()}`,
                amount: grandTotal.toFixed(2),
                currency_code: order.currency_code,
                status: 'INITIATED',
                rawGatewayResponse: null
            };
            await tx.run(INSERT.into(Payments).entries(paymentRecord));

            // Step 15: Simulate payment
            const isFailureSimulated =
                (simulateOutcome && simulateOutcome.toUpperCase() === 'FAIL') ||
                paymentToken === 'fail';

            if (!isFailureSimulated) {
                // Step 16: If payment succeeds, confirm order
                const captureRef = `PSP-CAPTURE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

                await tx.run(
                    UPDATE(Payments, paymentId).with({
                        status: 'CAPTURED',
                        transactionReference: captureRef,
                        rawGatewayResponse: JSON.stringify({
                            status: 'SUCCEEDED',
                            method: method,
                            captureRef: captureRef,
                            timestamp: new Date().toISOString()
                        })
                    })
                );

                await tx.run(
                    UPDATE(Orders, orderId).with({
                        status: 'CONFIRMED',
                        paymentStatus: 'PAID'
                    })
                );

                // Commit inventory holds (deduct physical quantityOnHand and clear quantityReserved)
                const reservations = await tx.run(
                    SELECT.from(InventoryReservations).where({ order_ID: orderId, status: 'RESERVED' })
                );

                for (const res of reservations) {
                    const inv = await tx.run(SELECT.one.from(Inventories).where({ ID: res.inventory_ID }));
                    if (inv) {
                        const newOnHand = Math.max(0, inv.quantityOnHand - res.quantity);
                        const newReserved = Math.max(0, inv.quantityReserved - res.quantity);
                        await tx.run(
                            UPDATE(Inventories, inv.ID).with({
                                quantityOnHand: newOnHand,
                                quantityReserved: newReserved
                            })
                        );
                    }
                    await tx.run(
                        UPDATE(InventoryReservations, res.ID).with({ status: 'COMMITTED' })
                    );
                }

                // Record coupon usage if applied
                if (cart.appliedCoupon_ID) {
                    await tx.run(
                        INSERT.into(CouponUsages).entries({
                            ID: cds.utils.uuid(),
                            coupon_ID: cart.appliedCoupon_ID,
                            customer_ID: customer.ID,
                            order_ID: orderId,
                            usedAt: new Date().toISOString()
                        })
                    );
                    const coupon = await tx.run(
                        SELECT.one.from(Coupons).where({ ID: cart.appliedCoupon_ID })
                    );
                    if (coupon) {
                        await tx.run(
                            UPDATE(Coupons, coupon.ID).with({
                                currentRedemptions: coupon.currentRedemptions + 1
                            })
                        );
                    }
                }

                // Clear customer's active cart
                await tx.run(DELETE.from(CartItems).where({ cart_ID: cart.ID }));
                await tx.run(
                    UPDATE(Carts, cart.ID).with({
                        appliedCoupon_ID: null,
                        subtotalAmount: 0.00,
                        discountAmount: 0.00,
                        shippingEstimate: 0.00,
                        taxEstimate: 0.00,
                        totalAmount: 0.00
                    })
                );

                // Audit log in OrderStatusHistories
                await tx.run(
                    INSERT.into(OrderStatusHistories).entries({
                        ID: cds.utils.uuid(),
                        order_ID: orderId,
                        oldStatus: 'PENDING_PAYMENT',
                        newStatus: 'CONFIRMED',
                        changedAt: new Date().toISOString(),
                        changedBy: customer.email || 'customer',
                        notes: `Order placed and payment captured (${captureRef})`
                    })
                );

                // Create customer confirmation notification
                await tx.run(
                    INSERT.into(Notifications).entries({
                        ID: cds.utils.uuid(),
                        customer_ID: customer.ID,
                        title: `Order Confirmed: ${orderNumber}`,
                        message: `Thank you for your purchase! Total $${grandTotal.toFixed(2)} paid. Preparing for dispatch.`,
                        channel: 'IN_APP',
                        linkUrl: `/orders/${orderId}`,
                        isRead: false
                    })
                );

                // Step 18: Return order result (Success)
                return {
                    order_ID: orderId,
                    orderNumber: orderNumber,
                    totalAmount: grandTotal.toFixed(2),
                    currency: order.currency_code,
                    status: 'CONFIRMED',
                    paymentStatus: 'PAID',
                    message: 'Order placed and payment captured successfully.'
                };
            } else {
                // Step 17: If payment fails, release inventory
                await tx.run(
                    UPDATE(Payments, paymentId).with({
                        status: 'FAILED',
                        rawGatewayResponse: JSON.stringify({
                            status: 'FAILED',
                            reason: 'Payment simulation failure or card declined',
                            timestamp: new Date().toISOString()
                        })
                    })
                );

                await tx.run(
                    UPDATE(Orders, orderId).with({
                        status: 'PAYMENT_FAILED',
                        paymentStatus: 'FAILED'
                    })
                );

                // Release reserved inventory
                const reservations = await tx.run(
                    SELECT.from(InventoryReservations).where({ order_ID: orderId, status: 'RESERVED' })
                );

                for (const res of reservations) {
                    const inv = await tx.run(SELECT.one.from(Inventories).where({ ID: res.inventory_ID }));
                    if (inv) {
                        const newReserved = Math.max(0, inv.quantityReserved - res.quantity);
                        await tx.run(
                            UPDATE(Inventories, inv.ID).with({ quantityReserved: newReserved })
                        );
                    }
                    await tx.run(
                        UPDATE(InventoryReservations, res.ID).with({ status: 'RELEASED' })
                    );
                }

                // Audit history
                await tx.run(
                    INSERT.into(OrderStatusHistories).entries({
                        ID: cds.utils.uuid(),
                        order_ID: orderId,
                        oldStatus: 'PENDING_PAYMENT',
                        newStatus: 'PAYMENT_FAILED',
                        changedAt: new Date().toISOString(),
                        changedBy: 'system',
                        notes: 'Payment authorization declined; stock holds released'
                    })
                );

                // Customer notification
                await tx.run(
                    INSERT.into(Notifications).entries({
                        ID: cds.utils.uuid(),
                        customer_ID: customer.ID,
                        title: `Payment Failed: ${orderNumber}`,
                        message: `Payment could not be processed for order ${orderNumber}. Stock hold has been released.`,
                        channel: 'IN_APP',
                        linkUrl: `/orders/${orderId}`,
                        isRead: false
                    })
                );

                // Step 18: Return order result (Payment Failed)
                return {
                    order_ID: orderId,
                    orderNumber: orderNumber,
                    totalAmount: grandTotal.toFixed(2),
                    currency: order.currency_code,
                    status: 'PAYMENT_FAILED',
                    paymentStatus: 'FAILED',
                    message: 'Payment authorization failed. Stock hold has been released.'
                };
            }
        });

        // -------------------------------------------------------------
        // ACTION: cancelOrder (Ownership, State, Stock Release, Notification)
        // -------------------------------------------------------------
        this.on('cancelOrder', async (req) => {
            const { order_ID, reason } = req.data;
            if (!order_ID) return req.reject(400, 'Order ID is required');

            const tx = cds.tx(req);
            const customer = await getCustomer(tx, req);
            const order = await tx.run(SELECT.one.from(Orders).where({ ID: order_ID }));
            if (!order) return req.reject(404, 'Order record not found');

            // 1. Verify customer ownership
            const isManagerOrAdmin = req.user?.is?.('OrderManager') || req.user?.is?.('Administrator');
            if (customer && order.customer_ID !== customer.ID && !isManagerOrAdmin) {
                return req.reject(403, 'Unauthorized: You do not own this order');
            }

            // 2. Verify order status
            if (order.status === 'CANCELLED') {
                return order; // idempotent
            }

            if (!['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING'].includes(order.status)) {
                return req.reject(
                    400,
                    `Order ${order.orderNumber} cannot be cancelled because it is in status '${order.status}'. You may initiate a return after delivery.`
                );
            }

            // 3. Release reserved inventory / restock
            const orderItems = await tx.run(
                SELECT.from(OrderItems).where({ order_ID: order_ID })
            );

            if (order.status === 'PENDING_PAYMENT') {
                // Active reservations in RESERVED state
                const reservations = await tx.run(
                    SELECT.from(InventoryReservations).where({ order_ID: order_ID, status: 'RESERVED' })
                );

                for (const res of reservations) {
                    const inv = await tx.run(SELECT.one.from(Inventories).where({ ID: res.inventory_ID }));
                    if (inv) {
                        await tx.run(
                            UPDATE(Inventories, inv.ID).with({
                                quantityReserved: Math.max(0, inv.quantityReserved - res.quantity)
                            })
                        );
                    }
                    await tx.run(
                        UPDATE(InventoryReservations, res.ID).with({ status: 'RELEASED' })
                    );
                }
            } else {
                // Order was CONFIRMED: Physical stock was already committed from quantityOnHand
                // Restock back to warehouse bins
                for (const item of orderItems) {
                    const stockRecord = await tx.run(
                        SELECT.one.from(Inventories).where({ variant_ID: item.variant_ID })
                    );
                    if (stockRecord) {
                        await tx.run(
                            UPDATE(Inventories, stockRecord.ID).with({
                                quantityOnHand: stockRecord.quantityOnHand + item.quantity
                            })
                        );
                    }
                }
            }

            // 4. Update order status & refund if already paid
            const cancelNote = reason || 'Customer requested order cancellation';
            const wasPaid = order.paymentStatus === 'PAID';

            await tx.run(
                UPDATE(Orders, order_ID).with({
                    status: 'CANCELLED',
                    paymentStatus: wasPaid ? 'REFUNDED' : order.paymentStatus,
                    cancellationReason: cancelNote
                })
            );

            await tx.run(
                UPDATE(OrderItems).where({ order_ID: order_ID }).with({ status: 'CANCELLED' })
            );

            if (wasPaid) {
                await tx.run(
                    UPDATE(Payments).where({ order_ID: order_ID }).with({
                        status: 'REFUNDED',
                        rawGatewayResponse: JSON.stringify({
                            refunded: true,
                            reason: cancelNote,
                            timestamp: new Date().toISOString()
                        })
                    })
                );
            }

            // Record status history
            const userIdentifier = customer?.email || req.user?.id || 'system';
            await tx.run(
                INSERT.into(OrderStatusHistories).entries({
                    ID: cds.utils.uuid(),
                    order_ID: order_ID,
                    oldStatus: order.status,
                    newStatus: 'CANCELLED',
                    changedAt: new Date().toISOString(),
                    changedBy: userIdentifier,
                    notes: cancelNote
                })
            );

            // 5. Create notification
            await tx.run(
                INSERT.into(Notifications).entries({
                    ID: cds.utils.uuid(),
                    customer_ID: order.customer_ID,
                    title: `Order Cancelled: ${order.orderNumber}`,
                    message: `Your order ${order.orderNumber} has been cancelled successfully.${wasPaid ? ' A full refund has been credited.' : ''}`,
                    channel: 'IN_APP',
                    linkUrl: `/orders/${order_ID}`,
                    isRead: false
                })
            );

            return await tx.run(SELECT.one.from(Orders).where({ ID: order_ID }));
        });

        // -------------------------------------------------------------
        // ACTION: returnOrder (Return Eligibility, Restock, Refund, RMA)
        // -------------------------------------------------------------
        this.on('returnOrder', async (req) => {
            const { order_ID, items, reason } = req.data;
            if (!order_ID) return req.reject(400, 'Order ID is required');

            const tx = cds.tx(req);
            const customer = await getCustomer(tx, req);
            const order = await tx.run(SELECT.one.from(Orders).where({ ID: order_ID }));
            if (!order) return req.reject(404, 'Order record not found');

            // 1. Validate customer ownership
            const isManagerOrAdmin = req.user?.is?.('OrderManager') || req.user?.is?.('Administrator');
            if (customer && order.customer_ID !== customer.ID && !isManagerOrAdmin) {
                return req.reject(403, 'Unauthorized: You do not own this order');
            }

            // 2. Validate return eligibility
            if (order.status !== 'DELIVERED') {
                return req.reject(
                    400,
                    `Order ${order.orderNumber} is not eligible for return. Current status is '${order.status}' (Must be 'DELIVERED').`
                );
            }

            const allOrderItems = await tx.run(
                SELECT.from(OrderItems).where({ order_ID: order_ID })
            );

            let itemsToReturn = [];
            if (items && Array.isArray(items) && items.length > 0) {
                for (const reqItem of items) {
                    const match = allOrderItems.find(oi => oi.ID === reqItem.orderItem_ID);
                    if (!match) {
                        return req.reject(400, `OrderItem '${reqItem.orderItem_ID}' does not belong to order ${order.orderNumber}`);
                    }
                    if (match.status === 'RETURNED') {
                        return req.reject(400, `Item '${match.productTitle}' has already been returned.`);
                    }
                    const returnQty = Number(reqItem.quantity) || match.quantity;
                    if (returnQty > match.quantity) {
                        return req.reject(400, `Return quantity (${returnQty}) cannot exceed ordered quantity (${match.quantity})`);
                    }
                    itemsToReturn.push({ item: match, qty: returnQty, reason: reqItem.reason });
                }
            } else {
                itemsToReturn = allOrderItems.map(oi => ({ item: oi, qty: oi.quantity, reason: reason }));
            }

            // 3. Create return information & RMA
            const returnReasonText = reason || 'Customer returned items';
            const rmaNumber = `RMA-${order.orderNumber}-${Math.floor(1000 + Math.random() * 9000)}`;

            await tx.run(
                UPDATE(Orders, order_ID).with({
                    status: 'RETURNED',
                    fulfillmentStatus: 'RETURNED',
                    paymentStatus: 'REFUNDED',
                    rmaNumber: rmaNumber,
                    returnReason: returnReasonText
                })
            );

            // 4. Update order items & restock inventory
            let totalRefundAmount = 0;
            for (const ret of itemsToReturn) {
                await tx.run(
                    UPDATE(OrderItems, ret.item.ID).with({ status: 'RETURNED' })
                );
                totalRefundAmount += Number(ret.item.lineTotal);

                // Restock physical inventory in warehouse bin
                const stockRecord = await tx.run(
                    SELECT.one.from(Inventories).where({ variant_ID: ret.item.variant_ID })
                );
                if (stockRecord) {
                    await tx.run(
                        UPDATE(Inventories, stockRecord.ID).with({
                            quantityOnHand: stockRecord.quantityOnHand + ret.qty
                        })
                    );
                }
            }

            // 5. Represent refund clearly (Mock payment processor refund)
            const refundRef = `REFUND-GATEWAY-${Date.now()}`;
            await tx.run(
                UPDATE(Payments).where({ order_ID: order_ID }).with({
                    status: 'REFUNDED',
                    rawGatewayResponse: JSON.stringify({
                        refunded: true,
                        rma: rmaNumber,
                        refundReference: refundRef,
                        amount: totalRefundAmount.toFixed(2),
                        reason: returnReasonText,
                        timestamp: new Date().toISOString()
                    })
                })
            );

            // 6. Record status history
            const userIdentifier = customer?.email || req.user?.id || 'system';
            await tx.run(
                INSERT.into(OrderStatusHistories).entries({
                    ID: cds.utils.uuid(),
                    order_ID: order_ID,
                    oldStatus: 'DELIVERED',
                    newStatus: 'RETURNED',
                    changedAt: new Date().toISOString(),
                    changedBy: userIdentifier,
                    notes: `Return authorized. RMA: ${rmaNumber}. Refund: $${totalRefundAmount.toFixed(2)} (${refundRef})`
                })
            );

            // 7. Create notification
            await tx.run(
                INSERT.into(Notifications).entries({
                    ID: cds.utils.uuid(),
                    customer_ID: order.customer_ID,
                    title: `Return Approved: ${rmaNumber}`,
                    message: `Your return for order ${order.orderNumber} has been processed. RMA: ${rmaNumber}. A refund of $${totalRefundAmount.toFixed(2)} has been issued.`,
                    channel: 'IN_APP',
                    linkUrl: `/orders/${order_ID}`,
                    isRead: false
                })
            );

            return await tx.run(SELECT.one.from(Orders).where({ ID: order_ID }));
        });

        return super.init();
    }
}
