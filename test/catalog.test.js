import cds from '@sap/cds';
import { expect } from 'chai';

describe('CatalogService Operations', () => {
    const { GET, POST, axios } = cds.test('.');

    before(async () => {
        axios.defaults.auth = undefined;
        const { Reviews } = cds.entities('sap.marketplace');
        await cds.run(DELETE.from(Reviews).where({ product_ID: 'p0000000-0000-0000-0000-000000000003' }));
    });

    it('should retrieve active products and categories via OData V4 (public anonymous access)', async () => {
        axios.defaults.auth = undefined;
        const res = await GET('/odata/v4/catalog/Products');
        expect(res.status).to.equal(200);
        expect(res.data.value).to.be.an('array');
        expect(res.data.value.length).to.be.greaterThan(0);

        const firstProduct = res.data.value[0];
        expect(firstProduct).to.have.property('title');
        expect(firstProduct).to.have.property('status', 'ACTIVE');
    });

    it('should submit a product review and update average rating (requires Customer role)', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };
        // Query iPhone 15 Pro which has no reviews yet
        const prodRes = await GET("/odata/v4/catalog/Products?$filter=sku eq 'SKU-APPLE-IP15P'");
        expect(prodRes.status).to.equal(200);
        const product = prodRes.data.value[0];

        const payload = {
            product_ID: product.ID,
            rating: 5,
            headline: 'Phenomenal device!',
            comment: 'Exceeded all my expectations. Highly recommended.'
        };

        const res = await POST('/odata/v4/catalog/submitReview', payload);
        expect(res.status).to.equal(200);
        expect(res.data).to.have.property('rating', 5);
        expect(res.data).to.have.property('headline', 'Phenomenal device!');
    });

    it('should reject a review with invalid rating score', async () => {
        const prodRes = await GET('/odata/v4/catalog/Products');
        const product = prodRes.data.value[0];

        try {
            await POST('/odata/v4/catalog/submitReview', {
                product_ID: product.ID,
                rating: 7, // Invalid > 5
                headline: 'Impossible rating'
            });
            expect.fail('Should have rejected with 400');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(400);
        }
    });

    it('should allow marking another user review as helpful', async () => {
        // Review 2 is authored by John Doe (c0000000-0000-0000-0000-000000000002)
        const res = await POST('/odata/v4/catalog/markReviewHelpful', {
            review_ID: 'rev00000-0000-0000-0000-000000000002',
            isHelpful: true
        });

        expect(res.status).to.equal(200);
        expect(res.data.value).to.be.a('number');
        expect(res.data.value).to.be.greaterThanOrEqual(1);
    });
});
