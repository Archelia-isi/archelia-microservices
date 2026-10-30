import { PrismaClient } from '@prisma/client-sdr';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForSdrPrisma = globalThis as unknown as {
  sdrPrisma: PrismaClientSingleton | undefined;
};

export const sdrPrisma = globalForSdrPrisma.sdrPrisma ?? prismaClientSingleton();
export const prisma = sdrPrisma;

if (process.env.NODE_ENV !== 'production') globalForSdrPrisma.sdrPrisma = sdrPrisma;

export * from '@prisma/client-sdr';

export const RIV_CLUSTERS = new Set([
  'Ferramenta',
  'Rivendita_Edile',
  'Illuminazione',
]);

export function resolveCommercialCategoryFromCluster(cluster?: string | null): {
  commercialCategory: 'IST' | 'RIV';
  baseDiscount: number;
  categoryLabel: string;
} {
  const c = (cluster || '').trim();
  if (RIV_CLUSTERS.has(c) || c.toLowerCase().includes('ferramenta') || c.toLowerCase().includes('rivendit') || c.toLowerCase().includes('illuminazione')) {
    return {
      commercialCategory: 'RIV',
      baseDiscount: 50,
      categoryLabel: 'RIV - Rivenditore / Ferramenta (Sconto base 50%)',
    };
  }
  return {
    commercialCategory: 'IST',
    baseDiscount: 40,
    categoryLabel: 'IST - Installatore / Professionista (Sconto base 40%)',
  };
}
