import cds from '@sap/cds';
import { expect } from 'chai';

describe('CustomerService Dedicated Test Suite', () => {
    const { GET, POST, axios } = cds.test('.');

    afterEach(() => {
        axios.defaults.auth = undefined;
    });

    it('1. should reject unauthenticated access to CustomerService with 401', async () => {
        axios.defaults.auth = undefined;
        try {
            await GET('/odata/v4/customer/Profile');
            expect.fail('Should have rejected unauthenticated request');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(401);
        }
    });

    it('2. should allow customer Alice to read own Profile and Addresses', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const profileRes = await GET('/odata/v4/customer/Profile');
        expect(profileRes.status).to.equal(200);
        expect(profileRes.data.value).to.be.an('array').with.length.greaterThan(0);
        const profile = profileRes.data.value[0];
        expect(profile).to.have.property('firstName', 'Alice');

        const addrRes = await GET('/odata/v4/customer/Addresses');
        expect(addrRes.status).to.equal(200);
        expect(addrRes.data.value).to.be.an('array');
    });

    it('3. should enforce customer data isolation between Alice and Bob', async () => {
        axios.defaults.auth = { username: 'bob_customer', password: '' };

        const bobProfile = await GET('/odata/v4/customer/Profile');
        expect(bobProfile.status).to.equal(200);
        expect(bobProfile.data.value).to.be.an('array').with.length.greaterThan(0);
        expect(bobProfile.data.value[0]).to.have.property('firstName', 'John');
        expect(bobProfile.data.value[0]).to.have.property('externalUserId', 'cust-002');
    });

    it('4. should read customer notifications and mark notification as read', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        // Ensure Alice has a notification
        const { Notifications, Customers } = cds.entities('sap.marketplace');
        const alice = await cds.run(SELECT.one.from(Customers).where({ externalUserId: 'cust-001' }));
        const notifId = cds.utils.uuid();

        await cds.run(INSERT.into(Notifications).entries({
            ID: notifId,
            customer_ID: alice.ID,
            title: 'Welcome to Aura Marketplace',
            message: 'Your account has been set up successfully.',
            channel: 'IN_APP',
            linkUrl: '/account',
            isRead: false
        }));

        const readRes = await POST('/odata/v4/customer/markNotificationAsRead', {
            notification_ID: notifId
        });
        expect(readRes.status).to.equal(200);
        expect(readRes.data.value).to.be.true;

        const updated = await cds.run(SELECT.one.from(Notifications).where({ ID: notifId }));
        expect(updated.isRead).to.be.true;
    });

    it('5. should reject markNotificationAsRead with missing notification ID', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };
        try {
            await POST('/odata/v4/customer/markNotificationAsRead', {});
            expect.fail('Should have rejected with 400');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(400);
        }
    });

    it('6. should reject customer adding non-existent product to wishlist', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };
        try {
            await POST('/odata/v4/customer/addToWishlist', {
                product_ID: '00000000-0000-0000-0000-000000000000'
            });
            expect.fail('Should have rejected with 404');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(404);
        }
    });
});
