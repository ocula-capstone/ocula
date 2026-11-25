import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { clinicDateOf, isValidDate } from '../common/clinic-time.js';
import { decimalToNumber } from '../common/decimal.js';
import { Page, pageArgs } from '../common/pagination.js';
import { axisErrors } from '../common/refraction.js';
import type { Prisma } from '../generated/prisma/client.js';
import { patientCode } from '../patients/patients.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreatePrescriptionDto,
  ListPrescriptionsQueryDto,
  PrescriptionTypeName,
  RxOptionsDto,
} from './prescriptions.dto.js';

export const RX_FIELDS = [
  'odSphere',
  'odCylinder',
  'odAxis',
  'odAdd',
  'osSphere',
  'osCylinder',
  'osAxis',
  'osAdd',
  'pd',
] as const;
export type RxField = (typeof RX_FIELDS)[number];
export type RxValues = Record<RxField, number | null>;

export const fieldError = (fields: Record<string, string>) =>
  new UnprocessableEntityException({
    error: {
      code: 'validation_failed',
      message: 'Please check the highlighted fields.',
      fields,
    },
  });

/** The values of a row as plain numbers (Decimals become numbers, empty becomes null). */
export function rxValuesOf(row: Partial<Record<RxField, unknown>>): RxValues {
  return Object.fromEntries(
    RX_FIELDS.map((f) => [f, decimalToNumber(row[f])]),
  ) as RxValues;
}

/** Both spheres are needed before an exam is final or a prescription is issued. */
export function sphereErrors(values: {
  odSphere?: number | null;
  osSphere?: number | null;
}): Record<string, string> {
  const fields: Record<string, string> = {};
  if (values.odSphere === null || values.odSphere === undefined)
    fields.odSphere = 'Enter the sphere for the right eye (OD).';
  if (values.osSphere === null || values.osSphere === undefined)
    fields.osSphere = 'Enter the sphere for the left eye (OS).';
  return fields;
}

/** "2026-11-25" (a Manila date) → a value for a DATE column. */
const toDateColumn = (date: string) => new Date(`${date}T00:00:00.000Z`);
/** A DATE column value → "2026-11-25". */
const fromDateColumn = (d: Date) => d.toISOString().slice(0, 10);

/** One year after the exam's Manila date (29 Feb → 28 Feb). */
export function defaultExpiry(examinedAt: Date): string {
  const [y, m, d] = clinicDateOf(examinedAt).split('-').map(Number);
  const next = `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return isValidDate(next) ? next : `${y + 1}-${String(m).padStart(2, '0')}-28`;
}

export function checkExpiry(expiresAt?: string): void {
  if (expiresAt && !isValidDate(expiresAt))
    throw fieldError({ expiresAt: 'Enter a real date.' });
}

export interface PrescriptionView extends RxValues {
  id: string;
  type: PrescriptionTypeName;
  examId: string | null;
  patient: { id: string; code: string; fullName: string };
  issuedBy: { id: string; fullName: string } | null;
  notes: string | null;
  issuedAt: Date;
  expiresAt: string | null;
  isExpired: boolean;
}

export const prescriptionSelect = {
  id: true,
  type: true,
  examId: true,
  patientId: true,
  odSphere: true,
  odCylinder: true,
  odAxis: true,
  odAdd: true,
  osSphere: true,
  osCylinder: true,
  osAxis: true,
  osAdd: true,
  pd: true,
  notes: true,
  issuedAt: true,
  expiresAt: true,
  patient: { select: { id: true, patientNo: true, fullName: true } },
  issuedBy: { select: { id: true, fullName: true } },
} as const;

export interface PrescriptionRow extends Partial<Record<RxField, unknown>> {
  id: string;
  type: PrescriptionTypeName;
  examId: string | null;
  patientId: string;
  notes: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  patient: { id: string; patientNo: number; fullName: string };
  issuedBy: { id: string; fullName: string } | null;
}

export function toPrescriptionView(row: PrescriptionRow): PrescriptionView {
  const expiresAt = row.expiresAt ? fromDateColumn(row.expiresAt) : null;
  return {
    id: row.id,
    type: row.type,
    examId: row.examId,
    patient: {
      id: row.patient.id,
      code: patientCode(row.patient.patientNo),
      fullName: row.patient.fullName,
    },
    issuedBy: row.issuedBy,
    ...rxValuesOf(row),
    notes: row.notes,
    issuedAt: row.issuedAt,
    expiresAt,
    isExpired: expiresAt !== null && expiresAt < clinicDateOf(new Date()),
  };
}

/** What a patient sees: notes are instructions for them; no staff ids. */
export type MyPrescriptionView = Omit<
  PrescriptionView,
  'patient' | 'issuedBy'
> & { issuedBy: string | null };

const toMyView = (row: PrescriptionRow): MyPrescriptionView => {
  const { patient: _patient, issuedBy, ...rest } = toPrescriptionView(row);
  return { ...rest, issuedBy: issuedBy?.fullName ?? null };
};

export interface ExamForRx extends Partial<Record<RxField, unknown>> {
  id: string;
  patientId: string;
  examinedAt: Date;
}

const notFound = (what = 'Prescription') =>
  new NotFoundException({
    error: { code: 'not_found', message: `${what} not found.` },
  });

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Create data for a prescription copied from an exam. Also used by exam finalize. */
  dataFromExam(
    exam: ExamForRx,
    options: RxOptionsDto,
    userId: string,
  ): Prisma.PrescriptionUncheckedCreateInput {
    checkExpiry(options.expiresAt);
    return {
      patientId: exam.patientId,
      examId: exam.id,
      issuedById: userId,
      type: options.type ?? 'spectacles',
      ...rxValuesOf(exam),
      notes: options.notes ?? null,
      expiresAt: toDateColumn(
        options.expiresAt ?? defaultExpiry(exam.examinedAt),
      ),
    };
  }

  async logCreate(rx: { id: string; examId: string | null }, user: AuthUser) {
    await this.audit.log({
      userId: user.id,
      action: 'prescription.create',
      entity: 'prescription',
      entityId: rx.id,
      data: { examId: rx.examId },
    });
  }

  async create(
    dto: CreatePrescriptionDto,
    user: AuthUser,
  ): Promise<PrescriptionView> {
    const data = dto.examId
      ? await this.fromExam(dto, user)
      : await this.outside(dto, user);
    const row = (await this.prisma.prescription.create({
      data,
      select: prescriptionSelect,
    })) as PrescriptionRow;
    await this.logCreate(row, user);
    return toPrescriptionView(row);
  }

  private async fromExam(dto: CreatePrescriptionDto, user: AuthUser) {
    const exam = await this.prisma.eyeExam.findUnique({
      where: { id: dto.examId },
    });
    // Someone else's draft stays hidden, like on GET /exams/:id.
    if (
      !exam ||
      (exam.status === 'draft' &&
        exam.optometristId !== user.id &&
        user.role !== 'admin')
    ) {
      throw notFound('Exam');
    }
    if (exam.status !== 'final') {
      throw new ConflictException({
        error: {
          code: 'exam_not_final',
          message: 'Finalize the exam before issuing a prescription.',
        },
      });
    }
    if (dto.patientId && dto.patientId !== exam.patientId) {
      throw fieldError({ patientId: 'This exam is for another patient.' });
    }
    return this.dataFromExam(exam as ExamForRx, dto, user.id);
  }

  /** A prescription the patient brought in from another clinic. */
  private async outside(
    dto: CreatePrescriptionDto,
    user: AuthUser,
  ): Promise<Prisma.PrescriptionUncheckedCreateInput> {
    const required: Record<string, string> = {};
    if (!dto.patientId)
      required.patientId = 'Choose the patient, or give an examId.';
    if (!dto.type) required.type = 'Choose spectacles or contact_lens.';
    const fields = { ...required, ...sphereErrors(dto), ...axisErrors(dto) };
    if (Object.keys(fields).length) throw fieldError(fields);
    checkExpiry(dto.expiresAt);

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true },
    });
    if (!patient)
      throw fieldError({ patientId: 'This patient does not exist.' });

    return {
      patientId: patient.id,
      examId: null,
      issuedById: user.id,
      type: dto.type,
      ...Object.fromEntries(RX_FIELDS.map((f) => [f, dto[f] ?? null])),
      notes: dto.notes ?? null,
      expiresAt: dto.expiresAt ? toDateColumn(dto.expiresAt) : null,
    };
  }

  async list(
    query: ListPrescriptionsQueryDto,
  ): Promise<Page<PrescriptionView>> {
    const where = {
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.examId ? { examId: query.examId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        select: prescriptionSelect,
        orderBy: { issuedAt: 'desc' },
        ...pageArgs(query),
      }),
      this.prisma.prescription.count({ where }),
    ]);
    return {
      items: (rows as PrescriptionRow[]).map(toPrescriptionView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string): Promise<PrescriptionView> {
    const row = (await this.prisma.prescription.findUnique({
      where: { id },
      select: prescriptionSelect,
    })) as PrescriptionRow | null;
    if (!row) throw notFound();
    return toPrescriptionView(row);
  }

  /** The logged-in patient's prescriptions, newest first. No patient file → empty list. */
  async mine(user: AuthUser): Promise<MyPrescriptionView[]> {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!patient) return [];
    const rows = (await this.prisma.prescription.findMany({
      where: { patientId: patient.id },
      select: prescriptionSelect,
      orderBy: { issuedAt: 'desc' },
    })) as PrescriptionRow[];
    return rows.map(toMyView);
  }
}
