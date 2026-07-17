import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Create Permissions
  const permissionsData = [
    { name: "booth:read", description: "View booths" },
    { name: "booth:write", description: "Create/edit booths" },
    { name: "booth:delete", description: "Delete booths" },
    { name: "customer:read", description: "View customers" },
    { name: "customer:write", description: "Create/edit customers" },
    { name: "customer:delete", description: "Delete customers" },
    { name: "contract:read", description: "View contracts" },
    { name: "contract:write", description: "Create/edit contracts" },
    { name: "contract:delete", description: "Delete contracts" },
    { name: "contract:terminate", description: "Terminate contracts" },
    { name: "payment:read", description: "View payments" },
    { name: "payment:write", description: "Record/edit payments" },
    { name: "invoice:read", description: "View invoices" },
    { name: "invoice:write", description: "Create/edit invoices" },
    { name: "report:read", description: "View financial reports" },
    { name: "account:read", description: "View user accounts" },
    { name: "account:write", description: "Manage roles and accounts" }
  ];

  const permissions: { [key: string]: any } = {};
  for (const perm of permissionsData) {
    permissions[perm.name] = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm
    });
  }
  console.log("Permissions seeded.");

  // 2. Create Roles
  const roles = {
    admin: await prisma.role.upsert({
      where: { name: "admin" },
      update: {},
      create: { name: "admin", description: "Administrator with full system access" }
    }),
    manager: await prisma.role.upsert({
      where: { name: "manager" },
      update: {},
      create: { name: "manager", description: "Manager with operations access" }
    }),
    staff: await prisma.role.upsert({
      where: { name: "staff" },
      update: {},
      create: { name: "staff", description: "Staff handling daily rental operations" }
    }),
    customer: await prisma.role.upsert({
      where: { name: "customer" },
      update: {},
      create: { name: "customer", description: "Renter/Customer access to self contracts and payments" }
    })
  };
  console.log("Roles seeded.");

  // 3. Link Roles & Permissions
  const rolePermissionsMap = {
    admin: Object.keys(permissions),
    manager: [
      "booth:read", "booth:write",
      "customer:read", "customer:write",
      "contract:read", "contract:write", "contract:terminate",
      "payment:read", "payment:write",
      "invoice:read", "invoice:write",
      "report:read",
      "account:read"
    ],
    staff: [
      "booth:read",
      "customer:read", "customer:write",
      "contract:read", "contract:write",
      "payment:read", "payment:write",
      "invoice:read"
    ],
    customer: [
      "booth:read",
      "contract:read",
      "payment:read",
      "invoice:read"
    ]
  };

  // Clear existing role permissions mapping to prevent duplicates during multiple seeds
  await prisma.rolePermission.deleteMany({});

  for (const [roleName, permNames] of Object.entries(rolePermissionsMap)) {
    const roleId = roles[roleName as keyof typeof roles].id;
    for (const name of permNames) {
      const permissionId = permissions[name].id;
      await prisma.rolePermission.create({
        data: {
          roleId,
          permissionId
        }
      });
    }
  }
  console.log("Role Permissions seeded.");

  // 4. Create Users
  const saltRounds = 10;

  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@boothrental.com",
      password: await bcrypt.hash("Admin@2026", saltRounds),
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=admin",
      status: "active"
    }
  });

  const managerUser = await prisma.user.upsert({
    where: { username: "manager" },
    update: {},
    create: {
      username: "manager",
      email: "manager@boothrental.com",
      password: await bcrypt.hash("Manager@2026", saltRounds),
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=manager",
      status: "active"
    }
  });

  const staffUser = await prisma.user.upsert({
    where: { username: "staff" },
    update: {},
    create: {
      username: "staff",
      email: "staff@boothrental.com",
      password: await bcrypt.hash("Staff@2026", saltRounds),
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=staff",
      status: "active"
    }
  });

  const customerUser = await prisma.user.upsert({
    where: { username: "customer" },
    update: {},
    create: {
      username: "customer",
      email: "customer@boothrental.com",
      password: await bcrypt.hash("Customer@2026", saltRounds),
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=customer",
      status: "active"
    }
  });

  // Link users to roles
  await prisma.userRole.deleteMany({});
  
  await prisma.userRole.createMany({
    data: [
      { userId: adminUser.id, roleId: roles.admin.id },
      { userId: managerUser.id, roleId: roles.manager.id },
      { userId: staffUser.id, roleId: roles.staff.id },
      { userId: customerUser.id, roleId: roles.customer.id }
    ]
  });
  console.log("Users and User Roles seeded.");

  // 5. Create Booths
  const BOOTH_IMAGES: Record<string, string> = {
    "Gian hàng A101": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop",
    "Gian hàng A102": "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&auto=format&fit=crop",
    "Gian hàng B201": "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&auto=format&fit=crop",
    "Gian hàng B202": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop",
    "Gian hàng C301": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop",
    "Gian hàng C302": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop",
  };

  const boothsData = [
    { name: "Gian hàng A101", floor: 1, zone: "A", area: 45.5, price: 15000000, status: "rented", description: "Gian hàng vị trí trung tâm sảnh A tầng 1" },
    { name: "Gian hàng A102", floor: 1, zone: "A", area: 30.0, price: 10000000, status: "available", description: "Cạnh thang máy sảnh A" },
    { name: "Gian hàng B201", floor: 2, zone: "B", area: 55.0, price: 18000000, status: "rented", description: "Gian hàng thời trang tầng 2 khu B" },
    { name: "Gian hàng B202", floor: 2, zone: "B", area: 40.0, price: 13000000, status: "maintenance", description: "Đang sửa chữa điện nước tầng 2 khu B" },
    { name: "Gian hàng C301", floor: 3, zone: "C", area: 120.0, price: 35000000, status: "available", description: "Khu vực ẩm thực tầng 3 rộng rãi" },
    { name: "Gian hàng C302", floor: 3, zone: "C", area: 75.0, price: 22000000, status: "available", description: "Gian hàng tiện ích sảnh ẩm thực tầng 3" }
  ];

  for (const booth of boothsData) {
    await prisma.booth.upsert({
      where: { name: booth.name },
      update: {},
      create: {
        ...booth,
        images: BOOTH_IMAGES[booth.name] || ""
      }
    });
  }
  const booths = await prisma.booth.findMany();
  console.log("Booths seeded.");

  // 6. Create Customers
  const customer1 = await prisma.customer.upsert({
    where: { email: "nva@company.com" },
    update: {},
    create: {
      name: "Nguyễn Văn A",
      email: "nva@company.com",
      phone: "0912345678",
      idCard: "012345678901",
      company: "Công ty TNHH Thương mại A",
      address: "123 Đường Lê Lợi, Quận 1, TP. HCM",
      avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=nva",
      status: "active",
      userId: customerUser.id // Link to user account
    }
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: "ttb@fashion.com" },
    update: {},
    create: {
      name: "Trần Thị B",
      email: "ttb@fashion.com",
      phone: "0987654321",
      idCard: "098765432109",
      company: "Hộ kinh doanh Thời trang B",
      address: "456 Đường Nguyễn Huệ, Quận 1, TP. HCM",
      avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=ttb",
      status: "active"
    }
  });
  console.log("Customers seeded.");

  // 7. Create Contracts
  const dateNow = new Date();
  const start1 = new Date(dateNow.getFullYear(), dateNow.getMonth() - 2, 1);
  const end1 = new Date(dateNow.getFullYear() + 1, dateNow.getMonth() - 2, 1);
  const start2 = new Date(dateNow.getFullYear(), dateNow.getMonth() - 1, 15);
  const end2 = new Date(dateNow.getFullYear() + 1, dateNow.getMonth() - 1, 15);

  const boothA101 = booths.find(b => b.name === "Gian hàng A101")!;
  const boothB201 = booths.find(b => b.name === "Gian hàng B201")!;

  const contract1 = await prisma.contract.upsert({
    where: { contractCode: "HD-2026-A101" },
    update: {},
    create: {
      contractCode: "HD-2026-A101",
      boothId: boothA101.id,
      customerId: customer1.id,
      deposit: boothA101.price * 2, // 2-month deposit
      startDate: start1,
      endDate: end1,
      status: "active",
      pdfUrl: null
    }
  });

  const contract2 = await prisma.contract.upsert({
    where: { contractCode: "HD-2026-B201" },
    update: {},
    create: {
      contractCode: "HD-2026-B201",
      boothId: boothB201.id,
      customerId: customer2.id,
      deposit: boothB201.price * 2,
      startDate: start2,
      endDate: end2,
      status: "active",
      pdfUrl: null
    }
  });
  console.log("Contracts seeded.");

  // 8. Create Invoices
  const invoice1 = await prisma.invoice.upsert({
    where: { invoiceCode: "INV-2026-05-A101" },
    update: {},
    create: {
      invoiceCode: "INV-2026-05-A101",
      contractId: contract1.id,
      title: "Hóa đơn tiền thuê gian hàng A101 - Tháng 5",
      description: "Tiền thuê tháng 5/2026 gian hàng A101",
      amount: boothA101.price,
      dueDate: new Date(dateNow.getFullYear(), dateNow.getMonth() - 1, 10),
      status: "paid"
    }
  });

  const invoice2 = await prisma.invoice.upsert({
    where: { invoiceCode: "INV-2026-06-A101" },
    update: {},
    create: {
      invoiceCode: "INV-2026-06-A101",
      contractId: contract1.id,
      title: "Hóa đơn tiền thuê gian hàng A101 - Tháng 6",
      description: "Tiền thuê tháng 6/2026 gian hàng A101",
      amount: boothA101.price,
      dueDate: new Date(dateNow.getFullYear(), dateNow.getMonth(), 10),
      status: "unpaid"
    }
  });

  const invoice3 = await prisma.invoice.upsert({
    where: { invoiceCode: "INV-2026-06-B201" },
    update: {},
    create: {
      invoiceCode: "INV-2026-06-B201",
      contractId: contract2.id,
      title: "Hóa đơn tiền thuê gian hàng B201 - Tháng 6",
      description: "Tiền thuê tháng 6/2026 gian hàng B201",
      amount: boothB201.price,
      dueDate: new Date(dateNow.getFullYear(), dateNow.getMonth(), 20),
      status: "paid"
    }
  });
  console.log("Invoices seeded.");

  // 9. Create Payments
  await prisma.payment.upsert({
    where: { paymentCode: "PAY-INV-2026-05-A101" },
    update: {},
    create: {
      paymentCode: "PAY-INV-2026-05-A101",
      contractId: contract1.id,
      invoiceId: invoice1.id,
      amount: boothA101.price,
      paymentMethod: "bank_transfer",
      paymentDate: new Date(dateNow.getFullYear(), dateNow.getMonth() - 1, 5),
      status: "completed"
    }
  });

  await prisma.payment.upsert({
    where: { paymentCode: "PAY-INV-2026-06-B201" },
    update: {},
    create: {
      paymentCode: "PAY-INV-2026-06-B201",
      contractId: contract2.id,
      invoiceId: invoice3.id,
      amount: boothB201.price,
      paymentMethod: "vnpay",
      paymentDate: new Date(dateNow.getFullYear(), dateNow.getMonth(), 18),
      status: "completed"
    }
  });
  console.log("Payments seeded.");

  // 10. Notifications
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      title: "Hợp đồng mới được tạo",
      content: `Hợp đồng HD-2026-B201 cho khách hàng Trần Thị B đã được tạo thành công.`,
      type: "success"
    }
  });

  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      title: "Hóa đơn chờ thanh toán",
      content: `Hóa đơn INV-2026-06-A101 của Nguyễn Văn A đã quá thời hạn thanh toán.`,
      type: "warning"
    }
  });

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
