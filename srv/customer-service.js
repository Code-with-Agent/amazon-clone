import cds from '@sap/cds';

export default class CustomerService extends cds.ApplicationService {
    async init() {
        const { Customers, Wishlists, WishlistItems, Notifications, Products } = cds.entities('sap.marketplace');

        // Helper: retrieve current customer
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
        // ROW-LEVEL AUTHORIZATION: Isolate customer data
        // -------------------------------------------------------------
        this.before('READ', ['Profile', 'Addresses', 'Wishlists', 'WishlistItems', 'Notifications'], async (req) => {
            if (req.user?.is?.('Customer') && !req.user?.is?.('Administrator')) {
                const customer = await getCustomer(cds.tx(req), req);
                if (customer) {
                    if (req.target.name.endsWith('Profile')) {
                        req.query.where({ ID: customer.ID });
                    } else if (req.target.name.endsWith('Addresses') || req.target.name.endsWith('Wishlists') || req.target.name.endsWith('Notifications')) {
                        req.query.where({ customer_ID: customer.ID });
                    }
                }
            }
        });

        // -------------------------------------------------------------
        // ACTION: addToWishlist
        // -------------------------------------------------------------
        this.on('addToWishlist', async (req) => {
            const { product_ID, variant_ID } = req.data;
            if (!product_ID) return req.reject(400, 'Product ID is required');

            const tx = cds.tx(req);
            const customer = await getCustomer(tx, req);
            if (!customer) return req.reject(404, 'Customer profile not found');

            // Find or create Wishlist
            let wishlist = await tx.run(
                SELECT.one.from(Wishlists).where({ customer_ID: customer.ID })
            );
            if (!wishlist) {
                wishlist = {
                    ID: cds.utils.uuid(),
                    customer_ID: customer.ID,
                    title: 'My Wishlist',
                    isPublic: false
                };
                await tx.run(INSERT.into(Wishlists).entries(wishlist));
            }

            // Check if product exists
            const product = await tx.run(SELECT.one.from(Products).where({ ID: product_ID }));
            if (!product) return req.reject(404, 'Product not found');

            // Check duplicate
            const existing = await tx.run(
                SELECT.one.from(WishlistItems).where({
                    wishlist_ID: wishlist.ID,
                    product_ID: product_ID,
                    variant_ID: variant_ID || null
                })
            );
            if (existing) {
                return existing;
            }

            const item = {
                ID: cds.utils.uuid(),
                wishlist_ID: wishlist.ID,
                product_ID: product_ID,
                variant_ID: variant_ID || null,
                targetPrice: null
            };

            await tx.run(INSERT.into(WishlistItems).entries(item));
            return item;
        });

        // -------------------------------------------------------------
        // ACTION: removeFromWishlist
        // -------------------------------------------------------------
        this.on('removeFromWishlist', async (req) => {
            const { wishlistItem_ID } = req.data;
            if (!wishlistItem_ID) return req.reject(400, 'Wishlist item ID is required');

            const tx = cds.tx(req);
            const deleted = await tx.run(DELETE.from(WishlistItems).where({ ID: wishlistItem_ID }));
            return Boolean(deleted);
        });

        // -------------------------------------------------------------
        // ACTION: markNotificationAsRead
        // -------------------------------------------------------------
        this.on('markNotificationAsRead', async (req) => {
            const { notification_ID } = req.data;
            if (!notification_ID) return req.reject(400, 'Notification ID is required');

            const tx = cds.tx(req);
            const updated = await tx.run(
                UPDATE(Notifications, notification_ID).with({ isRead: true })
            );
            return Boolean(updated);
        });

        return super.init();
    }
}
