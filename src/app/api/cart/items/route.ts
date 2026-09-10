import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { z } from "zod";

const addItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(50).default(1),
  options: z.any().optional(),
  notes: z.string().max(200).optional(),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(1).max(50),
  options: z.any().optional(),
  notes: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const data = addItemSchema.parse(body);

    const menuItem = await prisma.menuItem.findUnique({
      where: { id: data.menuItemId },
      include: { restaurant: true },
    });

    if (!menuItem) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    if (!menuItem.isAvailable) {
      return NextResponse.json(
        { error: "Menu item is currently unavailable" },
        { status: 400 }
      );
    }

    let cart = await prisma.cart.findFirst({
      where: { customerId: customer.id },
    });

    if (cart && cart.restaurantId !== menuItem.restaurantId) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
      await prisma.cart.update({
        where: { id: cart.id },
        data: { restaurantId: menuItem.restaurantId },
      });
    }

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
          customerId: customer.id,
          restaurantId: menuItem.restaurantId,
        },
      });
    }

    const existingCartItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        menuItemId: data.menuItemId,
      },
    });

    if (existingCartItem) {
      await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: existingCartItem.quantity + data.quantity,
          options: data.options ?? existingCartItem.options,
          notes: data.notes ?? existingCartItem.notes,
        },
      });
    } else {
      const price = menuItem.discountedPrice ?? menuItem.price;
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          menuItemId: data.menuItemId,
          quantity: data.quantity,
          price,
          options: data.options,
          notes: data.notes,
        },
      });
    }

    const updatedCart = await prisma.cart.findFirst({
      where: { id: cart.id },
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
              },
            },
          },
        },
      },
    });

    const itemCount = updatedCart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

    return NextResponse.json({
      message: "Item added to cart",
      data: updatedCart,
      itemCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { cartItemId, ...data } = body;
    const validated = updateItemSchema.parse(data);

    const cart = await prisma.cart.findFirst({
      where: { customerId: customer.id },
    });

    if (!cart) {
      return NextResponse.json(
        { error: "Cart not found" },
        { status: 404 }
      );
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: {
        quantity: validated.quantity,
        options: validated.options ?? cartItem.options,
        notes: validated.notes ?? cartItem.notes,
      },
    });

    return NextResponse.json({ message: "Cart item updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
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

    const { searchParams } = new URL(request.url);
    const cartItemId = searchParams.get("cartItemId");

    if (!cartItemId) {
      return NextResponse.json(
        { error: "cartItemId is required" },
        { status: 400 }
      );
    }

    const cart = await prisma.cart.findFirst({
      where: { customerId: customer.id },
    });

    if (!cart) {
      return NextResponse.json(
        { error: "Cart not found" },
        { status: 404 }
      );
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    await prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    const remainingItems = await prisma.cartItem.count({
      where: { cartId: cart.id },
    });

    if (remainingItems === 0) {
      await prisma.cart.delete({
        where: { id: cart.id },
      });
    }

    return NextResponse.json({
      message: "Item removed from cart",
      remainingItems,
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
