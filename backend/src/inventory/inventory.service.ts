import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { BranchAccessService } from '../branches/branch-access.service.js';
import { clinicDayRange, isValidDate } from '../common/clinic-time.js';
import { decimalToNumber } from '../common/decimal.js';
import { Page, pageArgs } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { fieldError } from '../prescriptions/prescriptions.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  isLow,
  isStocked,
  ProductRow,
  ProductsService,
  searchWhere,
} from '../products/products.service.js';
import { SettingsService } from '../settings/settings.service.js';
import {
  AdjustStockDto,
  ListInventoryQueryDto,
  ListMovementsQueryDto,
  MovementTypeName,
  ReceiveStockDto,
  SetReorderLevelDto,
  TransferStockDto,
} from './inventory.dto.js';

type BranchRef = { id: string; code: string; name: string };
type ProductRef = {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string | null;
  price: number;
  isActive: boolean;
};

export interface InventoryView {
  product: ProductRef;
  branch: BranchRef;
  quantity: number;
  reorderLevel: number;
  isLow: boolean;
  updatedAt: Date;
}

export interface MovementView {
  id: string;
  type: MovementTypeName;
  quantityChange: number;
  reason: string | null;
  orderId: string | null;
  product: { id: string; sku: string; name: string };
  branch: BranchRef;
  createdBy: { id: string; fullName: string } | null;
  createdAt: Date;
}

/** One change to one branch's stock. Orders use this for sales and returns. */
export interface MovementInput {
  productId: string;
  branchId: string;
  type: MovementTypeName;
  /** + in, − out. Never 0. */
  quantityChange: number;
  reason?: string | null;
  orderId?: string | null;
  userId: string | null;
  /** Reorder level for a branch row created by this movement. */
  defaultReorderLevel: number;
}

const inventorySelect = {
  quantity: true,
  reorderLevel: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      sku: true,
      name: true,
      category: true,
      brand: true,
      price: true,
      isActive: true,
    },
  },
  branch: { select: { id: true, code: true, name: true } },
} as const;

const movementSelect = {
  id: true,
  type: true,
  quantityChange: true,
  reason: true,
  orderId: true,
  createdAt: true,
  product: { select: { id: true, sku: true, name: true } },
  branch: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, fullName: true } },
} as const;

interface InventoryRow {
  quantity: number;
  reorderLevel: number;
  updatedAt: Date;
  product: Omit<ProductRef, 'price'> & { price: unknown };
  branch: BranchRef;
}

export const insufficientStock = (available: number) =>
  new ConflictException({
    error: {
      code: 'insufficient_stock',
      message: `Not enough stock. Only ${available} left at this branch.`,
    },
  });

const notStocked = () =>
  new ConflictException({
    error: {
      code: 'not_stocked',
      message: 'Services have no stock.',
    },
  });

const productInactive = () =>
  new ConflictException({
    error: {
      code: 'product_inactive',
      message: 'This product is retired. Make it active again first.',
    },
  });

const toInventoryView = (row: InventoryRow): InventoryView => ({
  product: {
    id: row.product.id,
    sku: row.product.sku,
    name: row.product.name,
    category: row.product.category,
    brand: row.product.brand,
    price: decimalToNumber(row.product.price) ?? 0,
    isActive: row.product.isActive,
  },
  branch: row.branch,
  quantity: row.quantity,
  reorderLevel: row.reorderLevel,
  isLow: isLow(row.quantity, row.reorderLevel),
  updatedAt: row.updatedAt,
});

/**
 * Applies one stock change inside a transaction and records the movement.
 * Removing more than is there throws 409 insufficient_stock (and rolls the transaction back).
 */
export async function applyMovement(
  tx: Prisma.TransactionClient,
  input: MovementInput,
): Promise<void> {
  const key = { productId: input.productId, branchId: input.branchId };
  if (input.quantityChange > 0) {
    await tx.inventoryItem.upsert({
      where: { productId_branchId: key },
      create: {
        ...key,
        quantity: input.quantityChange,
        reorderLevel: input.defaultReorderLevel,
      },
      update: { quantity: { increment: input.quantityChange } },
    });
  } else {
    const take = -input.quantityChange;
    // Only succeeds when enough is there, so two sales at once can't push stock below zero.
    const { count } = await tx.inventoryItem.updateMany({
      where: { ...key, quantity: { gte: take } },
      data: { quantity: { decrement: take } },
    });
    if (count === 0) {
      const row = await tx.inventoryItem.findUnique({
        where: { productId_branchId: key },
        select: { quantity: true },
      });
      throw insufficientStock(row?.quantity ?? 0);
    }
  }
  await tx.stockMovement.create({
    data: {
      ...key,
      type: input.type,
      quantityChange: input.quantityChange,
      reason: input.reason ?? null,
      orderId: input.orderId ?? null,
      createdById: input.userId,
    },
  });
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branches: BranchAccessService,
    private readonly products: ProductsService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** Stock rows at your branches. Filtering low stock compares two columns, so it's done here. */
  async list(
    query: ListInventoryQueryDto,
    user: AuthUser,
  ): Promise<Page<InventoryView>> {
    const branchId = await this.branches.branchFilter(user, query.branchId);
    const product: Prisma.ProductWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...searchWhere(query.search),
    };
    const rows = (await this.prisma.inventoryItem.findMany({
      where: {
        ...(branchId === undefined ? {} : { branchId }),
        product: {
          ...product,
          category: product.category ?? { not: 'service' },
        },
      },
      select: inventorySelect,
    })) as InventoryRow[];

    const items = rows
      .map(toInventoryView)
      .filter((r) => (query.lowStock ? r.isLow : true))
      .sort(
        (a, b) =>
          a.product.name.localeCompare(b.product.name) ||
          a.branch.name.localeCompare(b.branch.name),
      );
    const { skip, take } = pageArgs(query);
    return {
      items: items.slice(skip, skip + take),
      total: items.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** A delivery came in. */
  async receive(dto: ReceiveStockDto, user: AuthUser): Promise<InventoryView> {
    const product = await this.stockable(dto.productId, { mustBeActive: true });
    await this.assertBranch(user, dto.branchId);
    await this.run([
      {
        productId: product.id,
        branchId: dto.branchId,
        type: 'receive',
        quantityChange: dto.quantity,
        reason: dto.reason,
        userId: user.id,
      },
    ]);
    await this.audit.log({
      userId: user.id,
      action: 'inventory.receive',
      entity: 'product',
      entityId: product.id,
      data: { branchId: dto.branchId, quantity: dto.quantity },
    });
    return this.row(product.id, dto.branchId);
  }

  /** A correction: counted stock differs, an item broke or went missing. */
  async adjust(dto: AdjustStockDto, user: AuthUser): Promise<InventoryView> {
    const product = await this.stockable(dto.productId, {
      mustBeActive: dto.quantityChange > 0,
    });
    await this.assertBranch(user, dto.branchId);
    await this.run([
      {
        productId: product.id,
        branchId: dto.branchId,
        type: 'adjustment',
        quantityChange: dto.quantityChange,
        reason: dto.reason,
        userId: user.id,
      },
    ]);
    await this.audit.log({
      userId: user.id,
      action: 'inventory.adjust',
      entity: 'product',
      entityId: product.id,
      data: {
        branchId: dto.branchId,
        quantityChange: dto.quantityChange,
        reason: dto.reason,
      },
    });
    return this.row(product.id, dto.branchId);
  }

  /** Moves stock from one branch to another in one step. You must work at the branch it leaves. */
  async transfer(
    dto: TransferStockDto,
    user: AuthUser,
  ): Promise<{ from: InventoryView; to: InventoryView }> {
    if (dto.fromBranchId === dto.toBranchId) {
      throw fieldError({ toBranchId: 'Choose a different branch.' });
    }
    const product = await this.stockable(dto.productId, { mustBeActive: true });
    await this.assertBranch(user, dto.fromBranchId);
    const to = await this.prisma.branch.findUnique({
      where: { id: dto.toBranchId },
      select: { id: true, code: true },
    });
    if (!to) throw fieldError({ toBranchId: 'Branch not found.' });
    const from = await this.prisma.branch.findUnique({
      where: { id: dto.fromBranchId },
      select: { code: true },
    });

    const reason = dto.reason ?? null;
    await this.run([
      {
        productId: product.id,
        branchId: dto.fromBranchId,
        type: 'transfer_out',
        quantityChange: -dto.quantity,
        reason: reason ?? `Transfer to ${to.code}`,
        userId: user.id,
      },
      {
        productId: product.id,
        branchId: dto.toBranchId,
        type: 'transfer_in',
        quantityChange: dto.quantity,
        reason: reason ?? `Transfer from ${from?.code ?? ''}`,
        userId: user.id,
      },
    ]);
    await this.audit.log({
      userId: user.id,
      action: 'inventory.transfer',
      entity: 'product',
      entityId: product.id,
      data: {
        fromBranchId: dto.fromBranchId,
        toBranchId: dto.toBranchId,
        quantity: dto.quantity,
      },
    });
    const [fromRow, toRow] = await Promise.all([
      this.row(product.id, dto.fromBranchId),
      this.row(product.id, dto.toBranchId),
    ]);
    return { from: fromRow, to: toRow };
  }

  async setReorderLevel(
    dto: SetReorderLevelDto,
    user: AuthUser,
  ): Promise<InventoryView> {
    const product = await this.stockable(dto.productId, {
      mustBeActive: false,
    });
    await this.assertBranch(user, dto.branchId);
    await this.prisma.inventoryItem.upsert({
      where: {
        productId_branchId: { productId: product.id, branchId: dto.branchId },
      },
      create: {
        productId: product.id,
        branchId: dto.branchId,
        quantity: 0,
        reorderLevel: dto.reorderLevel,
      },
      update: { reorderLevel: dto.reorderLevel },
    });
    await this.audit.log({
      userId: user.id,
      action: 'inventory.reorder_level',
      entity: 'product',
      entityId: product.id,
      data: { branchId: dto.branchId, reorderLevel: dto.reorderLevel },
    });
    return this.row(product.id, dto.branchId);
  }

  async movements(
    query: ListMovementsQueryDto,
    user: AuthUser,
  ): Promise<Page<MovementView>> {
    for (const [field, value] of [
      ['from', query.from],
      ['to', query.to],
    ] as const) {
      if (value && !isValidDate(value))
        throw fieldError({ [field]: 'Enter a real date.' });
    }
    const branchId = await this.branches.branchFilter(user, query.branchId);
    const where: Prisma.StockMovementWhereInput = {
      ...(branchId === undefined ? {} : { branchId }),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              gte: query.from ? clinicDayRange(query.from).start : new Date(0),
              lt: query.to ? clinicDayRange(query.to).end : new Date(8.64e15),
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        select: movementSelect,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query),
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return {
      items: rows as MovementView[],
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Runs stock changes as one transaction (all or nothing). */
  async run(
    inputs: Omit<MovementInput, 'defaultReorderLevel'>[],
  ): Promise<void> {
    const { lowStockThreshold } = await this.settings.get();
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const input of inputs) {
        await applyMovement(tx, {
          ...input,
          defaultReorderLevel: lowStockThreshold,
        });
      }
    });
  }

  private async stockable(
    productId: string,
    { mustBeActive }: { mustBeActive: boolean },
  ): Promise<ProductRow> {
    const product = await this.products.find(productId);
    if (!isStocked(product.category)) throw notStocked();
    if (mustBeActive && !product.isActive) throw productInactive();
    return product;
  }

  /** The branch must exist and the user must work there. */
  private async assertBranch(user: AuthUser, branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException({
        error: { code: 'not_found', message: 'Branch not found.' },
      });
    }
    await this.branches.assertAccess(user, branchId);
  }

  private async row(
    productId: string,
    branchId: string,
  ): Promise<InventoryView> {
    const row = (await this.prisma.inventoryItem.findUnique({
      where: { productId_branchId: { productId, branchId } },
      select: inventorySelect,
    })) as InventoryRow;
    return toInventoryView(row);
  }
}
