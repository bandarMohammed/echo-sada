import { prisma } from "@/lib/prisma";
import type { AuthzDeps } from "./policy";

/** Prisma-backed implementation of the authorization dependencies. */
export const prismaAuthzDeps: AuthzDeps = {
  async isDoctorLinked(doctorId: string, patientId: string): Promise<boolean> {
    const link = await prisma.patientDoctorRelationship.findUnique({
      where: { patientId_doctorId: { patientId, doctorId } },
      select: { status: true },
    });
    return link?.status === "ACTIVE";
  },
};
