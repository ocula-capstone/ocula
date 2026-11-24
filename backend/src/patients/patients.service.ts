import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { TokenService } from '../auth/token.service.js';
import {
  emailTaken,
  phoneTaken,
  rethrowUserConflict,
} from '../common/conflicts.js';
import { Page, pageArgs } from '../common/pagination.js';
import { hashPassword } from '../common/password.js';
import { temporaryPassword } from '../common/temporary-password.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { definedFields } from '../settings/settings.service.js';
import {
  CreatePatientDto,
  GivePortalAccessDto,
  ListPatientsQueryDto,
  UpdateMyPatientDto,
  UpdatePatientDto,
} from './patients.dto.js';

export interface PatientView {
  id: string;
  patientNo: number;
  /** patientNo for display, e.g. "P-000123". */
  code: string;
  fullName: string;
  phone: string | null;
  birthDate: string | null; // YYYY-MM-DD
  sex: 'male' | 'female' | null;
  address: string | null;
  occupation: string | null;
  companyName: string | null;
  notes: string | null;
  homeBranch: { id: string; code: string; name: string } | null;
  /** The portal login, or null for a file without one. */
  account: {
    id: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const patientSelect = {
  id: true,
  patientNo: true,
  fullName: true,
  phone: true,
  birthDate: true,
  sex: true,
  address: true,
  occupation: true,
  companyName: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  homeBranch: { select: { id: true, code: true, name: true } },
  user: { select: { id: true, email: true, phone: true, isActive: true } },
} as const;

type PatientRow = Omit<
  PatientView,
  'code' | 'birthDate' | 'account' | 'sex'
> & {
  sex: string | null;
  birthDate: Date | null;
  user: PatientView['account'];
};

export const patientCode = (n: number) => `P-${String(n).padStart(6, '0')}`;

const toView = (p: PatientRow): PatientView => ({
  id: p.id,
  patientNo: p.patientNo,
  code: patientCode(p.patientNo),
  fullName: p.fullName,
  phone: p.phone,
  birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : null,
  sex: (p.sex as PatientView['sex']) ?? null,
  address: p.address,
  occupation: p.occupation,
  companyName: p.companyName,
  notes: p.notes,
  homeBranch: p.homeBranch,
  account: p.user,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

const notFound = () =>
  new NotFoundException({
    error: { code: 'not_found', message: 'Patient not found.' },
  });

const fieldError = (field: string, message: string) =>
  new UnprocessableEntityException({
    error: {
      code: 'validation_failed',
      message: 'Please check the highlighted fields.',
      fields: { [field]: message },
    },
  });

/** "1985-07-02" → a Date at UTC midnight; throws a field error if it isn't in the past. */
function toBirthDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined || value === null) return value;
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.getTime() >= Date.now()) {
    throw fieldError('birthDate', 'Enter a date in the past.');
  }
  return date;
}

/**
 * Patient files. Shared by both branches.
 * A file may exist without a login (walk-ins, field work, children); "give portal access" adds one.
 */
@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListPatientsQueryDto): Promise<Page<PatientView>> {
    const where: Prisma.PatientWhereInput = {
      ...(query.homeBranchId ? { homeBranchId: query.homeBranchId } : {}),
      ...(query.hasAccount === true ? { userId: { not: null } } : {}),
      ...(query.hasAccount === false ? { userId: null } : {}),
      ...(query.companyName
        ? { companyName: { equals: query.companyName, mode: 'insensitive' } }
        : {}),
      ...(query.search ? { OR: searchConditions(query.search) } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        select: patientSelect,
        orderBy: { fullName: 'asc' },
        ...pageArgs(query),
      }),
      this.prisma.patient.count({ where }),
    ]);
    return {
      items: (rows as PatientRow[]).map(toView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string): Promise<PatientView> {
    return toView(await this.find(id));
  }

  /** Path B: staff open a file at the counter or on site. No login is created. */
  async create(dto: CreatePatientDto, actorId: string): Promise<PatientView> {
    if (dto.homeBranchId) await this.assertBranchExists(dto.homeBranchId);
    const fields = definedFields(dto);
    const row = (await this.prisma.patient.create({
      data: {
        ...fields,
        fullName: dto.fullName,
        birthDate: toBirthDate(dto.birthDate) ?? null,
      },
      select: patientSelect,
    })) as PatientRow;
    const view = toView(row);
    await this.audit.log({
      userId: actorId,
      action: 'patient.create',
      entity: 'patient',
      entityId: view.id,
      data: { code: view.code, fullName: view.fullName },
    });
    return view;
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
    actorId: string,
  ): Promise<PatientView> {
    const before = toView(await this.find(id));
    if (dto.homeBranchId) await this.assertBranchExists(dto.homeBranchId);
    const fields = definedFields(dto);
    const birthDate = toBirthDate(dto.birthDate);

    const row = (await this.prisma.patient.update({
      where: { id },
      data: { ...fields, ...(birthDate !== undefined ? { birthDate } : {}) },
      select: patientSelect,
    })) as PatientRow;
    const after = toView(row);

    // The login shows the same name as the file.
    if (after.account && dto.fullName && dto.fullName !== before.fullName) {
      await this.prisma.user.update({
        where: { id: after.account.id },
        data: { fullName: dto.fullName },
      });
    }

    const changes = diff(before, after);
    if (Object.keys(changes).length) {
      await this.audit.log({
        userId: actorId,
        action: 'patient.update',
        entity: 'patient',
        entityId: id,
        data: changes,
      });
    }
    return after;
  }

  /**
   * Path B, later: creates the patient's login with a one-time temporary password.
   * The login phone defaults to the file's contact number.
   */
  async givePortalAccess(
    id: string,
    dto: GivePortalAccessDto,
    actorId: string,
  ): Promise<{ patient: PatientView; temporaryPassword: string }> {
    const patient = toView(await this.find(id));
    if (patient.account) {
      throw new ConflictException({
        error: {
          code: 'already_has_account',
          message:
            'This patient already has a portal login. Use reset password instead.',
        },
      });
    }
    const phone = dto.phone ?? patient.phone;
    if (!phone) {
      throw fieldError(
        'phone',
        'Enter the mobile number the patient will log in with.',
      );
    }
    if (
      await this.prisma.user.findUnique({
        where: { phone },
        select: { id: true },
      })
    ) {
      throw phoneTaken();
    }
    if (
      dto.email &&
      (await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      }))
    ) {
      throw emailTaken();
    }

    const password = temporaryPassword();
    try {
      await this.prisma.user.create({
        data: {
          phone,
          email: dto.email ?? null,
          fullName: patient.fullName,
          role: 'patient',
          passwordHash: await hashPassword(password),
          mustChangePassword: true,
          patient: { connect: { id } },
        },
        select: { id: true },
      });
    } catch (error) {
      rethrowUserConflict(error);
    }

    if (!patient.phone) {
      await this.prisma.patient.update({ where: { id }, data: { phone } });
    }
    const view = toView(await this.find(id));
    await this.audit.log({
      userId: actorId,
      action: 'patient.portal_access',
      entity: 'patient',
      entityId: id,
      data: { phone, email: dto.email ?? null },
    });
    return { patient: view, temporaryPassword: password };
  }

  /** Staff reset, e.g. after checking the patient by phone call. Logs the patient out everywhere. */
  async resetPassword(
    id: string,
    actorId: string,
  ): Promise<{ temporaryPassword: string }> {
    const patient = toView(await this.find(id));
    if (!patient.account) {
      throw new ConflictException({
        error: {
          code: 'no_account',
          message:
            'This patient has no portal login yet. Use give portal access instead.',
        },
      });
    }
    const password = temporaryPassword();
    await this.prisma.user.update({
      where: { id: patient.account.id },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
    });
    await this.tokens.revokeAllForUser(patient.account.id);
    await this.audit.log({
      userId: actorId,
      action: 'patient.reset_password',
      entity: 'patient',
      entityId: id,
    });
    return { temporaryPassword: password };
  }

  // ── The patient's own file ──────────────────────────────────

  /** Staff notes stay internal: the patient's own view never includes them. */
  async getMine(userId: string): Promise<PatientView> {
    return { ...toView(await this.findByUser(userId)), notes: null };
  }

  async updateMine(
    userId: string,
    dto: UpdateMyPatientDto,
  ): Promise<PatientView> {
    const before = toView(await this.findByUser(userId));
    const row = (await this.prisma.patient.update({
      where: { id: before.id },
      data: definedFields(dto),
      select: patientSelect,
    })) as PatientRow;
    const after = { ...toView(row), notes: null };
    const changes = diff({ ...before, notes: null }, after);
    if (Object.keys(changes).length) {
      await this.audit.log({
        userId,
        action: 'patient.update_self',
        entity: 'patient',
        entityId: before.id,
        data: changes,
      });
    }
    return after;
  }

  private async find(id: string): Promise<PatientRow> {
    const row = (await this.prisma.patient.findUnique({
      where: { id },
      select: patientSelect,
    })) as PatientRow | null;
    if (!row) throw notFound();
    return row;
  }

  private async findByUser(userId: string): Promise<PatientRow> {
    const row = (await this.prisma.patient.findUnique({
      where: { userId },
      select: patientSelect,
    })) as PatientRow | null;
    if (!row) {
      throw new ForbiddenException({
        error: {
          code: 'forbidden',
          message: 'Only patients have a patient file.',
        },
      });
    }
    return row;
  }

  private async assertBranchExists(id: string): Promise<void> {
    const found = await this.prisma.branch.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw fieldError('homeBranchId', 'This branch does not exist.');
  }
}

/** Search by name, phone, email or patient number. */
function searchConditions(raw: string): Prisma.PatientWhereInput[] {
  const text = raw.trim();
  const conditions: Prisma.PatientWhereInput[] = [
    { fullName: { contains: text, mode: 'insensitive' } },
    { user: { email: { contains: text, mode: 'insensitive' } } },
  ];
  const digits = text.replace(/[\s-]/g, '');
  if (/^\+?\d{4,}$/.test(digits)) {
    conditions.push({
      phone: { contains: digits.replace(/^\+?63/, '').replace(/^0/, '') },
    });
  }
  const no = /^(?:p-?)?0*(\d{1,9})$/i.exec(text);
  if (no) conditions.push({ patientNo: Number(no[1]) });
  return conditions;
}

const AUDITED = [
  'fullName',
  'phone',
  'birthDate',
  'sex',
  'address',
  'occupation',
  'companyName',
  'notes',
] as const;

function diff(
  before: PatientView,
  after: PatientView,
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of AUDITED) {
    if (before[key] !== after[key])
      out[key] = { from: before[key], to: after[key] };
  }
  if (before.homeBranch?.id !== after.homeBranch?.id) {
    out.homeBranch = {
      from: before.homeBranch?.code ?? null,
      to: after.homeBranch?.code ?? null,
    };
  }
  return out;
}
