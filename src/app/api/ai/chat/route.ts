import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { getAIProvider } from "@/lib/ai/provider";

export async function POST(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;

    const body = await request.json();
    const { message, conversationHistory, orderId, context } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { userId },
    });

    let orderContext = "";
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          restaurant: { select: { name: true } },
          items: {
            include: {
              menuItem: { select: { name: true } },
            },
          },
          delivery: {
            include: {
              driver: {
                select: {
                  user: { select: { name: true } },
                  currentLat: true,
                  currentLng: true,
                },
              },
            },
          },
        },
      });

      if (order) {
        orderContext = `
Current order context:
- Order #${order.orderNumber}
- Status: ${order.status}
- Restaurant: ${order.restaurant.name}
- Items: ${order.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(", ")}
- Total: $${order.total.toFixed(2)}
- Delivery address: ${JSON.stringify(order.deliveryAddress)}
${order.delivery?.driver ? `- Driver: ${order.delivery.driver.user.name}` : ""}
${order.estimatedDelivery ? `- Estimated delivery: ${new Date(order.estimatedDelivery).toLocaleTimeString()}` : ""}
`;
      }
    }

    let orderHistoryContext = "";
    if (customer) {
      const recentOrders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          restaurant: { select: { name: true } },
          items: {
            include: {
              menuItem: { select: { name: true } },
            },
          },
        },
      });

      if (recentOrders.length > 0) {
        orderHistoryContext = `
Recent order history:
${recentOrders
  .map(
    (o) =>
      `- ${o.restaurant.name}: ${o.items.map((i) => i.menuItem.name).join(", ")} ($${o.total.toFixed(2)})`
  )
  .join("\n")}
`;
      }
    }

    const systemPrompt = `You are a helpful AI assistant for a food delivery platform called "AI Food Delivery". 
You help customers with:
- Finding restaurants and menu items
- Tracking orders
- Answering questions about food, delivery, and the platform
- Providing recommendations based on preferences
- Resolving issues with orders

Be friendly, concise, and helpful. Use a warm, professional tone.
If you don't know something specific, be honest and suggest contacting support.
Never make up information about orders, prices, or delivery times.

${orderContext}
${orderHistoryContext}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(conversationHistory ?? []).slice(-10).map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    const provider = getAIProvider();

    try {
      const response = await provider.complete({
        messages,
        temperature: 0.7,
        maxTokens: 1000,
      });

      return NextResponse.json({
        response: response.content,
        metadata: {
          provider: response.provider,
          model: response.model,
          latencyMs: response.latencyMs,
          tokensUsed: response.usage.totalTokens,
        },
      });
    } catch (aiError) {
      const fallbackResponses: Record<string, string> = {
        track: "I'd be happy to help you track your order! Could you please provide your order number? You can find it in your order confirmation email or in the Orders section of the app.",
        cancel: "To cancel an order, please go to Orders > select the order > Cancel. Note that orders can only be cancelled if they haven't been confirmed by the restaurant yet.",
        refund: "For refund requests, please contact our support team at support@aifooddelivery.com with your order number. Refunds are typically processed within 3-5 business days.",
        default:
          "Thank you for reaching out! I'm here to help you with anything related to your food delivery experience. What can I assist you with today?",
      };

      const lowerMessage = message.toLowerCase();
      let fallbackResponse = fallbackResponses.default;

      if (lowerMessage.includes("track") || lowerMessage.includes("where")) {
        fallbackResponse = fallbackResponses.track;
      } else if (lowerMessage.includes("cancel")) {
        fallbackResponse = fallbackResponses.cancel;
      } else if (lowerMessage.includes("refund")) {
        fallbackResponse = fallbackResponses.refund;
      }

      return NextResponse.json({
        response: fallbackResponse,
        metadata: {
          provider: "fallback",
          model: "template",
          latencyMs: 0,
          tokensUsed: 0,
        },
      });
    }
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
