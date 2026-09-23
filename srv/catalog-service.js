import cds from '@sap/cds';

export default class CatalogService extends cds.ApplicationService {
    async init() {
        const { Products, Reviews, ReviewVotes, Customers, OrderItems } = cds.entities('sap.marketplace');

        // -------------------------------------------------------------
        // ACTION: submitReview
        // -------------------------------------------------------------
        this.on('submitReview', async (req) => {
            const { product_ID, rating, headline, comment } = req.data;

            if (!product_ID) return req.reject(400, 'Product ID is mandatory');
            if (!rating || rating < 1 || rating > 5) {
                return req.reject(400, 'Rating must be an integer between 1 and 5');
            }
            if (!headline || !headline.trim()) {
                return req.reject(400, 'Review headline is required');
            }

            const tx = cds.tx(req);

            // Verify product exists and is active
            const product = await tx.run(
                SELECT.one.from(Products).where({ ID: product_ID, status: 'ACTIVE' })
            );
            if (!product) {
                return req.reject(404, `Active product with ID '${product_ID}' not found`);
            }

            // Determine customer
            const userAttrId = req.user?.attr?.id || req.user?.attr?.customerId || req.user?.id;
            let customer = null;
            if (userAttrId) {
                customer = await tx.run(
                    SELECT.one.from(Customers).where({ externalUserId: userAttrId })
                );
                if (!customer) {
                    customer = await tx.run(
                        SELECT.one.from(Customers).where({ ID: userAttrId })
                    );
                }
            }
            if (!customer) {
                return req.reject(403, 'Customer profile not found for user');
            }

            // Check for duplicate review by same customer on same product
            const existingReview = await tx.run(
                SELECT.one.from(Reviews).where({
                    product_ID: product_ID,
                    customer_ID: customer.ID
                })
            );
            if (existingReview) {
                return req.reject(409, 'You have already submitted a review for this product');
            }

            // Check verified purchase
            const purchased = await tx.run(
                SELECT.one.from(OrderItems).where({
                    'order.customer_ID': customer.ID,
                    'order.status': { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED'] },
                    'productTitle': product.title
                })
            );
            const isVerifiedPurchase = Boolean(purchased);

            const newReview = {
                ID: cds.utils.uuid(),
                product_ID: product_ID,
                customer_ID: customer.ID,
                rating: rating,
                headline: headline.trim(),
                comment: comment ? comment.trim() : null,
                isVerifiedPurchase: isVerifiedPurchase,
                helpfulVotes: 0,
                status: 'APPROVED'
            };

            await tx.run(INSERT.into(Reviews).entries(newReview));

            // Recalculate averageRating and reviewCount for Product
            const allReviews = await tx.run(
                SELECT.from(Reviews).where({ product_ID: product_ID, status: 'APPROVED' })
            );
            const total = allReviews.reduce((sum, r) => sum + r.rating, 0);
            const count = Math.max(allReviews.length, (product.reviewCount || 0) + 1);
            const avg = allReviews.length > 0 ? (total / allReviews.length).toFixed(2) : 5.00;

            await tx.run(
                UPDATE(Products, product_ID).with({
                    averageRating: avg,
                    reviewCount: count
                })
            );

            return newReview;
        });

        // -------------------------------------------------------------
        // ACTION: markReviewHelpful
        // -------------------------------------------------------------
        this.on('markReviewHelpful', async (req) => {
            const { review_ID, isHelpful } = req.data;
            if (!review_ID) return req.reject(400, 'Review ID is required');

            const tx = cds.tx(req);

            const review = await tx.run(SELECT.one.from(Reviews).where({ ID: review_ID }));
            if (!review) return req.reject(404, 'Review not found');

            const userAttrId = req.user?.attr?.id || req.user?.attr?.customerId || req.user?.id;
            let customer = null;
            if (userAttrId) {
                customer = await tx.run(
                    SELECT.one.from(Customers).where({ externalUserId: userAttrId })
                );
                if (!customer) {
                    customer = await tx.run(
                        SELECT.one.from(Customers).where({ ID: userAttrId })
                    );
                }
            }

            if (customer && review.customer_ID === customer.ID) {
                return req.reject(400, 'Authors cannot vote on their own reviews');
            }

            const customerId = customer ? customer.ID : cds.utils.uuid();

            const existingVote = await tx.run(
                SELECT.one.from(ReviewVotes).where({
                    review_ID: review_ID,
                    customer_ID: customerId
                })
            );

            if (existingVote) {
                await tx.run(
                    UPDATE(ReviewVotes, existingVote.ID).with({ isHelpful: Boolean(isHelpful) })
                );
            } else {
                await tx.run(
                    INSERT.into(ReviewVotes).entries({
                        ID: cds.utils.uuid(),
                        review_ID: review_ID,
                        customer_ID: customerId,
                        isHelpful: Boolean(isHelpful)
                    })
                );
            }

            const helpfulVotesCount = await tx.run(
                SELECT.from(ReviewVotes).where({ review_ID: review_ID, isHelpful: true })
            );
            const count = helpfulVotesCount.length;

            await tx.run(UPDATE(Reviews, review_ID).with({ helpfulVotes: count }));

            return count;
        });

        return super.init();
    }
}
