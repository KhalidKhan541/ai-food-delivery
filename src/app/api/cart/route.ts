import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;

    const customer = await prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer profile not found" },
        { status: 404 }
      );
    }

    const cart = await prisma.cart.findFirst({
      where: { customerId: customer.id },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                discountedPrice: true,
                image: true,
                isAvailable: true,
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    deliveryFee: true,
                    freeDeliveryThreshold: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({
        data: null,
        itemCount: 0,
        subtotal: 0,
        deliveryFee: 0,
        tax: 0,
        total: 0,
      });
    }

    const restaurant = cart.items[0]?.menuItem.restaurant;
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.menuItem.discountedPrice ?? item.menuItem.price;
      return sum + price * item.quantity;
    }, 0);

    let deliveryFee = config.delivery.deliveryFee;
    if (subtotal >= (config.delivery.freeDeliveryThreshold ?? 25)) {
      deliveryFee = 0;
    }
    if (restaurant?.freeDeliveryThreshold && subtotal >= restaurant.freeDeliveryThreshold) {
      deliveryFee = 0;
    }

    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const total = parseFloat((subtotal + deliveryFee + tax).toFixed(2));

    await prisma.cart.update({
      where: { id: cart.id },
      data: { subtotal, deliveryFee, tax, total },
    });

    return NextResponse.json({
      data: cart,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      deliveryFee,
      tax,
      total,
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;

    const customer = await prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer profile not found" },
        { status: 404 }
      );
    }

    const cart = await prisma.cart.findFirst({
      where: { customerId: customer.id },
    });

    if (!cart) {
      return NextResponse.json({ message: "Cart is already empty" });
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await prisma.cart.delete({
      where: { id: cart.id },
    });

    return NextResponse.json({ message: "Cart cleared" });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
