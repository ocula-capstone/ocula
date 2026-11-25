import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hashPassword } from './../src/common/password.js';
import { createFakePrisma, FakePrisma } from './fake-prisma.js';
import { bearer, createTestApp } from './test-app.js';

const PASAY = '11111111-1111-4111-8111-111111111111';
const TAGUIG = '22222222-2222-4222-8222-222222222222';
const MISSING = '99999999-9999-4999-8999-999999999999';

type Auth = { Authorization: string };

describe('Products and inventory (e2e)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let admin: Auth;
  let staff: Auth;
  let taguigStaff: Auth;
  let doctor: Auth;
  let patient: Auth;

  const http = () => request(app.getHttpServer());
  const frame = (body: Record<string, unknown> = {}) =>
    http()
      .post('/api/products')
      .set(admin)
      .send({
        sku: 'fr-rb-2140',
        name: 'Ray-Ban Wayfarer',
        category: 'frame',
        brand: 'Ray-Ban',
        price: 3500,
        cost: 1800,
        frameColor: 'Black',
        frameSize: '52-18-140',
        ...body,
      });
  const receive = (
    productId: string,
    quantity: number,
    as: Auth = staff,
    branchId = PASAY,
  ) =>
    http()
      .post('/api/inventory/receive')
      .set(as)
      .send({ branchId, productId, quantity });

  beforeEach(async () => {
    db = createFakePrisma();
    db.addBranch({ id: PASAY, code: 'PASAY', name: 'MRB Pasay' });
    db.addBranch({ id: TAGUIG, code: 'TAGUIG', name: 'MRB Taguig' });
    const pw = await hashPassword('password-1');
    db.addUser({ email: 'admin@mrb.test', passwordHash: pw, role: 'admin' });
    db.addUser({ email: 'staff@mrb.test', passwordHash: pw, role: 'staff' }, [
      PASAY,
    ]);
    db.addUser({ email: 'tg@mrb.test', passwordHash: pw, role: 'staff' }, [
      TAGUIG,
    ]);
    db.addUser(
      { email: 'doc@mrb.test', passwordHash: pw, role: 'optometrist' },
      [PASAY],
    );
    db.addUser({ email: 'pat@mrb.test', passwordHash: pw, role: 'patient' });

    app = await createTestApp(db);
    admin = await bearer(app, 'admin@mrb.test', 'password-1');
    staff = await bearer(app, 'staff@mrb.test', 'password-1');
    taguigStaff = await bearer(app, 'tg@mrb.test', 'password-1');
    doctor = await bearer(app, 'doc@mrb.test', 'password-1');
    patient = await bearer(app, 'pat@mrb.test', 'password-1');
  });

  afterEach(async () => {
    await app.close();
  });

  describe('products', () => {
    it('admin creates a frame; SKU is stored in capitals and must be unique', async () => {
      const res = await frame().expect(201);
      expect(res.body).toMatchObject({
        sku: 'FR-RB-2140',
        category: 'frame',
        price: 3500,
        cost: 1800,
        stocked: true,
        stock: [],
        totalQuantity: 0,
        frame: {
          frameColor: 'Black',
          frameSize: '52-18-140',
          frameModel: null,
        },
      });
      expect(db.auditLogs.some((a) => a.action === 'product.create')).toBe(
        true,
      );

      const dup = await frame({ name: 'Other' }).expect(409);
      expect(dup.body.error.code).toBe('sku_taken');
    });

    it('frame fields are dropped on other categories', async () => {
      const res = await frame({
        sku: 'SOL-1',
        name: 'Lens solution 100ml',
        category: 'solution',
      }).expect(201);
      expect(res.body.frame).toBeNull();
      expect(db.products[0].frameColor).toBeNull();
    });

    it('only the admin changes products; cost is hidden from others', async () => {
      const { body } = await frame().expect(201);
      await http().post('/api/products').set(staff).send({}).expect(403);
      await http()
        .patch(`/api/products/${body.id}`)
        .set(staff)
        .send({ price: 1 })
        .expect(403);
      await http().get('/api/products').set(patient).expect(403);

      const asStaff = await http()
        .get(`/api/products/${body.id}`)
        .set(staff)
        .expect(200);
      expect(asStaff.body).not.toHaveProperty('cost');
      const asDoctor = await http()
        .get('/api/products')
        .set(doctor)
        .expect(200);
      expect(asDoctor.body.items[0]).not.toHaveProperty('cost');
    });

    it('admin edits price and retires a product; search and filters work', async () => {
      const { body } = await frame().expect(201);
      await frame({
        sku: 'SVC-EXAM',
        name: 'Eye exam',
        category: 'service',
        price: 500,
      }).expect(201);
      const edited = await http()
        .patch(`/api/products/${body.id}`)
        .set(admin)
        .send({ price: 3999.5, isActive: false, brand: '' })
        .expect(200);
      expect(edited.body).toMatchObject({
        price: 3999.5,
        isActive: false,
        brand: null,
      });

      const search = await http()
        .get('/api/products?search=wayf')
        .set(staff)
        .expect(200);
      expect(search.body.total).toBe(1);
      const active = await http()
        .get('/api/products?isActive=true')
        .set(staff)
        .expect(200);
      expect(active.body.items.map((p: { sku: string }) => p.sku)).toEqual([
        'SVC-EXAM',
      ]);
      const services = await http()
        .get('/api/products?category=service')
        .set(staff)
        .expect(200);
      expect(services.body.items[0]).toMatchObject({
        stocked: false,
        stock: [],
      });
    });

    it('validates SKU, price and category', async () => {
      const res = await frame({
        sku: 'x',
        price: 10.555,
        category: 'hat',
      }).expect(422);
      expect(Object.keys(res.body.error.fields).sort()).toEqual([
        'category',
        'price',
        'sku',
      ]);
    });

    it('public catalog: no login, active only, no cost, in-stock per branch', async () => {
      const a = (await frame().expect(201)).body;
      const b = (
        await frame({ sku: 'FR-2', name: 'Bench frame', price: 900 }).expect(
          201,
        )
      ).body;
      await frame({ sku: 'FR-OLD', name: 'Old frame' }).expect(201);
      await http()
        .patch(`/api/products/${db.products[2].id}`)
        .set(admin)
        .send({ isActive: false })
        .expect(200);
      await receive(a.id, 2).expect(200);
      await receive(b.id, 1, taguigStaff, TAGUIG).expect(200);

      const res = await http()
        .get('/api/catalog/products?category=frame')
        .expect(200);
      expect(res.body.total).toBe(2);
      const wayfarer = res.body.items.find(
        (p: { id: string }) => p.id === a.id,
      );
      expect(wayfarer).not.toHaveProperty('cost');
      expect(wayfarer).not.toHaveProperty('stock');
      expect(wayfarer.availability).toEqual([
        {
          branch: { id: PASAY, code: 'PASAY', name: 'MRB Pasay' },
          inStock: true,
        },
        {
          branch: { id: TAGUIG, code: 'TAGUIG', name: 'MRB Taguig' },
          inStock: false,
        },
      ]);

      const taguig = await http()
        .get(`/api/catalog/products?branchId=${TAGUIG}`)
        .expect(200);
      expect(taguig.body.items.map((p: { id: string }) => p.id)).toEqual([
        b.id,
      ]);
    });
  });

  describe('inventory', () => {
    let frameId: string;
    let serviceId: string;

    beforeEach(async () => {
      frameId = (await frame().expect(201)).body.id;
      serviceId = (
        await frame({
          sku: 'SVC-EXAM',
          name: 'Eye exam',
          category: 'service',
          price: 500,
        }).expect(201)
      ).body.id;
    });

    it('receive adds stock with the clinic reorder level and records a movement', async () => {
      const res = await receive(frameId, 5).expect(200);
      expect(res.body).toMatchObject({
        quantity: 5,
        reorderLevel: 3,
        isLow: false,
        branch: { id: PASAY },
        product: { id: frameId, sku: 'FR-RB-2140', price: 3500 },
      });
      await receive(frameId, 2).expect(200);
      expect(db.inventoryItems[0].quantity).toBe(7);
      expect(db.stockMovements.map((m) => m.quantityChange)).toEqual([5, 2]);
      expect(
        db.auditLogs.filter((a) => a.action === 'inventory.receive'),
      ).toHaveLength(2);

      const product = await http()
        .get(`/api/products/${frameId}`)
        .set(staff)
        .expect(200);
      expect(product.body.totalQuantity).toBe(7);
    });

    it('adjust needs a reason and cannot go below zero', async () => {
      await receive(frameId, 2).expect(200);
      const noReason = await http()
        .post('/api/inventory/adjust')
        .set(staff)
        .send({ branchId: PASAY, productId: frameId, quantityChange: -1 })
        .expect(422);
      expect(noReason.body.error.fields).toHaveProperty('reason');
      const zero = await http()
        .post('/api/inventory/adjust')
        .set(staff)
        .send({
          branchId: PASAY,
          productId: frameId,
          quantityChange: 0,
          reason: 'count',
        })
        .expect(422);
      expect(zero.body.error.fields).toHaveProperty('quantityChange');

      const tooMany = await http()
        .post('/api/inventory/adjust')
        .set(staff)
        .send({
          branchId: PASAY,
          productId: frameId,
          quantityChange: -3,
          reason: 'Broken',
        })
        .expect(409);
      expect(tooMany.body.error.code).toBe('insufficient_stock');
      expect(db.inventoryItems[0].quantity).toBe(2);
      expect(db.stockMovements).toHaveLength(1);

      const ok = await http()
        .post('/api/inventory/adjust')
        .set(staff)
        .send({
          branchId: PASAY,
          productId: frameId,
          quantityChange: -2,
          reason: 'Broken',
        })
        .expect(200);
      expect(ok.body).toMatchObject({ quantity: 0, isLow: true });
    });

    it('services are never stocked; retired products cannot be received', async () => {
      const svc = await receive(serviceId, 1).expect(409);
      expect(svc.body.error.code).toBe('not_stocked');

      await receive(frameId, 1).expect(200);
      await http()
        .patch(`/api/products/${frameId}`)
        .set(admin)
        .send({ isActive: false })
        .expect(200);
      const retired = await receive(frameId, 1).expect(409);
      expect(retired.body.error.code).toBe('product_inactive');
      // Writing off old stock is still allowed.
      await http()
        .post('/api/inventory/adjust')
        .set(staff)
        .send({
          branchId: PASAY,
          productId: frameId,
          quantityChange: -1,
          reason: 'Written off',
        })
        .expect(200);
    });

    it('transfer moves stock between branches in one step', async () => {
      await receive(frameId, 4).expect(200);
      const res = await http()
        .post('/api/inventory/transfer')
        .set(staff)
        .send({
          fromBranchId: PASAY,
          toBranchId: TAGUIG,
          productId: frameId,
          quantity: 3,
        })
        .expect(200);
      expect(res.body.from).toMatchObject({
        quantity: 1,
        branch: { id: PASAY },
      });
      expect(res.body.to).toMatchObject({
        quantity: 3,
        branch: { id: TAGUIG },
      });
      const types = db.stockMovements.map((m) => [
        m.type,
        m.quantityChange,
        m.reason,
      ]);
      expect(types).toEqual([
        ['receive', 4, null],
        ['transfer_out', -3, 'Transfer to TAGUIG'],
        ['transfer_in', 3, 'Transfer from PASAY'],
      ]);

      const short = await http()
        .post('/api/inventory/transfer')
        .set(staff)
        .send({
          fromBranchId: PASAY,
          toBranchId: TAGUIG,
          productId: frameId,
          quantity: 2,
        })
        .expect(409);
      expect(short.body.error.code).toBe('insufficient_stock');
      expect(db.stockMovements).toHaveLength(3);

      const same = await http()
        .post('/api/inventory/transfer')
        .set(staff)
        .send({
          fromBranchId: PASAY,
          toBranchId: PASAY,
          productId: frameId,
          quantity: 1,
        })
        .expect(422);
      expect(same.body.error.fields).toHaveProperty('toBranchId');
    });

    it('branch guard: staff only work with their own branches', async () => {
      await receive(frameId, 2).expect(200);
      const other = await receive(frameId, 1, taguigStaff, PASAY).expect(403);
      expect(other.body.error.code).toBe('branch_forbidden');
      // Can't send stock out of a branch you don't work at.
      await http()
        .post('/api/inventory/transfer')
        .set(taguigStaff)
        .send({
          fromBranchId: PASAY,
          toBranchId: TAGUIG,
          productId: frameId,
          quantity: 1,
        })
        .expect(403);

      const list = await http()
        .get('/api/inventory')
        .set(taguigStaff)
        .expect(200);
      expect(list.body.total).toBe(0);
      await http()
        .get(`/api/inventory?branchId=${PASAY}`)
        .set(taguigStaff)
        .expect(403);
      const product = await http()
        .get(`/api/products/${frameId}`)
        .set(taguigStaff)
        .expect(200);
      expect(product.body.stock).toEqual([]);

      const adminView = await http()
        .get('/api/inventory')
        .set(admin)
        .expect(200);
      expect(adminView.body.total).toBe(1);
      const missing = await receive(frameId, 1, admin, MISSING).expect(404);
      expect(missing.body.error.code).toBe('not_found');
    });

    it('roles: optometrists read stock only; patients get nothing', async () => {
      await receive(frameId, 1).expect(200);
      await http().get('/api/inventory').set(doctor).expect(200);
      await receive(frameId, 1, doctor).expect(403);
      await http().get('/api/inventory/movements').set(doctor).expect(403);
      await http().get('/api/inventory').set(patient).expect(403);
    });

    it('low-stock list and reorder levels', async () => {
      const second = (
        await frame({ sku: 'FR-2', name: 'Bench frame', price: 900 }).expect(
          201,
        )
      ).body.id;
      await receive(frameId, 10).expect(200);
      await receive(second, 2).expect(200);

      const low = await http()
        .get('/api/inventory?lowStock=true')
        .set(staff)
        .expect(200);
      expect(
        low.body.items.map((r: { product: { id: string } }) => r.product.id),
      ).toEqual([second]);

      const set = await http()
        .put('/api/inventory/reorder-level')
        .set(staff)
        .send({ branchId: PASAY, productId: frameId, reorderLevel: 12 })
        .expect(200);
      expect(set.body).toMatchObject({ reorderLevel: 12, isLow: true });
      const low2 = await http()
        .get('/api/inventory?lowStock=true')
        .set(staff)
        .expect(200);
      expect(low2.body.total).toBe(2);

      // Setting a level before any stock creates an empty row.
      const fresh = await http()
        .put('/api/inventory/reorder-level')
        .set(staff)
        .send({ branchId: TAGUIG, productId: frameId, reorderLevel: 1 })
        .expect(403);
      expect(fresh.body.error.code).toBe('branch_forbidden');
      const empty = await http()
        .put('/api/inventory/reorder-level')
        .set(admin)
        .send({ branchId: TAGUIG, productId: frameId, reorderLevel: 1 })
        .expect(200);
      expect(empty.body).toMatchObject({
        quantity: 0,
        reorderLevel: 1,
        isLow: true,
      });
    });

    it('search and category filters, services left out of the stock list', async () => {
      await receive(frameId, 1).expect(200);
      const sol = (
        await frame({
          sku: 'SOL-1',
          name: 'Lens solution',
          category: 'solution',
          price: 250,
        }).expect(201)
      ).body.id;
      await receive(sol, 5).expect(200);
      const bySearch = await http()
        .get('/api/inventory?search=wayfarer')
        .set(staff)
        .expect(200);
      expect(bySearch.body.total).toBe(1);
      const byCat = await http()
        .get('/api/inventory?category=solution')
        .set(staff)
        .expect(200);
      expect(byCat.body.items[0].product.id).toBe(sol);
      const all = await http().get('/api/inventory').set(staff).expect(200);
      expect(
        all.body.items.map(
          (r: { product: { name: string } }) => r.product.name,
        ),
      ).toEqual(['Lens solution', 'Ray-Ban Wayfarer']);
    });

    it('movement history with filters', async () => {
      await receive(frameId, 3).expect(200);
      await http()
        .post('/api/inventory/adjust')
        .set(staff)
        .send({
          branchId: PASAY,
          productId: frameId,
          quantityChange: -1,
          reason: 'Broken',
        })
        .expect(200);
      const res = await http()
        .get('/api/inventory/movements')
        .set(staff)
        .expect(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items[0]).toMatchObject({
        type: 'adjustment',
        quantityChange: -1,
        reason: 'Broken',
        product: { id: frameId, sku: 'FR-RB-2140' },
        branch: { id: PASAY },
        createdBy: { fullName: 'staff@mrb.test' },
      });
      const receives = await http()
        .get('/api/inventory/movements?type=receive')
        .set(staff)
        .expect(200);
      expect(receives.body.total).toBe(1);
      const none = await http()
        .get('/api/inventory/movements')
        .set(taguigStaff)
        .expect(200);
      expect(none.body.total).toBe(0);
      await http()
        .get('/api/inventory/movements?from=2026-02-31')
        .set(staff)
        .expect(422);
    });
  });
});
