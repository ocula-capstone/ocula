import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { BranchAccessService } from '../branches/branch-access.service.js';
import { decimalToNumber } from '../common/decimal.js';
import { Page, pageArgs } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CatalogQueryDto,
  CreateProductDto,
  FRAME_FIELDS,
  FrameField,
  ListProductsQueryDto,
  ProductCategoryName,
  UpdateProductDto,
} from './products.dto.js';

/** Categories that never have stock (e.g. the eye exam fee). */
export const UNSTOCKED: ProductCategoryName[] = ['service'];
export const isStocked = (category: string) =>
  !UNSTOCKED.includes(category as ProductCategoryName);

export const productSelect = {
  id: true,
  sku: true,
  name: true,
  category: true,
  brand: true,
  price: true,
  cost: true,
  isActive: true,
  description: true,
  frameModel: true,
  frameColor: true,
  frameSize: true,
  frameMaterial: true,
  frameShape: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: ProductCategoryName;
  brand: string | null;
  price: unknown;
  cost: unknown;
  isActive: boolean;
  description: string | null;
  frameModel: string | null;
  frameColor: string | null;
  frameSize: string | null;
  frameMaterial: string | null;
  frameShape: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BranchStock {
  branch: { id: string; code: string; name: string };
  quantity: number;
  reorderLevel: number;
  isLow: boolean;
}

export interface ProductView {
  id: string;
  sku: string;
  name: string;
  category: ProductCategoryName;
  brand: string | null;
  price: number;
  /** Only for the admin. */
  cost?: number | null;
  isActive: boolean;
  description: string | null;
  frame: Record<FrameField, string | null> | null;
  stocked: boolean;
  /** Stock at the branches this user works at (every branch for the admin). Empty for services. */
  stock: BranchStock[];
  totalQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CatalogProductView {
  id: string;
  sku: string;
  name: string;
  category: ProductCategoryName;
  brand: string | null;
  price: number;
  description: string | null;
  frame: Record<FrameField, string | null> | null;
  stocked: boolean;
  /** Per branch: is there at least one in stock? Empty for services. */
  availability: {
    branch: { id: string; code: string; name: string };
    inStock: boolean;
  }[];
}

interface StockRow {
  productId: string;
  quantity: number;
  reorderLevel: number;
  branch: { id: string; code: string; name: string };
}

const stockSelect = {
  productId: true,
  quantity: true,
  reorderLevel: true,
  branch: { select: { id: true, code: true, name: true } },
} as const;

const notFound = () =>
  new NotFoundException({
    error: { code: 'not_found', message: 'Product not found.' },
  });

const skuTaken = () =>
  new ConflictException({
    error: {
      code: 'sku_taken',
      message: 'Another product already uses this SKU.',
    },
  });

export const isLow = (quantity: number, reorderLevel: number) =>
  quantity <= reorderLevel;

const frameOf = (row: ProductRow): ProductView['frame'] =>
  row.category === 'frame'
    ? (Object.fromEntries(FRAME_FIELDS.map((f) => [f, row[f]])) as Record<
        FrameField,
        string | null
      >)
    : null;

/** On update: frame fields only change on frames; on other categories they are kept empty. */
function frameData(
  category: ProductCategoryName,
  dto: Partial<Record<FrameField, string | null>>,
) {
  return Object.fromEntries(
    FRAME_FIELDS.map((f) => [
      f,
      category === 'frame' ? dto[f] : dto[f] === undefined ? undefined : null,
    ]),
  );
}

export function searchWhere(search?: string): Prisma.ProductWhereInput {
  if (!search) return {};
  const contains = { contains: search, mode: 'insensitive' as const };
  return {
    OR: [
      { name: contains },
      { sku: contains },
      { brand: contains },
      { frameModel: contains },
    ],
  };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branches: BranchAccessService,
    private readonly audit: AuditService,
  ) {}

  async list(
    query: ListProductsQueryDto,
    user: AuthUser,
  ): Promise<Page<ProductView>> {
    const where: Prisma.ProductWhereInput = {
      ...searchWhere(query.search),
      ...(query.category ? { category: query.category } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: { name: 'asc' },
        ...pageArgs(query),
      }),
      this.prisma.product.count({ where }),
    ]);
    const stock = await this.stockFor(
      (rows as ProductRow[]).map((r) => r.id),
      user,
    );
    return {
      items: (rows as ProductRow[]).map((r) =>
        this.toView(r, stock.get(r.id) ?? [], user),
      ),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string, user: AuthUser): Promise<ProductView> {
    const row = await this.find(id);
    const stock = await this.stockFor([id], user);
    return this.toView(row, stock.get(id) ?? [], user);
  }

  async create(dto: CreateProductDto, user: AuthUser): Promise<ProductView> {
    await this.assertSkuFree(dto.sku);
    let row: ProductRow;
    try {
      row = (await this.prisma.product.create({
        data: {
          sku: dto.sku,
          name: dto.name,
          category: dto.category,
          brand: dto.brand ?? null,
          price: dto.price,
          cost: dto.cost ?? null,
          description: dto.description ?? null,
          ...Object.fromEntries(
            FRAME_FIELDS.map((f) => [
              f,
              dto.category === 'frame' ? (dto[f] ?? null) : null,
            ]),
          ),
        },
        select: productSelect,
      })) as ProductRow;
    } catch (error) {
      throw isUniqueError(error) ? skuTaken() : error;
    }
    await this.audit.log({
      userId: user.id,
      action: 'product.create',
      entity: 'product',
      entityId: row.id,
      data: { sku: row.sku, name: row.name, category: row.category },
    });
    return this.toView(row, [], user);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    user: AuthUser,
  ): Promise<ProductView> {
    const current = await this.find(id);
    if (dto.sku && dto.sku !== current.sku) await this.assertSkuFree(dto.sku);
    let row: ProductRow;
    try {
      row = (await this.prisma.product.update({
        where: { id },
        data: {
          sku: dto.sku,
          name: dto.name,
          brand: dto.brand,
          price: dto.price,
          cost: dto.cost,
          description: dto.description,
          isActive: dto.isActive,
          ...frameData(current.category, dto),
        },
        select: productSelect,
      })) as ProductRow;
    } catch (error) {
      throw isUniqueError(error) ? skuTaken() : error;
    }
    const changed = Object.keys(dto).filter(
      (k) => (dto as Record<string, unknown>)[k] !== undefined,
    );
    await this.audit.log({
      userId: user.id,
      action: 'product.update',
      entity: 'product',
      entityId: id,
      data: {
        fields: changed,
        ...(dto.price !== undefined
          ? { priceFrom: decimalToNumber(current.price), priceTo: dto.price }
          : {}),
      },
    });
    const stock = await this.stockFor([id], user);
    return this.toView(row, stock.get(id) ?? [], user);
  }

  /** Public list for the website: active products, no cost, in-stock flag per branch. */
  async catalog(query: CatalogQueryDto): Promise<Page<CatalogProductView>> {
    let onlyIds: string[] | undefined;
    if (query.branchId) {
      const inStock = (await this.prisma.inventoryItem.findMany({
        where: { branchId: query.branchId, quantity: { gt: 0 } },
        select: { productId: true },
      })) as { productId: string }[];
      onlyIds = inStock.map((r) => r.productId);
    }
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...searchWhere(query.search),
      ...(query.category ? { category: query.category } : {}),
      ...(onlyIds ? { id: { in: onlyIds } } : {}),
    };
    const [rows, total, branches] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: { name: 'asc' },
        ...pageArgs(query),
      }),
      this.prisma.product.count({ where }),
      this.prisma.branch.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    const products = rows as ProductRow[];
    const stock = (await this.prisma.inventoryItem.findMany({
      where: { productId: { in: products.map((p) => p.id) } },
      select: { productId: true, branchId: true, quantity: true },
    })) as { productId: string; branchId: string; quantity: number }[];

    return {
      items: products.map((p) => {
        const stocked = isStocked(p.category);
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          brand: p.brand,
          price: decimalToNumber(p.price) ?? 0,
          description: p.description,
          frame: frameOf(p),
          stocked,
          availability: stocked
            ? (branches as { id: string; code: string; name: string }[]).map(
                (b) => ({
                  branch: { id: b.id, code: b.code, name: b.name },
                  inStock: stock.some(
                    (s) =>
                      s.productId === p.id &&
                      s.branchId === b.id &&
                      s.quantity > 0,
                  ),
                }),
              )
            : [],
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** The product, or 404. Used by inventory and (later) orders. */
  async find(id: string): Promise<ProductRow> {
    const row = (await this.prisma.product.findUnique({
      where: { id },
      select: productSelect,
    })) as ProductRow | null;
    if (!row) throw notFound();
    return row;
  }

  private async assertSkuFree(sku: string) {
    const taken = await this.prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (taken) throw skuTaken();
  }

  private async stockFor(
    productIds: string[],
    user: AuthUser,
  ): Promise<Map<string, StockRow[]>> {
    const map = new Map<string, StockRow[]>();
    if (productIds.length === 0) return map;
    const branchId = await this.branches.branchFilter(user);
    const rows = (await this.prisma.inventoryItem.findMany({
      where: {
        productId: { in: productIds },
        ...(branchId === undefined ? {} : { branchId }),
      },
      select: stockSelect,
    })) as StockRow[];
    for (const r of rows) {
      const list = map.get(r.productId) ?? [];
      list.push(r);
      map.set(r.productId, list);
    }
    return map;
  }

  private toView(
    row: ProductRow,
    stock: StockRow[],
    user: AuthUser,
  ): ProductView {
    const stocked = isStocked(row.category);
    const list: BranchStock[] = stocked
      ? stock
          .map((s) => ({
            branch: s.branch,
            quantity: s.quantity,
            reorderLevel: s.reorderLevel,
            isLow: isLow(s.quantity, s.reorderLevel),
          }))
          .sort((a, b) => a.branch.name.localeCompare(b.branch.name))
      : [];
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      brand: row.brand,
      price: decimalToNumber(row.price) ?? 0,
      ...(user.role === 'admin' ? { cost: decimalToNumber(row.cost) } : {}),
      isActive: row.isActive,
      description: row.description,
      frame: frameOf(row),
      stocked,
      stock: list,
      totalQuantity: list.reduce((sum, s) => sum + s.quantity, 0),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const isUniqueError = (error: unknown) =>
  (error as { code?: string } | null)?.code === 'P2002';
