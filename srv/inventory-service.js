import cds from '@sap/cds';

export default class InventoryService extends cds.ApplicationService {
    async init() {
        const { Inventories, InventoryReservations } = cds.entities('sap.marketplace');

        // -------------------------------------------------------------
        // HOOK: Compute availableQuantity & reservedQuantity dynamically
        // -------------------------------------------------------------
        this.after('READ', 'Inventories', (results) => {
            const records = Array.isArray(results) ? results : (results ? [results] : []);
            for (const each of records) {
                if (each) {
                    const onHand = Number(each.quantityOnHand) || 0;
                    const reserved = Number(each.quantityReserved) || 0;
                    each.reservedQuantity = reserved;
                    each.availableQuantity = Math.max(0, onHand - reserved);
                }
            }
        });

        // -------------------------------------------------------------
        // ACTION: reserveInventory (Transactional & Invariant Enforced)
        // -------------------------------------------------------------
        this.on('reserveInventory', async (req) => {
            const { order_ID, items } = req.data;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return req.reject(400, 'Items array is required for inventory reservation');
            }

            const tx = cds.tx(req);
            const reservationIds = [];

            for (const item of items) {
                const qty = Number(item.quantity) || 1;
                if (!item.variant_ID) {
                    return req.reject(400, 'variant_ID is required for each reservation item');
                }
                if (qty <= 0) {
                    return req.reject(400, `Requested quantity must be positive (received: ${qty})`);
                }

                // Query inventory bins for this variant
                const stockRecords = await tx.run(
                    SELECT.from(Inventories)
                        .where({ variant_ID: item.variant_ID })
                        .orderBy('quantityOnHand desc')
                );

                const totalAvailable = stockRecords.reduce(
                    (sum, s) => sum + Math.max(0, s.quantityOnHand - s.quantityReserved),
                    0
                );

                // Enforce strict invariant: Never allow available stock to become negative
                if (totalAvailable < qty) {
                    return req.reject(
                        409,
                        `Insufficient inventory for variant '${item.variant_ID}'. Requested: ${qty}, Total Available: ${totalAvailable}`
                    );
                }

                let remainingToReserve = qty;
                for (const inv of stockRecords) {
                    const availableInBin = inv.quantityOnHand - inv.quantityReserved;
                    if (availableInBin > 0) {
                        const reserveCount = Math.min(remainingToReserve, availableInBin);
                        const newReserved = inv.quantityReserved + reserveCount;

                        await tx.run(
                            UPDATE(Inventories, inv.ID).with({ quantityReserved: newReserved })
                        );

                        const resId = cds.utils.uuid();
                        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

                        await tx.run(
                            INSERT.into(InventoryReservations).entries({
                                ID: resId,
                                inventory_ID: inv.ID,
                                order_ID: order_ID || null,
                                quantity: reserveCount,
                                status: 'RESERVED',
                                expiresAt: expiresAt
                            })
                        );

                        reservationIds.push(resId);
                        remainingToReserve -= reserveCount;
                        if (remainingToReserve <= 0) break;
                    }
                }
            }

            return reservationIds;
        });

        // -------------------------------------------------------------
        // ACTION: releaseInventory
        // -------------------------------------------------------------
        this.on('releaseInventory', async (req) => {
            const { reservation_ID } = req.data;
            if (!reservation_ID) return req.reject(400, 'Reservation ID is required');

            const tx = cds.tx(req);
            const res = await tx.run(
                SELECT.one.from(InventoryReservations).where({ ID: reservation_ID })
            );
            if (!res) return req.reject(404, 'Reservation record not found');

            if (res.status === 'RELEASED') return true;

            const inv = await tx.run(
                SELECT.one.from(Inventories).where({ ID: res.inventory_ID })
            );
            if (inv) {
                const newReserved = Math.max(0, inv.quantityReserved - res.quantity);
                await tx.run(
                    UPDATE(Inventories, inv.ID).with({ quantityReserved: newReserved })
                );
            }

            await tx.run(
                UPDATE(InventoryReservations, reservation_ID).with({ status: 'RELEASED' })
            );

            return true;
        });

        // -------------------------------------------------------------
        // ACTION: confirmReservation
        // -------------------------------------------------------------
        this.on('confirmReservation', async (req) => {
            const { reservation_ID } = req.data;
            if (!reservation_ID) return req.reject(400, 'Reservation ID is required');

            const tx = cds.tx(req);
            const res = await tx.run(
                SELECT.one.from(InventoryReservations).where({ ID: reservation_ID })
            );
            if (!res) return req.reject(404, 'Reservation record not found');

            const inv = await tx.run(
                SELECT.one.from(Inventories).where({ ID: res.inventory_ID })
            );
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
                UPDATE(InventoryReservations, reservation_ID).with({ status: 'COMMITTED' })
            );

            return true;
        });

        // -------------------------------------------------------------
        // ACTION: syncWarehouseStock
        // -------------------------------------------------------------
        this.on('syncWarehouseStock', async (req) => {
            const { warehouse_ID, variant_ID, countOnHand } = req.data;
            if (!warehouse_ID || !variant_ID || countOnHand === undefined) {
                return req.reject(400, 'warehouse_ID, variant_ID and countOnHand are required');
            }

            const count = Number(countOnHand);
            if (count < 0) {
                return req.reject(400, 'Physical inventory count cannot be negative');
            }

            const tx = cds.tx(req);
            const existing = await tx.run(
                SELECT.one.from(Inventories).where({
                    warehouse_ID: warehouse_ID,
                    variant_ID: variant_ID
                })
            );

            if (existing) {
                if (count < existing.quantityReserved) {
                    return req.reject(
                        400,
                        `Physical count (${count}) cannot be less than active reserved stock (${existing.quantityReserved})`
                    );
                }
                await tx.run(
                    UPDATE(Inventories, existing.ID).with({ quantityOnHand: count })
                );
            } else {
                await tx.run(
                    INSERT.into(Inventories).entries({
                        ID: cds.utils.uuid(),
                        warehouse_ID: warehouse_ID,
                        variant_ID: variant_ID,
                        quantityOnHand: count,
                        quantityReserved: 0,
                        reorderThreshold: 10
                    })
                );
            }

            return true;
        });

        return super.init();
    }
}
