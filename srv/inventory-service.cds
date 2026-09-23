using { sap.marketplace as mp } from '../db/schema';

@path: '/odata/v4/inventory'
@requires: ['InventoryManager', 'Seller', 'Administrator']
service InventoryService {

    @restrict: [
        { grant: '*', to: ['InventoryManager', 'Administrator'] },
        { grant: 'READ', to: 'Seller' }
    ]
    entity Warehouses as projection on mp.Warehouses;

    @restrict: [
        { grant: '*', to: ['InventoryManager', 'Administrator'] },
        { grant: ['READ', 'UPDATE'], to: 'Seller' }
    ]
    entity Inventories as projection on mp.Inventories;

    @restrict: [
        { grant: '*', to: ['InventoryManager', 'Administrator'] },
        { grant: 'READ', to: 'Seller' }
    ]
    entity Reservations as projection on mp.InventoryReservations;

    type ReservationItemInput {
        variant_ID : UUID;
        quantity   : Integer;
    };

    @requires: ['InventoryManager', 'Administrator']
    action reserveInventory(
        order_ID : UUID,
        items    : array of ReservationItemInput
    ) returns array of UUID;

    @requires: ['InventoryManager', 'Administrator']
    action releaseInventory(
        reservation_ID : UUID,
        reason         : String
    ) returns Boolean;

    @requires: ['InventoryManager', 'Administrator']
    action confirmReservation(
        reservation_ID : UUID
    ) returns Boolean;

    @requires: ['InventoryManager', 'Administrator']
    action syncWarehouseStock(
        warehouse_ID : UUID,
        variant_ID   : UUID,
        countOnHand  : Integer
    ) returns Boolean;
}

