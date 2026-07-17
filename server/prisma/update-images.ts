import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const imageMap: Record<string, string> = {
    "Gian hàng A101": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop",
    "Gian hàng A102": "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&auto=format&fit=crop",
    "Gian hàng B201": "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&auto=format&fit=crop",
    "Gian hàng B202": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop",
    "Gian hàng C301": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop",
    "Gian hàng C302": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop",
  };

  for (const [name, url] of Object.entries(imageMap)) {
    await prisma.booth.updateMany({
      where: { name },
      data: { images: url },
    });
    console.log(`Updated: ${name}`);
  }

  console.log("Done! All booth images updated.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
