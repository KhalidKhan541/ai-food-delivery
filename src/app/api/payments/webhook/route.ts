import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { config } from "@/lib/config";
import Stripe from "stripe";

const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, { apiVersion: "2024-12-18.acacia" as any })
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!stripe || !config.stripe.webhookSecret) {
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        config.stripe.webhookSecret
      );
    } catch (err) {
      logger.error("Webhook signature verification failed", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        if (orderId) {
          await prisma.payment.updateMany({
            where: { stripePaymentId: paymentIntent.id },
            data: { status: "COMPLETED" },
          });

          await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: "COMPLETED" },
          });

          logger.info("Payment succeeded", {
            orderId,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        if (orderId) {
          await prisma.payment.updateMany({
            where: { stripePaymentId: paymentIntent.id },
            data: { status: "FAILED" },
          });

          await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: "FAILED" },
          });

          logger.warn("Payment failed", {
            orderId,
            paymentIntentId: paymentIntent.id,
            error: paymentIntent.last_payment_error?.message,
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          const payment = await prisma.payment.findFirst({
            where: { stripePaymentId: paymentIntentId },
          });

          if (payment) {
            const refundAmount = (charge.amount_refunded / 100);

            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: "REFUNDED",
                refundAmount,
                refundReason: "Refunded via Stripe",
              },
            });

            await prisma.order.update({
              where: { id: payment.orderId },
              data: { paymentStatus: "REFUNDED" },
            });

            logger.info("Payment refunded", {
              orderId: payment.orderId,
              refundAmount,
            });
          }
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        logger.warn("Dispute created", {
          chargeId: dispute.charge,
          amount: dispute.amount,
          reason: dispute.reason,
        });
        break;
      }

      default:
        logger.debug("Unhandled webhook event", { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Webhook handler error", error);
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
