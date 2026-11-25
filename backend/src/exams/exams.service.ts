import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StorageService } from '../storage/storage.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { BranchAccessService } from '../branches/branch-access.service.js';
import { clinicDayRange, isValidDate } from '../common/clinic-time.js';
import { Page, pageArgs } from '../common/pagination.js';
import { axisErrors } from '../common/refraction.js';
import { patientCode } from '../patients/patients.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  fieldError,
  prescriptionSelect,
  PrescriptionRow,
  PrescriptionView,
  PrescriptionsService,
  RX_FIELDS,
  RxField,
  RxValues,
  rxValuesOf,
  sphereErrors,
  toPrescriptionView,
} from '../prescriptions/prescriptions.service.js';
import {
  CreateExamDto,
  EXAM_IMAGE_MAX_BYTES,
  EXAM_IMAGE_TYPES,
  ExamImageUploadDto,
  ExamStatusName,
  ExamValuesDto,
  FinalizeExamDto,
  ListExamsQueryDto,
  SetExamImageDto,
  UpdateExamDto,
} from './exams.dto.js';

/** Upload URLs from Supabase last 2 hours; view URLs are kept short. */
const UPLOAD_URL_SECONDS = 2 * 60 * 60;
const VIEW_URL_SECONDS = 5 * 60;

const TEXT_FIELDS = [
  'chiefComplaint',
  'odVa',
  'osVa',
  'diagnosis',
  'recommendations',
] as const;
type TextField = (typeof TEXT_FIELDS)[number];
const VALUE_FIELDS = [...RX_FIELDS, ...TEXT_FIELDS] as const;

/** Visits an exam may be attached to. */
const EXAMINABLE = ['checked_in', 'completed'];

const examSelect = {
  id: true,
  status: true,
  source: true,
  examinedAt: true,
  appointmentId: true,
  patientId: true,
  branchId: true,
  optometristId: true,
  chiefComplaint: true,
  odSphere: true,
  odCylinder: true,
  odAxis: true,
  odAdd: true,
  odVa: true,
  osSphere: true,
  osCylinder: true,
  osAxis: true,
  osAdd: true,
  osVa: true,
  pd: true,
  diagnosis: true,
  recommendations: true,
  ocrImagePath: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: { id: true, patientNo: true, fullName: true } },
  branch: { select: { id: true, code: true, name: true } },
  optometrist: { select: { id: true, fullName: true } },
  verifiedBy: { select: { id: true, fullName: true } },
} as const;

const examDetailSelect = {
  ...examSelect,
  ocrRaw: true,
  prescriptions: {
    select: prescriptionSelect,
    orderBy: { issuedAt: 'desc' },
  },
} as const;

interface ExamRow extends Partial<Record<RxField, unknown>> {
  id: string;
  status: ExamStatusName;
  source: 'manual' | 'ocr';
  examinedAt: Date;
  appointmentId: string | null;
  patientId: string;
  branchId: string;
  optometristId: string;
  chiefComplaint: string | null;
  odVa: string | null;
  osVa: string | null;
  diagnosis: string | null;
  recommendations: string | null;
  ocrImagePath: string | null;
  ocrRaw?: unknown;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  patient: { id: string; patientNo: number; fullName: string };
  branch: { id: string; code: string; name: string };
  optometrist: { id: string; fullName: string };
  verifiedBy: { id: string; fullName: string } | null;
  prescriptions?: PrescriptionRow[];
}

export interface ExamView extends RxValues {
  id: string;
  status: ExamStatusName;
  source: 'manual' | 'ocr';
  examinedAt: Date;
  appointmentId: string | null;
  patient: { id: string; code: string; fullName: string };
  branch: { id: string; code: string; name: string };
  optometrist: { id: string; fullName: string };
  chiefComplaint: string | null;
  odVa: string | null;
  osVa: string | null;
  diagnosis: string | null;
  recommendations: string | null;
  ocrImagePath: string | null;
  verifiedBy: { id: string; fullName: string } | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamDetailView extends ExamView {
  ocrRaw: unknown;
  prescriptions: PrescriptionView[];
}

/** The patient's view: the clinical result only, no OCR data or internal ids. */
export interface MyExamView extends RxValues {
  id: string;
  examinedAt: Date;
  branch: { code: string; name: string };
  optometrist: string;
  chiefComplaint: string | null;
  odVa: string | null;
  osVa: string | null;
  diagnosis: string | null;
  recommendations: string | null;
}

const toView = (e: ExamRow): ExamView => ({
  id: e.id,
  status: e.status,
  source: e.source,
  examinedAt: e.examinedAt,
  appointmentId: e.appointmentId,
  patient: {
    id: e.patient.id,
    code: patientCode(e.patient.patientNo),
    fullName: e.patient.fullName,
  },
  branch: e.branch,
  optometrist: e.optometrist,
  chiefComplaint: e.chiefComplaint,
  ...rxValuesOf(e),
  odVa: e.odVa,
  osVa: e.osVa,
  diagnosis: e.diagnosis,
  recommendations: e.recommendations,
  ocrImagePath: e.ocrImagePath,
  verifiedBy: e.verifiedBy,
  verifiedAt: e.verifiedAt,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
});

const toDetailView = (e: ExamRow): ExamDetailView => ({
  ...toView(e),
  ocrRaw: e.ocrRaw ?? null,
  prescriptions: (e.prescriptions ?? []).map(toPrescriptionView),
});

const toMyView = (e: ExamRow): MyExamView => ({
  id: e.id,
  examinedAt: e.examinedAt,
  branch: { code: e.branch.code, name: e.branch.name },
  optometrist: e.optometrist.fullName,
  chiefComplaint: e.chiefComplaint,
  ...rxValuesOf(e),
  odVa: e.odVa,
  osVa: e.osVa,
  diagnosis: e.diagnosis,
  recommendations: e.recommendations,
});

const notFound = () =>
  new NotFoundException({
    error: { code: 'not_found', message: 'Exam not found.' },
  });

const noImage = () =>
  new NotFoundException({
    error: { code: 'no_image', message: 'This exam has no photo.' },
  });

/** Final exams are shared; a draft is seen only by its optometrist and the admin. */
const canSee = (e: { status: string; optometristId: string }, user: AuthUser) =>
  e.status === 'final' || user.role === 'admin' || e.optometristId === user.id;

/** The DTO's clinical fields that were sent (undefined = unchanged), with '' stored as null. */
function sentValues(dto: ExamValuesDto): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of VALUE_FIELDS) {
    const v = dto[f];
    if (v === undefined) continue;
    out[f] = TEXT_FIELDS.includes(f as TextField) && v === '' ? null : v;
  }
  return out;
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BranchAccessService,
    private readonly audit: AuditService,
    private readonly prescriptions: PrescriptionsService,
    private readonly storage: StorageService,
  ) {}

  private readonly logger = new Logger('Exams');

  async create(dto: CreateExamDto, user: AuthUser): Promise<ExamDetailView> {
    await this.access.assertAccess(user, dto.branchId);
    const values = sentValues(dto);
    const axis = axisErrors(values);
    if (Object.keys(axis).length) throw fieldError(axis);

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true },
    });
    if (!patient)
      throw fieldError({ patientId: 'This patient does not exist.' });
    if (dto.appointmentId) await this.checkAppointment(dto);

    const row = (await this.prisma.eyeExam.create({
      data: {
        patientId: dto.patientId,
        branchId: dto.branchId,
        appointmentId: dto.appointmentId ?? null,
        optometristId: user.id,
        status: 'draft',
        source: 'manual',
        ...values,
      },
      select: examDetailSelect,
    })) as ExamRow;
    await this.audit.log({
      userId: user.id,
      action: 'exam.create',
      entity: 'eye_exam',
      entityId: row.id,
      data: { patientId: row.patientId, branchId: row.branchId },
    });
    return toDetailView(row);
  }

  private async checkAppointment(dto: CreateExamDto): Promise<void> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      select: { id: true, patientId: true, branchId: true, status: true },
    });
    if (
      !appt ||
      appt.patientId !== dto.patientId ||
      appt.branchId !== dto.branchId
    ) {
      throw fieldError({
        appointmentId: 'This visit is not for this patient at this branch.',
      });
    }
    if (!EXAMINABLE.includes(appt.status)) {
      throw new ConflictException({
        error: {
          code: 'invalid_status',
          message: 'Check the patient in before starting the exam.',
        },
      });
    }
    const existing = await this.prisma.eyeExam.findUnique({
      where: { appointmentId: appt.id },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        error: {
          code: 'appointment_has_exam',
          message: 'This visit already has an exam.',
        },
      });
    }
  }

  async update(
    id: string,
    dto: UpdateExamDto,
    user: AuthUser,
  ): Promise<ExamDetailView> {
    const current = await this.ownDraft(id, user);
    const changes = sentValues(dto);
    const axis = axisErrors({ ...rxValuesOf(current), ...changes });
    if (Object.keys(axis).length) throw fieldError(axis);

    const row = (await this.prisma.eyeExam.update({
      where: { id },
      data: changes,
      select: examDetailSelect,
    })) as ExamRow;
    await this.audit.log({
      userId: user.id,
      action: 'exam.update',
      entity: 'eye_exam',
      entityId: id,
      data: { fields: Object.keys(changes) },
    });
    return toDetailView(row);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const current = await this.ownDraft(id, user);
    await this.prisma.eyeExam.delete({ where: { id } });
    if (current.ocrImagePath) await this.removeFile(current.ocrImagePath);
    await this.audit.log({
      userId: user.id,
      action: 'exam.delete',
      entity: 'eye_exam',
      entityId: id,
      data: { patientId: current.patientId },
    });
  }

  // ── Paper-record photo (signed URLs, the file never passes through the API) ──

  /** Step 1: a one-time URL the app PUTs the photo to. */
  async imageUploadUrl(id: string, dto: ExamImageUploadDto, user: AuthUser) {
    await this.ownDraft(id, user);
    const path = `exams/${id}/${randomUUID()}.${EXAM_IMAGE_TYPES[dto.contentType]}`;
    const signed = await this.storage.createUploadUrl(path);
    return {
      path,
      uploadUrl: signed.uploadUrl,
      token: signed.token,
      contentType: dto.contentType,
      maxBytes: EXAM_IMAGE_MAX_BYTES,
      expiresIn: UPLOAD_URL_SECONDS,
    };
  }

  /** Step 2: after the upload, attach the file to the exam (replacing any old photo). */
  async setImage(
    id: string,
    dto: SetExamImageDto,
    user: AuthUser,
  ): Promise<ExamDetailView> {
    const current = await this.ownDraft(id, user);
    const pattern = new RegExp(
      `^exams/${id}/[0-9a-f-]{36}\\.(${Object.values(EXAM_IMAGE_TYPES).join('|')})$`,
    );
    if (!pattern.test(dto.path)) {
      throw fieldError({ path: 'Use the path from the upload URL step.' });
    }
    const stored = await this.storage.stat(dto.path);
    if (!stored) {
      throw fieldError({ path: 'The photo has not been uploaded yet.' });
    }
    if (
      stored.size > EXAM_IMAGE_MAX_BYTES ||
      !Object.keys(EXAM_IMAGE_TYPES).includes(stored.mimetype)
    ) {
      await this.removeFile(dto.path);
      throw fieldError({
        path: 'Use a JPEG, PNG or WebP photo of at most 10 MB.',
      });
    }

    const row = (await this.prisma.eyeExam.update({
      where: { id },
      data: { ocrImagePath: dto.path },
      select: examDetailSelect,
    })) as ExamRow;
    if (current.ocrImagePath && current.ocrImagePath !== dto.path) {
      await this.removeFile(current.ocrImagePath);
    }
    await this.audit.log({
      userId: user.id,
      action: 'exam.image_set',
      entity: 'eye_exam',
      entityId: id,
      data: { size: stored.size, mimetype: stored.mimetype },
    });
    return toDetailView(row);
  }

  async removeImage(id: string, user: AuthUser): Promise<void> {
    const current = await this.ownDraft(id, user);
    if (!current.ocrImagePath) throw noImage();
    await this.prisma.eyeExam.update({
      where: { id },
      data: { ocrImagePath: null },
      select: { id: true },
    });
    await this.removeFile(current.ocrImagePath);
    await this.audit.log({
      userId: user.id,
      action: 'exam.image_remove',
      entity: 'eye_exam',
      entityId: id,
    });
  }

  /** A short-lived link to view the photo. Same visibility as GET /exams/:id. */
  async imageUrl(id: string, user: AuthUser) {
    const exam = await this.get(id, user);
    if (!exam.ocrImagePath) throw noImage();
    return {
      url: await this.storage.createDownloadUrl(
        exam.ocrImagePath,
        VIEW_URL_SECONDS,
      ),
      expiresIn: VIEW_URL_SECONDS,
    };
  }

  /** Cleanup never blocks the action: a leftover file is only logged. */
  private async removeFile(path: string): Promise<void> {
    try {
      await this.storage.remove([path]);
    } catch {
      this.logger.warn(`Could not delete stored file for an exam: ${path}`);
    }
  }

  /** Sign the exam. Optionally issue the prescription in the same transaction. */
  async finalize(
    id: string,
    dto: FinalizeExamDto,
    user: AuthUser,
  ): Promise<ExamDetailView> {
    const current = await this.ownDraft(id, user);
    const values = rxValuesOf(current);
    const fields = { ...sphereErrors(values), ...axisErrors(values) };
    if (Object.keys(fields).length) throw fieldError(fields);

    const sign = this.prisma.eyeExam.update({
      where: { id },
      data: { status: 'final', verifiedById: user.id, verifiedAt: new Date() },
      select: { id: true },
    });
    let rx: { id: string; examId: string | null } | undefined;
    if (dto.createPrescription) {
      const data = this.prescriptions.dataFromExam(current, dto, user.id);
      const [, created] = await this.prisma.$transaction([
        sign,
        this.prisma.prescription.create({
          data,
          select: { id: true, examId: true },
        }),
      ]);
      rx = created;
    } else {
      await sign;
    }

    await this.audit.log({
      userId: user.id,
      action: 'exam.finalize',
      entity: 'eye_exam',
      entityId: id,
      data: { prescriptionId: rx?.id ?? null },
    });
    if (rx) await this.prescriptions.logCreate(rx, user);
    return this.get(id, user);
  }

  async list(
    query: ListExamsQueryDto,
    user: AuthUser,
  ): Promise<Page<ExamView>> {
    const range = this.dateRange(query);
    const where = {
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.optometristId ? { optometristId: query.optometristId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(range ? { examinedAt: range } : {}),
      ...(user.role === 'admin'
        ? {}
        : {
            OR: [
              { status: 'final' as const },
              { status: 'draft' as const, optometristId: user.id },
            ],
          }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.eyeExam.findMany({
        where,
        select: examSelect,
        orderBy: { examinedAt: 'desc' },
        ...pageArgs(query),
      }),
      this.prisma.eyeExam.count({ where }),
    ]);
    return {
      items: (rows as ExamRow[]).map(toView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string, user: AuthUser): Promise<ExamDetailView> {
    const row = (await this.prisma.eyeExam.findUnique({
      where: { id },
      select: examDetailSelect,
    })) as ExamRow | null;
    if (!row || !canSee(row, user)) throw notFound();
    return toDetailView(row);
  }

  /** The logged-in patient's final exams, newest first. No patient file → empty list. */
  async mine(user: AuthUser): Promise<MyExamView[]> {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!patient) return [];
    const rows = (await this.prisma.eyeExam.findMany({
      where: { patientId: patient.id, status: 'final' },
      select: examSelect,
      orderBy: { examinedAt: 'desc' },
    })) as ExamRow[];
    return rows.map(toMyView);
  }

  /** The exam, if it is a draft of this optometrist. */
  private async ownDraft(id: string, user: AuthUser): Promise<ExamRow> {
    const row = (await this.prisma.eyeExam.findUnique({
      where: { id },
      select: examSelect,
    })) as ExamRow | null;
    if (!row) throw notFound();
    if (row.optometristId !== user.id) {
      throw new ForbiddenException({
        error: {
          code: 'not_your_exam',
          message: 'Only the optometrist who started this exam can change it.',
        },
      });
    }
    if (row.status !== 'draft') {
      throw new ConflictException({
        error: {
          code: 'exam_final',
          message:
            'This exam is final and cannot be changed. Issue a new prescription for a correction.',
        },
      });
    }
    return row;
  }

  private dateRange(
    query: ListExamsQueryDto,
  ): { gte: Date; lt: Date } | undefined {
    for (const [field, value] of [
      ['from', query.from],
      ['to', query.to],
    ] as const) {
      if (value && !isValidDate(value))
        throw fieldError({ [field]: 'Enter a real date.' });
    }
    if (!query.from && !query.to) return undefined;
    return {
      gte: query.from ? clinicDayRange(query.from).start : new Date(0),
      lt: query.to ? clinicDayRange(query.to).end : new Date(8.64e15),
    };
  }
}
