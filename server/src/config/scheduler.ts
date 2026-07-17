import cron from "node-cron";
import prisma from "./db";
import { getIO } from "./socket";

export function initScheduler() {
  // Run every hour
  cron.schedule("0 * * * *", async () => {
    console.log("[Scheduler] Running scheduled tasks...");
    await checkOverdueInvoices();
    await checkExpiringContracts();
  });

  console.log("[Scheduler] Cron jobs initialized");
}

async function checkOverdueInvoices() {
  try {
    const now = new Date();
    const overdueInvoices = await prisma.invoice.updateMany({
      where: {
        status: "unpaid",
        dueDate: { lt: now }
      },
      data: { status: "overdue" }
    });

    if (overdueInvoices.count > 0) {
      console.log(`[Scheduler] Marked ${overdueInvoices.count} invoices as overdue`);

      const invoices = await prisma.invoice.findMany({
        where: {
          status: "overdue",
          dueDate: { lt: now }
        },
        include: {
          contract: {
            include: { customer: true, booth: true }
          }
        },
        take: 10
      });

      for (const inv of invoices) {
        const notifTitle = `Hóa đơn quá hạn: ${inv.invoiceCode}`;
        const notifContent = `Hóa đơn ${inv.invoiceCode} - ${inv.amount.toLocaleString("vi-VN")} đ của ${inv.contract.customer.name} (${inv.contract.booth.name}) đã quá hạn thanh toán.`;

        await prisma.notification.create({
          data: {
            title: notifTitle,
            content: notifContent,
            type: "warning"
          }
        });

        getIO().emit("notification", {
          title: notifTitle,
          content: notifContent,
          type: "warning"
        });
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error checking overdue invoices:", error);
  }
}

async function checkExpiringContracts() {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringContracts = await prisma.contract.findMany({
      where: {
        status: "active",
        endDate: {
          gte: now,
          lte: thirtyDaysLater
        }
      },
      include: {
        customer: true,
        booth: true
      }
    });

    for (const contract of expiringContracts) {
      const daysLeft = Math.ceil((contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const notifTitle = `Hợp đồng sắp hết hạn: ${contract.contractCode}`;
      const notifContent = `Hợp đồng ${contract.contractCode} của ${contract.customer.name} (${contract.booth.name}) sẽ hết hạn sau ${daysLeft} ngày.`;

      await prisma.notification.create({
        data: {
          title: notifTitle,
          content: notifContent,
          type: "warning",
          userId: contract.customer.userId || null
        }
      });

      getIO().emit("notification", {
        title: notifTitle,
        content: notifContent,
        type: "warning"
      });
    }

    if (expiringContracts.length > 0) {
      console.log(`[Scheduler] Found ${expiringContracts.length} expiring contracts`);
    }
  } catch (error) {
    console.error("[Scheduler] Error checking expiring contracts:", error);
  }
}

export async function triggerBoothUpdate(boothId: number, status: string) {
  getIO().emit("booth-updated", { boothId, status });
}

export async function triggerPaymentNotification(title: string, content: string, type: string = "success") {
  await prisma.notification.create({
    data: { title, content, type }
  });
  getIO().emit("notification", { title, content, type });
}
